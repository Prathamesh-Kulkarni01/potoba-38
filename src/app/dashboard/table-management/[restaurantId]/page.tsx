// src/app/dashboard/table-management/[restaurantId]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth/context';
import { getRestaurant } from '@/lib/firebase/firestore';
import { addTable, getTables, updateTable, deleteTable } from '@/lib/firebase/tables';
import { getOrdersByTable, updateOrder, createOrder } from '@/lib/firebase/orders';
import { getMenuItems as fetchMenuItemsFirebase, getMenuCategories, getMenuSubcategories } from '@/lib/firebase/menu';
import type { RestaurantProfile, Table as FirebaseTableType, TableStatus, Order, OrderItem, MenuItem as MenuItemType, MenuCategory, MenuSubcategory } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Edit3, Trash2, QrCode, Users, Circle, X, MinusCircle, Utensils } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import ConfirmationDialog from '@/components/shared/confirmation-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import MenuSelectionForBill from '@/components/table-management/menu-selection-for-bill';
import { cn } from '@/lib/utils';

const tableFormSchema = z.object({
  tableNumber: z.string().min(1, "Table number is required."),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1."),
});
type TableFormValues = z.infer<typeof tableFormSchema>;

const statusColors: Record<TableStatus, string> = {
  available: 'bg-green-500',
  occupied: 'bg-red-500',
  reserved: 'bg-yellow-500',
  needs_cleaning: 'bg-blue-500',
};

export default function TableManagementPage() {
  const params = useParams();
  const restaurantId = params.restaurantId as string;
  const { user, role, initialLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [tables, setTables] = useState<FirebaseTableType[]>([]); 
  const [pageLoading, setPageLoading] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<FirebaseTableType | null>(null); 
  
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; data: FirebaseTableType; } | null>(null);
  const [qrModalTable, setQrModalTable] = useState<FirebaseTableType | null>(null);

  // POS State
  const [selectedTable, setSelectedTable] = useState<FirebaseTableType | null>(null);
  const [selectedTableOrders, setSelectedTableOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItemsState] = useState<MenuItemType[]>([]);
  const [categories, setCategoriesState] = useState<MenuCategory[]>([]);
  const [subcategories, setSubcategoriesState] = useState<MenuSubcategory[]>([]);
  const [currentBillItems, setCurrentBillItems] = useState<OrderItem[]>([]);
  const [isBillPanelVisible, setIsBillPanelVisible] = useState(false);
  const [isMenuSelectionPanelOpen, setIsMenuSelectionPanelOpen] = useState(false);

  const form = useForm<TableFormValues>({
    resolver: zodResolver(tableFormSchema),
    defaultValues: { tableNumber: '', capacity: 1 },
  });

  const fetchRestaurantAndTableData = useCallback(async () => {
    if (!restaurantId || !user) return;
    setPageLoading(true);
    try {
      const restaurantData = await getRestaurant(restaurantId);
      if (restaurantData && restaurantData.ownerId === user.uid) {
        setRestaurant(restaurantData);
        const [fetchedTables, fetchedMenuItems, fetchedCategories, fetchedSubcategories] = await Promise.all([
          getTables(restaurantId),
          fetchMenuItemsFirebase(restaurantId),
          getMenuCategories(restaurantId),
          getMenuSubcategories(restaurantId) 
        ]);
        setTables(fetchedTables.sort((a, b) => a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true })));
        setMenuItemsState(fetchedMenuItems);
        setCategoriesState(fetchedCategories.sort((a,b) => a.order - b.order));
        setSubcategoriesState(fetchedSubcategories.sort((a,b) => a.order - b.order));

      } else {
        toast({ variant: "destructive", title: "Access Denied", description: "Restaurant not found or you don't have permission." });
        router.replace('/dashboard');
      }
    } catch (error) {
      console.error("Error fetching restaurant data:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load restaurant data." });
    } finally {
      setPageLoading(false);
    }
  }, [restaurantId, user, router, toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || role !== 'owner') {
      router.replace('/dashboard');
      return;
    }
    if (restaurantId) {
      fetchRestaurantAndTableData();
    } else {
      router.replace('/dashboard');
    }
  }, [restaurantId, user, role, authLoading, router, fetchRestaurantAndTableData]);

  const handleSelectTable = async (table: FirebaseTableType) => {
    setSelectedTable(table);
    setIsBillPanelVisible(true);
    setIsMenuSelectionPanelOpen(false); 
    setFormSubmitting(true); 
    try {
      const orders = await getOrdersByTable(restaurantId, table.id, ['pending_kitchen', 'confirmed_by_kitchen', 'preparing', 'ready_for_pickup', 'served', 'payment_pending']);
      setSelectedTableOrders(orders);
      const aggregatedBillItems: OrderItem[] = orders.reduce((acc, order) => {
        order.items.forEach(item => {
          const existingItem = acc.find(bi => bi.menuItemId === item.menuItemId);
          if (existingItem) {
            existingItem.quantity += item.quantity;
            existingItem.totalPrice += item.totalPrice;
          } else {
            acc.push({ ...item });
          }
        });
        return acc;
      }, [] as OrderItem[]);
      setCurrentBillItems(aggregatedBillItems);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error Loading Orders", description: error.message || "Could not load orders for this table." });
      setCurrentBillItems([]);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleAddItemToBill = (menuItem: MenuItemType, quantity: number = 1) => {
    setCurrentBillItems(prevBillItems => {
        const existingItem = prevBillItems.find(bi => bi.menuItemId === menuItem.id);
        if (existingItem) {
        return prevBillItems.map(bi => 
            bi.menuItemId === menuItem.id 
            ? { ...bi, quantity: bi.quantity + quantity, totalPrice: (bi.quantity + quantity) * bi.unitPrice } 
            : bi
        );
        } else {
        return [...prevBillItems, {
            menuItemId: menuItem.id,
            menuItemName: menuItem.name,
            quantity,
            unitPrice: menuItem.price,
            totalPrice: quantity * menuItem.price,
        }];
        }
    });
    toast({ title: "Item Added", description: `${menuItem.name} added to bill.`});
  };

  const handleUpdateItemQuantityInBill = (menuItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCurrentBillItems(currentBillItems.filter(bi => bi.menuItemId !== menuItemId));
    } else {
      setCurrentBillItems(currentBillItems.map(bi => 
        bi.menuItemId === menuItemId 
          ? { ...bi, quantity: newQuantity, totalPrice: newQuantity * bi.unitPrice } 
          : bi
      ));
    }
  };

  const handleRemoveItemFromBill = (menuItemId: string) => {
    setCurrentBillItems(currentBillItems.filter(bi => bi.menuItemId !== menuItemId));
  };

  const handleFinalizeBill = async () => {
    if (!selectedTable || currentBillItems.length === 0) {
      toast({variant: "destructive", title: "Error", description: "No table selected or bill is empty."});
      return;
    }
    setFormSubmitting(true);
    try {
      const activeOrder = selectedTableOrders.find(o => o.status === 'served' || o.status === 'payment_pending');
      const subtotal = currentBillItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const taxRate = restaurant?.taxRate ?? 0.10; 
      const taxAmount = subtotal * taxRate;
      const totalAmount = subtotal + taxAmount;

      if (activeOrder) {
        await updateOrder(restaurantId, activeOrder.id, { items: currentBillItems, subtotal, taxAmount, totalAmount, status: 'payment_pending' });
        toast({ title: "Bill Updated", description: `Bill for table ${selectedTable.tableNumber} is pending payment.` });
      } else {
        const newOrderData = {
          tableId: selectedTable.id,
          tableNumber: selectedTable.tableNumber,
          items: currentBillItems,
          subtotal,
          taxAmount,
          totalAmount,
          status: 'payment_pending' as OrderStatus, 
        };
        await createOrder(restaurantId, newOrderData);
        toast({ title: "Bill Finalized", description: `Bill for table ${selectedTable.tableNumber} created and pending payment.` });
      }
      if (selectedTable.status !== 'occupied' && selectedTable.status !== 'needs_cleaning') { 
         await updateTable(restaurantId, selectedTable.id, { status: 'occupied' }); 
      }
      
      handleSelectTable(selectedTable); 
    } catch (error: any) {
      toast({ variant: "destructive", title: "Finalization Failed", description: error.message || "Could not finalize bill." });
    } finally {
      setFormSubmitting(false);
    }
  };


  const handleTableSubmit = async (values: TableFormValues) => {
    setFormSubmitting(true);
    try {
      if (editingTable) {
        await updateTable(restaurantId, editingTable.id, { ...values, status: editingTable.status });
        toast({ title: "Table Updated", description: `Table ${values.tableNumber} has been updated.` });
      } else {
        await addTable(restaurantId, values);
        toast({ title: "Table Added", description: `Table ${values.tableNumber} has been added.` });
      }
      fetchRestaurantAndTableData(); 
      setIsTableModalOpen(false);
      setEditingTable(null);
      form.reset({ tableNumber: '', capacity: 1 });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to save table." });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleStatusChange = async (tableId: string, newStatus: TableStatus) => {
    try {
      const tableToUpdate = tables.find(t => t.id === tableId);
      if (!tableToUpdate) return;
      await updateTable(restaurantId, tableId, { status: newStatus, tableNumber: tableToUpdate.tableNumber, capacity: tableToUpdate.capacity });
      toast({ title: "Status Updated", description: `Table ${tableToUpdate.tableNumber} is now ${newStatus}.` });
      fetchRestaurantAndTableData(); 
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to update status." });
    } finally {
      setFormSubmitting(false);
    }
  };
  
  const openDeleteDialog = (table: FirebaseTableType) => {
    setDeleteConfirmation({ isOpen: true, data: table });
  };

  const confirmDeleteTable = async () => {
    if (!deleteConfirmation) return;
    setFormSubmitting(true);
    try {
      await deleteTable(restaurantId, deleteConfirmation.data.id);
      toast({ title: "Table Deleted", description: `Table ${deleteConfirmation.data.tableNumber} has been deleted.` });
      fetchRestaurantAndTableData(); 
      setDeleteConfirmation(null);
       if (selectedTable?.id === deleteConfirmation.data.id) {
        setSelectedTable(null);
        setIsBillPanelVisible(false);
        setIsMenuSelectionPanelOpen(false);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Deletion Failed", description: error.message || "Could not delete table." });
    } finally {
      setFormSubmitting(false);
    }
  };

  const openEditModal = (table: FirebaseTableType) => {
    setEditingTable(table);
    form.reset({ tableNumber: table.tableNumber, capacity: table.capacity });
    setIsTableModalOpen(true);
  };
  
  const openAddModal = () => {
    setEditingTable(null);
    form.reset({ tableNumber: '', capacity: 1 });
    setIsTableModalOpen(true);
  };

  if (authLoading || pageLoading) {
    return <div className="flex h-screen items-center justify-center"><LoadingSpinner className="h-10 w-10 text-primary" /></div>;
  }
  if (!restaurant) {
    return <div className="flex h-screen items-center justify-center"><Card><CardHeader><CardTitle>Error</CardTitle></CardHeader><CardContent><p>Restaurant not found or no permission.</p></CardContent></Card></div>;
  }
  
  const getDisplayTestLink = (storedQrValue: string) => {
    const configuredBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://6000-firebase-studio-1746809721561.cluster-ancjwrkgr5dvux4qug5rbzyc2y.cloudworkstations.dev';
    try {
      const storedUrlObject = new URL(storedQrValue);
      const pathAndQuery = storedUrlObject.pathname + storedUrlObject.search + storedUrlObject.hash;
      const displayUrl = (configuredBaseUrl.endsWith('/') ? configuredBaseUrl.slice(0, -1) : configuredBaseUrl) + 
                         (pathAndQuery.startsWith('/') ? pathAndQuery : '/' + pathAndQuery);
      return displayUrl;
    } catch (e) {
      if (storedQrValue.startsWith('/')) {
         const displayUrl = (configuredBaseUrl.endsWith('/') ? configuredBaseUrl.slice(0, -1) : configuredBaseUrl) + storedQrValue;
         return displayUrl;
      }
      console.warn("Could not reliably reconstruct test link from stored qrCodeValue:", storedQrValue);
      return storedQrValue;
    }
  };
  
  // Dynamic classes for panel widths
  const tableGridPanelClasses = cn(
    "p-4 overflow-y-auto transition-all duration-300 ease-in-out flex-grow",
    selectedTable && isBillPanelVisible ? "md:w-3/5" : "w-full"
  );

  const billPanelClasses = cn(
    "p-4 border-l bg-card text-card-foreground overflow-y-auto flex flex-col transition-all duration-300 ease-in-out",
    "w-full md:w-2/5"
  );

  const menuSelectionPanelClasses = cn(
    "absolute top-0 left-0 h-full bg-card shadow-xl z-20 transition-transform duration-300 ease-in-out overflow-y-auto border-r",
    "w-full md:w-[320px] lg:w-[380px]", // Adjusted width
    isMenuSelectionPanelOpen ? "transform translate-x-0" : "transform -translate-x-full"
  );

  return (
    <div className="flex h-[calc(100vh-theme(spacing.16)-1px)] overflow-hidden relative"> {/* Adjusted height for header */}
      {/* Table Grid Panel */}
      <div className={tableGridPanelClasses}>
        <Card className="shadow-xl h-full flex flex-col">
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div className="mb-4 md:mb-0">
                  <CardTitle className="text-2xl md:text-3xl flex items-center">
                      <Users className="mr-3 h-7 w-7 text-primary" /> Table Management
                  </CardTitle>
                  <CardDescription>Oversee tables for {restaurant.name}.</CardDescription>
              </div>
              <Button onClick={openAddModal} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Table
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-grow">
            {tables.length > 0 ? (
               <div className={`grid grid-cols-1 ${
                  (selectedTable && isBillPanelVisible) 
                    ? 'sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2' // Fewer columns when bill panel is open
                    : 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4' // More columns when table grid is wider
                } gap-4`}>
                {tables.map(table => (
                  <Card 
                    key={table.id} 
                    className={`flex flex-col shadow-md hover:shadow-lg transition-all group cursor-pointer ${selectedTable?.id === table.id ? 'ring-2 ring-primary shadow-xl scale-105' : 'hover:scale-[1.02]'}`}
                    onClick={() => handleSelectTable(table)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">{Table} {table.tableNumber}</CardTitle>
                          <div className={`h-3 w-3 rounded-full ${statusColors[table.status]}`} title={table.status}></div>
                      </div>
                      <CardDescription>Capacity: {table.capacity} guests</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-2 text-xs">
                      <Select value={table.status} onValueChange={(newStatus) => handleStatusChange(table.id, newStatus as TableStatus)} onClick={(e) => e.stopPropagation()}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(statusColors) as TableStatus[]).map(s => <SelectItem key={s} value={s} className="capitalize text-xs">{s.replace('_', ' ')}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </CardContent>
                    <CardFooter className="flex justify-between items-center pt-2 mt-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => {e.stopPropagation(); setQrModalTable(table)}} title="Show QR Code"><QrCode className="h-4 w-4 text-muted-foreground hover:text-primary"/></Button>
                      <div className="space-x-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => {e.stopPropagation(); openEditModal(table)}} title="Edit Table"><Edit3 className="h-3.5 w-3.5 text-muted-foreground hover:text-accent"/></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => {e.stopPropagation(); openDeleteDialog(table)}} title="Delete Table"><Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive"/></Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 border-2 border-dashed rounded-lg bg-muted/30">
                <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Tables Yet</h3>
                <p className="text-muted-foreground mb-4">Add tables to start managing your restaurant floor.</p>
                <Button onClick={openAddModal} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add First Table
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Panel: Bill Management (POS-like) */}
      {selectedTable && isBillPanelVisible && (
        <div className={billPanelClasses}>
          <BillPanel
            selectedTable={selectedTable}
            billItems={currentBillItems}
            isLoading={formSubmitting}
            onUpdateItemQuantity={handleUpdateItemQuantityInBill}
            onRemoveItem={handleRemoveItemFromBill}
            onFinalizeBill={handleFinalizeBill}
            onClose={() => { setSelectedTable(null); setIsBillPanelVisible(false); setIsMenuSelectionPanelOpen(false); setCurrentBillItems([]); }}
            onToggleMenuSelection={() => setIsMenuSelectionPanelOpen(!isMenuSelectionPanelOpen)}
            isMenuSelectionOpen={isMenuSelectionPanelOpen}
          />
        </div>
      )}
      
      {/* Floating Menu Item Selection Panel */}
      {selectedTable && isBillPanelVisible && (
        <div className={menuSelectionPanelClasses}>
          {isMenuSelectionPanelOpen && ( 
            <MenuSelectionForBill
                menuItems={menuItems}
                categories={categories}
                subcategories={subcategories}
                onAddItemToBill={handleAddItemToBill}
                onClosePanel={() => setIsMenuSelectionPanelOpen(false)}
            />
          )}
        </div>
      )}


      <Dialog open={isTableModalOpen} onOpenChange={setIsTableModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTable ? 'Edit Table' : 'Add New Table'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleTableSubmit)} className="space-y-4 py-4">
              <FormField control={form.control} name="tableNumber" render={({ field }) => (<FormItem><FormLabel>Table Number/Name</FormLabel><FormControl><Input placeholder="e.g., T1, Patio 5, Bar Seat 2" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="capacity" render={({ field }) => (<FormItem><FormLabel>Capacity</FormLabel><FormControl><Input type="number" placeholder="e.g., 4" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline" onClick={() => setIsTableModalOpen(false)} disabled={formSubmitting}>Cancel</Button></DialogClose>
                <Button type="submit" disabled={formSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {formSubmitting ? <LoadingSpinner className="mr-2 h-4 w-4" /> : (editingTable ? 'Save Changes' : 'Add Table')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {deleteConfirmation?.isOpen && (
        <ConfirmationDialog
          isOpen={deleteConfirmation.isOpen}
          onClose={() => setDeleteConfirmation(null)}
          onConfirm={confirmDeleteTable}
          title={`Delete Table ${deleteConfirmation.data.tableNumber}?`}
          description="This action cannot be undone. Associated active orders might need manual resolution."
          isLoading={formSubmitting}
        />
      )}

      {qrModalTable && (
        <Dialog open={!!qrModalTable} onOpenChange={() => setQrModalTable(null)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>QR Code for Table {qrModalTable.tableNumber}</DialogTitle>
                    <CardDescription>Customers can scan this to view the menu and order.</CardDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-4 space-y-4">
                    <Image 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrModalTable.qrCodeValue)}`} 
                        alt={`QR Code for table ${qrModalTable.tableNumber}`} 
                        width={200} 
                        height={200}
                        className="border rounded-md"
                        data-ai-hint="qr code table"
                    />
                    <Input type="text" readOnly value={qrModalTable.qrCodeValue} className="text-center text-xs"/>
                    <p className="text-xs text-muted-foreground">
                        Test link: <a href={getDisplayTestLink(qrModalTable.qrCodeValue)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{getDisplayTestLink(qrModalTable.qrCodeValue)}</a>
                    </p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setQrModalTable(null)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}


interface BillPanelProps {
  selectedTable: FirebaseTableType;
  billItems: OrderItem[];
  isLoading: boolean;
  onUpdateItemQuantity: (menuItemId: string, newQuantity: number) => void;
  onRemoveItem: (menuItemId: string) => void;
  onFinalizeBill: () => void;
  onClose: () => void;
  onToggleMenuSelection: () => void;
  isMenuSelectionOpen: boolean;
}

const BillPanel = ({ selectedTable, billItems, isLoading, onUpdateItemQuantity, onRemoveItem, onFinalizeBill, onClose, onToggleMenuSelection, isMenuSelectionOpen }: BillPanelProps) => {
  const subtotal = billItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxRate = 0.10; 
  const taxAmount = subtotal * taxRate;
  const totalAmount = subtotal + taxAmount;

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 pb-2 border-b">
        <h2 className="text-xl font-semibold text-primary">Bill for Table {selectedTable.tableNumber}</h2>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onToggleMenuSelection} className="text-sm">
              {isMenuSelectionOpen ? <X className="h-4 w-4 mr-1" /> : <Utensils className="h-4 w-4 mr-1" />}
              {isMenuSelectionOpen ? 'Close Menu' : 'Add Items'}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden"> {/* Only show close on mobile if Bill Panel itself is primary view */}
                <X className="h-5 w-5" />
            </Button>
        </div>
      </div>

      <h3 className="text-lg font-medium mb-2 mt-2">Current Bill Items</h3>
      <ScrollArea className="flex-grow mb-4 border rounded-md p-1 bg-muted/20">
        {billItems.length > 0 ? billItems.map(item => (
          <Card key={item.menuItemId} className="mb-1 p-2 shadow-none border-b last:border-b-0 rounded-none bg-background">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-sm">{item.menuItemName}</p>
                <p className="text-xs text-muted-foreground">${item.unitPrice.toFixed(2)} each</p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUpdateItemQuantity(item.menuItemId, item.quantity - 1)} disabled={item.quantity <= 1 || isLoading}><MinusCircle className="h-4 w-4"/></Button>
                <span className="w-5 text-center text-sm">{item.quantity}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUpdateItemQuantity(item.menuItemId, item.quantity + 1)} disabled={isLoading}><PlusCircle className="h-4 w-4"/></Button>
                <p className="w-16 text-right font-medium text-sm">${item.totalPrice.toFixed(2)}</p>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onRemoveItem(item.menuItemId)} disabled={isLoading}><Trash2 className="h-4 w-4"/></Button>
              </div>
            </div>
          </Card>
        )) : <p className="text-sm text-muted-foreground text-center py-8">No items in the bill yet.</p>}
      </ScrollArea>

      <div className="mt-auto border-t pt-4 space-y-2">
        <div className="flex justify-between text-sm font-medium"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
        <div className="flex justify-between text-sm text-muted-foreground"><span>Tax ({ (taxRate * 100).toFixed(0) }%):</span><span>${taxAmount.toFixed(2)}</span></div>
        <div className="flex justify-between text-xl font-bold text-primary"><span>Total:</span><span>${totalAmount.toFixed(2)}</span></div>
        <Button className="w-full mt-3 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={onFinalizeBill} disabled={isLoading || billItems.length === 0}>
          {isLoading ? <LoadingSpinner className="mr-2 h-4 w-4"/> : 'Finalize Bill & Pay'}
        </Button>
      </div>
    </div>
  );
};
