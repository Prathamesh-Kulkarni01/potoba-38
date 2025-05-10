// src/app/dashboard/table-management/[restaurantId]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth/context';
import { getRestaurant } from '@/lib/firebase/firestore';
import { addTable, getTables, updateTable, deleteTable } from '@/lib/firebase/tables';
import { getOrdersByTable, updateOrderStatus, createOrder } from '@/lib/firebase/orders'; // Added createOrder
import { getMenuItems as fetchMenuItemsFirebase } from '@/lib/firebase/menu';
import type { RestaurantProfile, Table as FirebaseTableType, TableStatus, Order, OrderItem, MenuItem as MenuItemType } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Edit3, Trash2, QrCode, Users, Circle, X, MinusCircle } from 'lucide-react'; // Added X, MinusCircle
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import ConfirmationDialog from '@/components/shared/confirmation-dialog';
import { ScrollArea } from '@/components/ui/scroll-area'; // Added ScrollArea

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
  const [currentBillItems, setCurrentBillItems] = useState<OrderItem[]>([]);
  const [isBillPanelVisible, setIsBillPanelVisible] = useState(false);

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
        const [fetchedTables, fetchedMenuItems] = await Promise.all([
          getTables(restaurantId),
          fetchMenuItemsFirebase(restaurantId)
        ]);
        setTables(fetchedTables);
        setMenuItemsState(fetchedMenuItems);
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
    setFormSubmitting(true); // Use formSubmitting as a generic loading state for bill panel operations
    try {
      const orders = await getOrdersByTable(restaurantId, table.id, ['pending_kitchen', 'preparing', 'served', 'payment_pending']);
      setSelectedTableOrders(orders);
      const aggregatedBillItems: OrderItem[] = orders.reduce((acc, order) => {
        order.items.forEach(item => {
          const existingItem = acc.find(bi => bi.menuItemId === item.menuItemId /* && check variants */);
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
    const existingItem = currentBillItems.find(bi => bi.menuItemId === menuItem.id);
    if (existingItem) {
      setCurrentBillItems(currentBillItems.map(bi => 
        bi.menuItemId === menuItem.id 
          ? { ...bi, quantity: bi.quantity + quantity, totalPrice: (bi.quantity + quantity) * bi.unitPrice } 
          : bi
      ));
    } else {
      setCurrentBillItems([...currentBillItems, {
        menuItemId: menuItem.id,
        menuItemName: menuItem.name,
        quantity,
        unitPrice: menuItem.price,
        totalPrice: quantity * menuItem.price,
      }]);
    }
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
      // This is a simplified finalization. In a real POS, this would involve payment processing.
      // For now, we can assume this creates/updates an order to 'payment_pending' or 'completed'.
      // Let's simulate creating a new order with status 'payment_pending' if no active order or update one.
      
      const activeOrder = selectedTableOrders.find(o => o.status === 'served' || o.status === 'payment_pending');
      const subtotal = currentBillItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const taxRate = 0.10; // Example 10% tax
      const taxAmount = subtotal * taxRate;
      const totalAmount = subtotal + taxAmount;

      if (activeOrder) {
        // Update existing order (simplified: replace items, update totals and status)
        await updateTable(restaurantId, activeOrder.id, { items: currentBillItems, subtotal, taxAmount, totalAmount, status: 'payment_pending' } as any); // Cast to any for simplicity
        toast({ title: "Bill Updated", description: `Bill for table ${selectedTable.tableNumber} is pending payment.` });
      } else {
        // Create new order
        const newOrderData = {
          tableId: selectedTable.id,
          tableNumber: selectedTable.tableNumber,
          items: currentBillItems,
          subtotal,
          taxAmount,
          totalAmount,
          status: 'payment_pending' as TableStatus,
        };
        await createOrder(restaurantId, newOrderData as any); // Cast to any to match Omit<Order, ...>
        toast({ title: "Bill Finalized", description: `Bill for table ${selectedTable.tableNumber} created and pending payment.` });
      }
      // Optionally, update table status
      if (selectedTable.status !== 'occupied' && selectedTable.status !== 'payment_pending') {
         await updateTable(restaurantId, selectedTable.id, { status: 'occupied' });
      }
      
      // Refresh table orders and potentially table list
      handleSelectTable(selectedTable); // Re-fetch orders for the table
      // Or, if you want to clear the panel:
      // setSelectedTable(null);
      // setIsBillPanelVisible(false);
      // setCurrentBillItems([]);

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


  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))]"> {/* Adjust height based on your header */}
      {/* Left Panel: Table Grid */}
      <div className={`w-full md:w-3/5 lg:w-2/3 p-4 overflow-y-auto transition-all duration-300 ease-in-out ${selectedTable && isBillPanelVisible ? 'hidden md:block' : 'block'}`}>
        <Card className="shadow-xl h-full flex flex-col">
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div className="mb-4 md:mb-0">
                  <CardTitle className="text-2xl md:text-3xl flex items-center">
                      <Users className="mr-3 h-7 w-7 text-primary" /> Table Management for {restaurant.name}
                  </CardTitle>
                  <CardDescription>Oversee and manage your restaurant's tables and their status.</CardDescription>
              </div>
              <Button onClick={openAddModal} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Table
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-grow">
            {tables.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {tables.map(table => (
                  <Card 
                    key={table.id} 
                    className={`flex flex-col shadow-md hover:shadow-lg transition-all cursor-pointer ${selectedTable?.id === table.id ? 'ring-2 ring-primary shadow-xl scale-105' : 'hover:scale-[1.02]'}`}
                    onClick={() => handleSelectTable(table)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">Table {table.tableNumber}</CardTitle>
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
                    <CardFooter className="flex justify-between items-center pt-2 mt-auto">
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
        <div className="w-full md:w-2/5 lg:w-1/3 p-4 border-l bg-card text-card-foreground overflow-y-auto flex flex-col transition-all duration-300 ease-in-out">
          <BillPanel
            selectedTable={selectedTable}
            billItems={currentBillItems}
            isLoading={formSubmitting}
            menuItems={menuItems}
            onAddItem={handleAddItemToBill}
            onUpdateItemQuantity={handleUpdateItemQuantityInBill}
            onRemoveItem={handleRemoveItemFromBill}
            onFinalizeBill={handleFinalizeBill}
            onClose={() => { setSelectedTable(null); setIsBillPanelVisible(false); setCurrentBillItems([]); }}
          />
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
  menuItems: MenuItemType[];
  isLoading: boolean;
  onAddItem: (item: MenuItemType, quantity?: number) => void;
  onUpdateItemQuantity: (menuItemId: string, newQuantity: number) => void;
  onRemoveItem: (menuItemId: string) => void;
  onFinalizeBill: () => void;
  onClose: () => void;
}

const BillPanel = ({ selectedTable, billItems, menuItems, isLoading, onAddItem, onUpdateItemQuantity, onRemoveItem, onFinalizeBill, onClose }: BillPanelProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const subtotal = billItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxRate = 0.10; // Example 10% tax
  const taxAmount = subtotal * taxRate;
  const totalAmount = subtotal + taxAmount;

  const filteredMenuItems = menuItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) && item.availability
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 pb-2 border-b">
        <h2 className="text-xl font-semibold text-primary">Bill for Table {selectedTable.tableNumber}</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <Card className="mb-4 shadow-sm">
        <CardHeader className="p-3">
          <CardTitle className="text-base">Add Items to Bill</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <Input 
            placeholder="Search menu items..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-2 h-9"
          />
          <ScrollArea className="h-36 border rounded-md">
            {filteredMenuItems.length > 0 ? filteredMenuItems.map(item => (
              <div key={item.id} className="flex justify-between items-center p-2 hover:bg-muted text-sm">
                <div>
                  <span className="font-medium">{item.name}</span>
                  <span className="text-xs text-muted-foreground ml-1">(${item.price.toFixed(2)})</span>
                </div>
                <Button size="xs" variant="outline" onClick={() => onAddItem(item)} className="h-7 px-2 py-1 text-xs">
                  <PlusCircle className="h-3 w-3 mr-1"/>Add
                </Button>
              </div>
            )) : <p className="text-xs text-muted-foreground p-2 text-center">No items match your search or menu is empty.</p>}
          </ScrollArea>
        </CardContent>
      </Card>

      <h3 className="text-lg font-medium mb-2 mt-2">Current Bill Items</h3>
      <ScrollArea className="flex-grow mb-4 border rounded-md p-1">
        {billItems.length > 0 ? billItems.map(item => (
          <Card key={item.menuItemId} className="mb-1 p-2 shadow-none border-b last:border-b-0 rounded-none">
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
          {isLoading ? <LoadingSpinner className="mr-2 h-4 w-4"/> : 'Finalize Bill'}
        </Button>
      </div>
    </div>
  );
};

