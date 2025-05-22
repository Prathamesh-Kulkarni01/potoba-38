// src/app/dashboard/table-management/[restaurantId]/page.tsx
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth/context';
import { getRestaurant } from '@/lib/firebase/firestore';
import { addTable, updateTable, deleteTable } from '@/lib/firebase/tables'; // Changed import
import { updateOrder, createOrder } from '@/lib/firebase/orders'; // Changed import
import { getOrdersCollectionPath, getTablesCollectionPath } from '@/lib/firebase/utils'; // Import from utils
import { getMenuItems as fetchMenuItemsFirebase, getMenuCategories, getMenuSubcategories } from '@/lib/firebase/menu';
import type { RestaurantProfile, Table as FirebaseTableType, TableStatus, OrderStatus, OrderItem, MenuItem as MenuItemType, MenuCategory, MenuSubcategory, ClientOrder, ClientTableGroup } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Edit3, Trash2, QrCode, Users, Circle, X, MinusCircle, Utensils, Hourglass, ShoppingCart, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import ConfirmationDialog from '@/components/shared/confirmation-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import MenuSelectionForBill from '@/components/table-management/menu-selection-for-bill';
import { cn } from '@/lib/utils';
import { collection, query, where, orderBy, onSnapshot, Timestamp, Unsubscribe } from 'firebase/firestore'; // Added onSnapshot, Timestamp, Unsubscribe
import { db } from '@/lib/firebase/config'; // Added db
import { convertFirebaseTimestampToString } from '@/lib/firebase/utils'; // Utility for timestamp conversion
import { calculateOrderTaxes } from '@/lib/taxEngine';
import BillingPanel from '@/components/shared/billing-panel';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getTableGroupsForTable } from '@/lib/firebase/groups';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';


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

const orderStatusConfig = {
  pending_customer_confirmation: { label: 'Pending Customer Confirmation', shortLabel: 'Pending Cust.', icon: Hourglass, color: 'text-yellow-600' },
  pending_kitchen: { label: 'Pending Kitchen Acceptance', shortLabel: 'Pending Kitchen', icon: Hourglass, color: 'text-yellow-600' },
  confirmed_by_kitchen: { label: 'Kitchen Confirmed', shortLabel: 'Kitchen Confirmed', icon: Utensils, color: 'text-blue-600' },
  preparing: { label: 'Preparing', shortLabel: 'Preparing', icon: Utensils, color: 'text-blue-600' },
  ready_for_pickup: { label: 'Ready for Pickup', shortLabel: 'Ready Pickup', icon: ShoppingCart, color: 'text-orange-600' },
  served: { label: 'Served', shortLabel: 'Served', icon: CheckCircle, color: 'text-green-600' },
  payment_pending: { label: 'Payment Pending', shortLabel: 'Payment Pend.', icon: Clock, color: 'text-red-600' },
  completed: { label: 'Completed', shortLabel: 'Completed', icon: CheckCircle, color: 'text-green-700' },
  cancelled_by_customer: { label: 'Cancelled by Customer', shortLabel: 'Cancelled (Cust)', icon: XCircle, color: 'text-gray-500' },
  cancelled_by_restaurant: { label: 'Cancelled by Restaurant', shortLabel: 'Cancelled (Rest)', icon: XCircle, color: 'text-gray-500' },
};

const toClientOrder = (docId: string, data: any): ClientOrder => {
    const orderBase: Omit<ClientOrder, 'id' | 'createdAt' | 'updatedAt'> = {
        restaurantId: data.restaurantId,
        tableId: data.tableId || null,
        tableNumber: data.tableNumber || null,
        items: data.items as OrderItem[],
        subtotal: data.subtotal,
        totalAmount: data.totalAmount,
        status: data.status as OrderStatus,
        taxAmount: typeof data.taxAmount === 'number' ? data.taxAmount : undefined,
        serviceCharge: typeof data.serviceCharge === 'number' ? data.serviceCharge : undefined,
        discountAmount: typeof data.discountAmount === 'number' ? data.discountAmount : undefined,
        customerNotes: typeof data.customerNotes === 'string' ? data.customerNotes : undefined,
        kitchenNotes: typeof data.kitchenNotes === 'string' ? data.kitchenNotes : undefined,
        paymentMethod: typeof data.paymentMethod === 'string' ? data.paymentMethod : undefined,
        transactionId: typeof data.transactionId === 'string' ? data.transactionId : undefined,
    };
    return {
        id: docId,
        ...orderBase,
        createdAt: convertFirebaseTimestampToString(data.createdAt),
        updatedAt: convertFirebaseTimestampToString(data.updatedAt),
    };
};

const toFirebaseTableType = (docId: string, data: any): FirebaseTableType => {
  return {
    id: docId,
    ...data,
    createdAt: convertFirebaseTimestampToString(data.createdAt),
    updatedAt: convertFirebaseTimestampToString(data.updatedAt),
  } as FirebaseTableType;
}


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

  const [selectedTable, setSelectedTable] = useState<FirebaseTableType | null>(null);
  const [selectedTableOrders, setSelectedTableOrders] = useState<ClientOrder[]>([]);
  const [menuItems, setMenuItemsState] = useState<MenuItemType[]>([]);
  const [categories, setCategoriesState] = useState<MenuCategory[]>([]);
  const [subcategories, setSubcategoriesState] = useState<MenuSubcategory[]>([]);
  const [currentBillItems, setCurrentBillItems] = useState<OrderItem[]>([]);
  const [isBillPanelVisible, setIsBillPanelVisible] = useState(false);
  const [isMenuSelectionPanelOpen, setIsMenuSelectionPanelOpen] = useState(false);

  const ordersListenerUnsubscribeRef = useRef<Unsubscribe | null>(null);

  const [groupOrders, setGroupOrders] = useState<ClientTableGroup[]>([]);
  const [activeBillTab, setActiveBillTab] = useState('main');
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeGroupSubTab, setActiveGroupSubTab] = useState<'bill' | 'details'>('bill');

  const form = useForm<TableFormValues>({
    resolver: zodResolver(tableFormSchema),
    defaultValues: { tableNumber: '', capacity: 1 },
  });

  // Fetch initial static data (restaurant, menu)
  useEffect(() => {
    if (!restaurantId || !user || role !== 'owner') {
      if(!authLoading && user) router.replace('/dashboard'); // redirect if not owner and done loading auth
      return;
    }
    setPageLoading(true);
    Promise.all([
      getRestaurant(restaurantId),
      fetchMenuItemsFirebase(restaurantId),
      getMenuCategories(restaurantId),
      getMenuSubcategories(restaurantId)
    ]).then(([restaurantData, fetchedMenuItems, fetchedCategories, fetchedSubcategories]) => {
      if (restaurantData && restaurantData.ownerId === user.uid) {
        setRestaurant(restaurantData);
        setMenuItemsState(fetchedMenuItems);
        setCategoriesState(fetchedCategories.sort((a,b) => a.order - b.order));
        setSubcategoriesState(fetchedSubcategories.sort((a,b) => a.order - b.order));
      } else {
        toast({ variant: "destructive", title: "Access Denied", description: "Restaurant not found or you don't have permission." });
        router.replace('/dashboard');
      }
    }).catch(error => {
      console.error("Error fetching initial restaurant/menu data:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load initial restaurant data." });
    }).finally(() => {
      // Page loading will be set to false by tables listener
    });
  }, [restaurantId, user, role, authLoading, router, toast]);

  // Real-time tables listener
  useEffect(() => {
    if (!restaurantId || !db || !user || role !== 'owner') return;
    setPageLoading(true); // For initial table load
    const tablesColRef = collection(db, getTablesCollectionPath(restaurantId));
    const q = query(tablesColRef, orderBy('tableNumber', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTables = snapshot.docs.map(docSnap => toFirebaseTableType(docSnap.id, docSnap.data()));
      setTables(fetchedTables);
      setPageLoading(false);
    }, (error) => {
      console.error("Error listening to tables:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load live table data." });
      setPageLoading(false);
    });

    return () => unsubscribe();
  }, [restaurantId, user, role, toast]);


  // Real-time orders for selected table
  useEffect(() => {
    // Clean up previous listener if selectedTable changes
    if (ordersListenerUnsubscribeRef.current) {
      ordersListenerUnsubscribeRef.current();
      ordersListenerUnsubscribeRef.current = null;
    }

    if (!selectedTable || !restaurantId || !db) {
      setSelectedTableOrders([]); // Clear orders if no table selected
      setCurrentBillItems([]);
      return;
    }

    setFormSubmitting(true); // Indicate loading orders for the bill
    const ordersColRef = collection(db, getOrdersCollectionPath(restaurantId));
    const activeStatuses: OrderStatus[] = ['pending_kitchen', 'confirmed_by_kitchen', 'preparing', 'ready_for_pickup', 'served', 'payment_pending'];
    const q = query(ordersColRef, where('tableId', '==', selectedTable.id), where('status', 'in', activeStatuses), orderBy('createdAt', 'asc'));

    ordersListenerUnsubscribeRef.current = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(docSnap => toClientOrder(docSnap.id, docSnap.data()));
      setSelectedTableOrders(orders);

      const aggregatedBillItems: OrderItem[] = orders.reduce((acc, order) => {
        order.items.forEach(item => {
          const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
          const existingItem = acc.find(bi => bi.menuItemId === item.menuItemId);
          const enrichedItem = {
            ...item,
            categoryId: menuItem?.categoryId,
            taxOverrides: menuItem?.taxOverrides,
          };
          if (existingItem) {
            existingItem.quantity += item.quantity;
            existingItem.totalPrice += item.totalPrice;
          } else {
            acc.push(enrichedItem);
          }
        });
        return acc;
      }, [] as OrderItem[]);
      setCurrentBillItems(aggregatedBillItems);
      setFormSubmitting(false);
    }, (error) => {
      console.error(`Error listening to orders for table ${selectedTable.id}:`, error);
      toast({ variant: "destructive", title: "Error Loading Orders", description: error.message || "Could not load orders for this table." });
      setCurrentBillItems([]);
      setFormSubmitting(false);
    });

    return () => { // Cleanup on component unmount or if selectedTable changes again
      if (ordersListenerUnsubscribeRef.current) {
        ordersListenerUnsubscribeRef.current();
      }
    };
  }, [selectedTable, restaurantId, toast]);

  // Fetch group orders for selected table
  useEffect(() => {
    if (!selectedTable || !restaurantId) {
      setGroupOrders([]);
      return;
    }
    getTableGroupsForTable(restaurantId, selectedTable.id)
      .then(setGroupOrders)
      .catch(() => setGroupOrders([]));
  }, [selectedTable, restaurantId]);


  const handleSelectTable = (table: FirebaseTableType) => {
    setSelectedTable(table);
    setIsBillPanelVisible(true);
    setIsMenuSelectionPanelOpen(false); 
    // Order fetching is now handled by the useEffect hook watching `selectedTable`
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
          categoryId: menuItem.categoryId,
          taxOverrides: menuItem.taxOverrides,
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
      // Find an existing "served" or "payment_pending" order to update, or create a new one.
      // This logic might need refinement based on how you want to handle multiple "sessions" vs one continuous bill for a table.
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
          restaurantId: restaurantId,
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
      
      // Update table status if needed (e.g., to 'occupied' if it wasn't already)
      if (selectedTable.status !== 'occupied' && selectedTable.status !== 'needs_cleaning') { 
         await updateTable(restaurantId, selectedTable.id, { status: 'occupied' }); 
         // Real-time listener for tables will update the UI
      }
      // Real-time listener for orders will update the bill panel
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
        await updateTable(restaurantId, editingTable.id, { ...values, status: editingTable.status }); // Pass current status
        toast({ title: "Table Updated", description: `Table ${values.tableNumber} has been updated.` });
      } else {
        await addTable(restaurantId, values);
        toast({ title: "Table Added", description: `Table ${values.tableNumber} has been added.` });
      }
      // No need to manually refetch, onSnapshot will handle it
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
    setFormSubmitting(true); // Use general form submitting for this action
    try {
      const tableToUpdate = tables.find(t => t.id === tableId);
      if (!tableToUpdate) return;
      await updateTable(restaurantId, tableId, { status: newStatus });
      toast({ title: "Status Updated", description: `Table ${tableToUpdate.tableNumber} is now ${newStatus}.` });
      // No need to manually refetch, onSnapshot will handle it
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
      // No need to manually refetch, onSnapshot will handle it
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

  // Build categoryMap for tax engine
  const categoryMap = categories.reduce((acc, cat) => {
    acc[cat.id] = cat;
    return acc;
  }, {} as Record<string, MenuCategory>);

  if (authLoading || pageLoading) { // pageLoading covers initial table and menu/restaurant data
    return <div className="flex h-screen items-center justify-center"><LoadingSpinner className="h-10 w-10 text-primary" /></div>;
  }
  if (!restaurant && !pageLoading) { // Restaurant fetch failed
    return <div className="flex h-screen items-center justify-center"><Card><CardHeader><CardTitle>Error</CardTitle></CardHeader><CardContent><p>Restaurant data could not be loaded.</p></CardContent></Card></div>;
  }
  
  const getDisplayTestLink = (storedQrValue: string) => {
    const configuredBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://potoba-v1.netlify.app';
    try {
      // Assuming storedQrValue is already a full URL
      if (new URL(storedQrValue)) return storedQrValue;
    } catch (e) {
      // Fallback if storedQrValue is not a full URL (e.g. just a path)
      if (storedQrValue.startsWith('/')) {
         return (configuredBaseUrl.endsWith('/') ? configuredBaseUrl.slice(0, -1) : configuredBaseUrl) + storedQrValue;
      }
    }
    console.warn("Could not reliably reconstruct test link from stored qrCodeValue:", storedQrValue);
    return storedQrValue; // Return as is if no clear way to form URL
  };
  
  const tableGridPanelClasses = cn(
    "p-4 overflow-y-auto transition-all duration-300 ease-in-out flex-grow",
     "w-full" 
  );

  const billPanelClasses = cn(
    "absolute top-0 right-0 h-[calc(100vh-theme(spacing.16)-80px)] md:relative md:top-0 md:right-0 md:h-full p-4 border-l bg-card text-card-foreground overflow-y-auto flex flex-col transition-all duration-300 ease-in-out",
    "w-full md:w-4/5" 
  );
  
  const menuSelectionPanelClasses = cn(
    "absolute top-0 left-0 h-full bg-card shadow-xl z-20 transition-transform duration-300 ease-in-out overflow-y-auto border-r",
    "w-full sm:w-[350px] md:w-[320px] lg:w-[380px]", 
    isMenuSelectionPanelOpen ? "transform translate-x-0" : "transform -translate-x-full"
  );


  return (
    <div className="flex h-[calc(100vh-theme(spacing.16)-80px)] overflow-hidden relative">
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
      
      <div className="flex flex-1 ">
      <ScrollArea className={tableGridPanelClasses}> 
          <Card className="shadow-xl  overflow-auto h-full flex flex-col">
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-end items-end md:items-center">
                {/* <div className="mb-4 md:mb-0">
                    <CardTitle className="text-2xl md:text-3xl flex items-center">
                        <Users className="mr-3 h-7 w-7 text-primary" /> Table Management
                    </CardTitle>
                    <CardDescription>Oversee tables for {restaurant?.name || 'your restaurant'}.</CardDescription>
                </div> */}
                <Button onClick={openAddModal} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add New Table
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
              {tables.length > 0 ? (
                 <div className={`grid grid-cols-1 ${
                    (selectedTable && isBillPanelVisible) 
                      ? 'sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2' 
                      : 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4' 
                  } gap-4`}>
                  {tables.map(table => (
                    <Card 
                      key={table.id} 
                      className={`flex flex-col shadow-md hover:shadow-lg transition-all group cursor-pointer ${selectedTable?.id === table.id ? 'ring-2 ring-primary shadow-xl scale-105' : 'hover:scale-[1.02]'}`}
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
                        <Select value={table.status} onValueChange={(newStatus) => handleStatusChange(table.id, newStatus as TableStatus)}>
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
       </ScrollArea>

        {selectedTable && isBillPanelVisible && (
          <div className={billPanelClasses}>
            <Tabs value={activeBillTab} onValueChange={setActiveBillTab} className="w-full">
              <TabsList className="mb-4 overflow-x-auto flex-nowrap whitespace-nowrap">
                {groupOrders.map(group => (
                  <TabsTrigger
                    key={group.id}
                    value={group.id}
                    className={activeBillTab === group.id ? 'bg-primary text-primary-foreground' : ''}
                    onClick={() => { setActiveGroupId(group.id); setActiveGroupSubTab('bill'); }}
                  >
                    {group.creatorName || 'Group'} ({group.members.length})
                  </TabsTrigger>
                ))}
              </TabsList>
              {groupOrders.map(group => (
                <TabsContent key={group.id} value={group.id}>
                  <div className="flex flex-col gap-2">
                    <Tabs value={activeGroupSubTab} onValueChange={(val) => setActiveGroupSubTab(val as 'bill' | 'details')} className="w-full">
                      <TabsList className="mb-2 flex-nowrap overflow-x-auto">
                        <TabsTrigger value="bill">Bill</TabsTrigger>
                        <TabsTrigger value="details">Details</TabsTrigger>
                      </TabsList>
                      <TabsContent value="bill">
                        <BillingPanel
                          billItems={group.cartItems}
                          restaurant={restaurant}
                          categoryMap={categoryMap}
                          isLoading={formSubmitting}
                          onUpdateItemQuantity={() => {}}
                          onRemoveItem={() => {}}
                          onFinalize={() => {}}
                          panelTitle={`Group: ${group.creatorName || group.id}`}
                          finalizeLabel="Finalize Group Bill"
                          customerName={group.creatorName || ''}
                          setCustomerName={(v) => {/* update group creatorName logic here */}}
                          customerPhoneNumber={group.creatorPhone || ''}
                          setCustomerPhoneNumber={(v) => {/* update group creatorPhone logic here */}}
                          tableNumber={selectedTable?.tableNumber || ''}
                          setTableNumber={() => {}}
                          orderStatusConfig={orderStatusConfig}
                          activeTab={activeGroupSubTab}
                          setActiveTab={setActiveGroupSubTab}
                          view="bill"
                        />
                      </TabsContent>
                      <TabsContent value="details">
                        <BillingPanel
                          billItems={group.cartItems}
                          restaurant={restaurant}
                          categoryMap={categoryMap}
              isLoading={formSubmitting}
                          onUpdateItemQuantity={() => {}}
                          onRemoveItem={() => {}}
                          onFinalize={() => {}}
                          panelTitle={`Group: ${group.creatorName || group.id}`}
                          finalizeLabel="Finalize Group Bill"
                          customerName={group.creatorName || ''}
                          setCustomerName={(v) => {/* update group creatorName logic here */}}
                          customerPhoneNumber={group.creatorPhone || ''}
                          setCustomerPhoneNumber={(v) => {/* update group creatorPhone logic here */}}
                          tableNumber={selectedTable?.tableNumber || ''}
                          setTableNumber={() => {}}
                          orderStatusConfig={orderStatusConfig}
                          activeTab={activeGroupSubTab}
                          setActiveTab={setActiveGroupSubTab}
                          view="details"
                        />
                      </TabsContent>
                    </Tabs>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}
      </div>


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
            <DialogContent className="sm:max-w-screen-sm">
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

