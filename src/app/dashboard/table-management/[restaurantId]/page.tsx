
// src/app/dashboard/table-management/[restaurantId]/page.tsx
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth/context';
import { getRestaurant } from '@/lib/firebase/firestore';
import { addTable, updateTable, deleteTable, getTableAreas, addTableArea, updateTableArea, deleteTableArea } from '@/lib/firebase/tables';
import { updateOrder, createOrder } from '@/lib/firebase/orders';
import { getOrdersCollectionPath, getTablesCollectionPath, convertFirebaseTimestampToString } from '@/lib/firebase/utils';
import { getMenuItems as fetchMenuItemsFirebase, getMenuCategories, getMenuSubcategories } from '@/lib/firebase/menu';
import type { RestaurantProfile, Table as FirebaseTableType, TableStatus, OrderStatus, OrderItem, MenuItem as MenuItemType, MenuCategory, MenuSubcategory, ClientOrder, ClientTableGroup, TableArea } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Edit3, Trash2, QrCode, Users, Circle, X, MinusCircle, Utensils, Hourglass, ShoppingCart, CheckCircle, Clock, XCircle, LayoutGrid, MapPin as MapPinIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import ConfirmationDialog from '@/components/shared/confirmation-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import MenuSelectionForBill from '@/components/table-management/menu-selection-for-bill';
import { cn } from '@/lib/utils';
import { collection, query, where, orderBy, onSnapshot, Timestamp, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { calculateOrderTaxes } from '@/lib/taxEngine';
import BillingPanel from '@/components/shared/billing-panel';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getTableGroupsForTable } from '@/lib/firebase/groups';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import AreaForm from '@/components/table-management/area-form';


const tableFormSchema = z.object({
  tableNumber: z.string().min(1, "Table number is required."),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1."),
  areaId: z.string().optional().nullable(),
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
  const [tableAreas, setTableAreas] = useState<TableArea[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<FirebaseTableType | null>(null); 
  
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; data: FirebaseTableType | TableArea; type: 'table' | 'area' } | null>(null);
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
  const [activeBillTab, setActiveBillTab] = useState('main'); // 'main' or groupId
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeGroupSubTab, setActiveGroupSubTab] = useState<'bill' | 'details'>('bill');

  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<TableArea | null>(null);

  const form = useForm<TableFormValues>({
    resolver: zodResolver(tableFormSchema),
    defaultValues: { tableNumber: '', capacity: 1, areaId: null },
  });

  const fetchInitialData = useCallback(async () => {
    if (!restaurantId || !user || role !== 'owner') {
        if(!authLoading && user) router.replace('/dashboard');
        return;
    }
    setPageLoading(true);
    try {
        const [restaurantData, fetchedMenuItems, fetchedCategories, fetchedSubcategories, fetchedAreas] = await Promise.all([
            getRestaurant(restaurantId),
            fetchMenuItemsFirebase(restaurantId),
            getMenuCategories(restaurantId),
            getMenuSubcategories(restaurantId),
            getTableAreas(restaurantId),
        ]);

        if (restaurantData && restaurantData.ownerId === user.uid) {
            setRestaurant(restaurantData);
            setMenuItemsState(fetchedMenuItems);
            setCategoriesState(fetchedCategories.sort((a,b) => a.order - b.order));
            setSubcategoriesState(fetchedSubcategories.sort((a,b) => a.order - b.order));
            setTableAreas(fetchedAreas.sort((a,b) => a.order - b.order));
        } else {
            toast({ variant: "destructive", title: "Access Denied", description: "Restaurant not found or you don't have permission." });
            router.replace('/dashboard');
        }
    } catch (error) {
        console.error("Error fetching initial restaurant/menu/area data:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load initial restaurant data." });
    } finally {
        // Page loading will be set to false by tables listener, or here if no tables
    }
  }, [restaurantId, user, role, authLoading, router, toast]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);


  useEffect(() => {
    if (!restaurantId || !db || !user || role !== 'owner') return;
    setPageLoading(true); 
    const tablesColRef = collection(db, getTablesCollectionPath(restaurantId));
    const q = query(tablesColRef, orderBy('areaName', 'asc'), orderBy('tableNumber', 'asc'));

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


  useEffect(() => {
    if (ordersListenerUnsubscribeRef.current) {
      ordersListenerUnsubscribeRef.current();
      ordersListenerUnsubscribeRef.current = null;
    }

    if (!selectedTable || !restaurantId || !db) {
      setSelectedTableOrders([]);
      setCurrentBillItems([]);
      setGroupOrders([]);
      return;
    }

    setFormSubmitting(true); 
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
      if (orders.length === 0) setActiveBillTab('main');
      else if (!orders.find(o => o.groupId === activeGroupId) && activeGroupId !== 'main') {
          // If the currently active group order no longer exists (e.g. completed), switch to main tab
          setActiveBillTab('main');
      }
      setFormSubmitting(false);
    }, (error) => {
      console.error(`Error listening to orders for table ${selectedTable.id}:`, error);
      toast({ variant: "destructive", title: "Error Loading Orders", description: error.message || "Could not load orders for this table." });
      setCurrentBillItems([]);
      setFormSubmitting(false);
    });

     getTableGroupsForTable(restaurantId, selectedTable.id)
      .then(setGroupOrders)
      .catch(() => setGroupOrders([]));

    return () => { 
      if (ordersListenerUnsubscribeRef.current) {
        ordersListenerUnsubscribeRef.current();
      }
    };
  }, [selectedTable, restaurantId, toast, menuItems]);


  const handleSelectTable = (table: FirebaseTableType) => {
    setSelectedTable(table);
    setIsBillPanelVisible(true);
    setIsMenuSelectionPanelOpen(false); 
    setActiveBillTab('main'); // Default to main bill when a table is selected
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
      if (selectedTable.status !== 'occupied' && selectedTable.status !== 'needs_cleaning') { 
         await updateTable(restaurantId, selectedTable.id, { status: 'occupied' }); 
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Finalization Failed", description: error.message || "Could not finalize bill." });
    } finally {
      setFormSubmitting(false);
    }
  };


  const handleTableSubmit = async (values: TableFormValues) => {
    setFormSubmitting(true);
    try {
      const selectedArea = tableAreas.find(area => area.id === values.areaId);
      const tablePayload = {
        ...values,
        areaId: selectedArea?.id || null,
        areaName: selectedArea?.name || null,
      };

      if (editingTable) {
        await updateTable(restaurantId, editingTable.id, { ...tablePayload, status: editingTable.status });
        toast({ title: "Table Updated", description: `Table ${values.tableNumber} has been updated.` });
      } else {
        await addTable(restaurantId, tablePayload);
        toast({ title: "Table Added", description: `Table ${values.tableNumber} has been added.` });
      }
      setIsTableModalOpen(false);
      setEditingTable(null);
      form.reset({ tableNumber: '', capacity: 1, areaId: null });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to save table." });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleAreaSubmit = async (values: { name: string; order: number }, areaIdToUpdate?: string) => {
    setFormSubmitting(true);
    try {
      if (areaIdToUpdate) {
        await updateTableArea(restaurantId, areaIdToUpdate, values);
        toast({ title: "Area Updated", description: `${values.name} has been updated.` });
      } else {
        await addTableArea(restaurantId, values);
        toast({ title: "Area Added", description: `${values.name} has been added.` });
      }
      const updatedAreas = await getTableAreas(restaurantId);
      setTableAreas(updatedAreas.sort((a, b) => a.order - b.order));
      setIsAreaModalOpen(false);
      setEditingArea(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Area Save Failed", description: error.message });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleStatusChange = async (tableId: string, newStatus: TableStatus) => {
    setFormSubmitting(true);
    try {
      const tableToUpdate = tables.find(t => t.id === tableId);
      if (!tableToUpdate) return;
      await updateTable(restaurantId, tableId, { status: newStatus });
      toast({ title: "Status Updated", description: `Table ${tableToUpdate.tableNumber} is now ${newStatus}.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to update status." });
    } finally {
      setFormSubmitting(false);
    }
  };
  
  const openDeleteDialog = (data: FirebaseTableType | TableArea, type: 'table' | 'area') => {
    setDeleteConfirmation({ isOpen: true, data, type });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;
    setFormSubmitting(true);
    const { data, type } = deleteConfirmation;
    try {
      if (type === 'table') {
        await deleteTable(restaurantId, data.id);
        toast({ title: "Table Deleted", description: `Table ${(data as FirebaseTableType).tableNumber} has been deleted.` });
        if (selectedTable?.id === data.id) {
            setSelectedTable(null);
            setIsBillPanelVisible(false);
        }
      } else if (type === 'area') {
        await deleteTableArea(restaurantId, data.id);
        toast({ title: "Area Deleted", description: `Area ${(data as TableArea).name} and its tables have been updated.` });
        const updatedAreas = await getTableAreas(restaurantId);
        setTableAreas(updatedAreas.sort((a, b) => a.order - b.order));
        // Re-fetch tables might be needed if areaName on tables isn't updated via listener quickly enough
        const currentTables = await getTables(restaurantId);
        setTables(currentTables);
      }
      setDeleteConfirmation(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Deletion Failed", description: error.message || "Could not delete." });
    } finally {
      setFormSubmitting(false);
    }
  };

  const openEditModal = (table: FirebaseTableType) => {
    setEditingTable(table);
    form.reset({ tableNumber: table.tableNumber, capacity: table.capacity, areaId: table.areaId || null });
    setIsTableModalOpen(true);
  };
  
  const openAddModal = () => {
    setEditingTable(null);
    form.reset({ tableNumber: '', capacity: 1, areaId: null });
    setIsTableModalOpen(true);
  };

  const categoryMap = categories.reduce((acc, cat) => {
    acc[cat.id] = cat;
    return acc;
  }, {} as Record<string, MenuCategory>);

  if (authLoading || pageLoading) {
    return <div className="flex h-screen items-center justify-center"><LoadingSpinner className="h-10 w-10 text-primary" /></div>;
  }
  if (!restaurant && !pageLoading) {
    return <div className="flex h-screen items-center justify-center"><Card><CardHeader><CardTitle>Error</CardTitle></CardHeader><CardContent><p>Restaurant data could not be loaded.</p></CardContent></Card></div>;
  }
  
  const getDisplayTestLink = (storedQrValue: string) => {
    const configuredBaseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://6000-firebase-studio-1746809721561.cluster-ancjwrkgr5dvux4qug5rbzyc2y.cloudworkstations.dev').replace(/\/$/, '');
    try {
      if (new URL(storedQrValue)) return storedQrValue;
    } catch (e) {
      if (storedQrValue.startsWith('/')) {
         return (configuredBaseUrl.endsWith('/') ? configuredBaseUrl.slice(0, -1) : configuredBaseUrl) + storedQrValue;
      }
    }
    console.warn("Could not reliably reconstruct test link from stored qrCodeValue:", storedQrValue);
    return storedQrValue; 
  };
  
  const tableGridPanelClasses = cn(
    "p-4 overflow-y-auto transition-all duration-300 ease-in-out flex-grow",
     isBillPanelVisible ? "w-full md:w-1/2 lg:w-2/5 xl:w-1/3" : "w-full" 
  );

  const billPanelClasses = cn(
    "absolute top-0 right-0 h-[calc(100vh-theme(spacing.16)-80px)] md:relative md:top-0 md:right-0 md:h-full p-4 border-l bg-card text-card-foreground overflow-y-auto flex flex-col transition-all duration-300 ease-in-out",
    "w-full md:w-1/2 lg:w-3/5 xl:w-2/3", 
    isBillPanelVisible ? "translate-x-0" : "translate-x-full md:hidden"
  );
  
  const menuSelectionPanelClasses = cn(
    "absolute top-0 left-0 h-full bg-card shadow-xl z-20 transition-transform duration-300 ease-in-out overflow-y-auto border-r",
    "w-full sm:w-[350px] md:w-[320px] lg:w-[380px]", 
    isMenuSelectionPanelOpen ? "transform translate-x-0" : "transform -translate-x-full"
  );

  const tablesByArea = tables.reduce((acc, table) => {
    const areaKey = table.areaId || 'unassigned';
    if (!acc[areaKey]) {
      acc[areaKey] = { name: table.areaName || 'Unassigned Tables', id: areaKey, tables: [] };
    }
    acc[areaKey].tables.push(table);
    return acc;
  }, {} as Record<string, { name: string; id: string; tables: FirebaseTableType[] }>);

  const sortedAreaKeys = Object.keys(tablesByArea).sort((a, b) => {
    if (a === 'unassigned') return 1; // Push unassigned to the end
    if (b === 'unassigned') return -1;
    const areaA = tableAreas.find(area => area.id === a);
    const areaB = tableAreas.find(area => area.id === b);
    return (areaA?.order || 0) - (areaB?.order || 0);
  });


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
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div className="mb-4 md:mb-0">
                    <CardTitle className="text-2xl md:text-3xl flex items-center">
                        <LayoutGrid className="mr-3 h-7 w-7 text-primary" /> Table Layout
                    </CardTitle>
                    <CardDescription>Manage tables for {restaurant?.name || 'your restaurant'}.</CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsAreaModalOpen(true)}><MapPinIcon className="mr-2 h-4 w-4" />Manage Areas</Button>
                    <Button onClick={openAddModal} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Table
                    </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
                {tables.length > 0 || tableAreas.length > 0 ? (
                    <Accordion type="multiple" defaultValue={sortedAreaKeys} className="w-full">
                    {sortedAreaKeys.map(areaKey => {
                        const areaInfo = tablesByArea[areaKey];
                        return (
                        <AccordionItem value={areaInfo.id} key={areaInfo.id} className="border-b border-border mb-3 rounded-lg overflow-hidden bg-muted/30">
                            <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 text-lg font-semibold text-foreground">
                            {areaInfo.name} ({areaInfo.tables.length})
                            </AccordionTrigger>
                            <AccordionContent className="p-3">
                                <div className={`grid grid-cols-1 ${
                                    (selectedTable && isBillPanelVisible) 
                                    ? 'sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2' // Fewer columns when bill panel is open
                                    : 'sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3' // More columns otherwise
                                } gap-4`}>
                                {areaInfo.tables.map(table => (
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
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => {e.stopPropagation(); openDeleteDialog(table, 'table')}} title="Delete Table"><Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive"/></Button>
                                        </div>
                                    </CardFooter>
                                    </Card>
                                ))}
                                {areaInfo.tables.length === 0 && <p className="text-muted-foreground text-sm col-span-full text-center py-4">No tables in this area.</p>}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        )
                    })}
                    </Accordion>
                ) : (
                    <div className="text-center py-10 border-2 border-dashed rounded-lg bg-muted/30">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Tables or Areas Yet</h3>
                    <p className="text-muted-foreground mb-4">Start by adding areas, then assign tables to them.</p>
                    <div className="flex gap-2 justify-center">
                         <Button onClick={() => setIsAreaModalOpen(true)} variant="outline"><MapPinIcon className="mr-2 h-4 w-4"/>Add First Area</Button>
                         <Button onClick={openAddModal} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add First Table
                        </Button>
                    </div>
                    </div>
                )}
            </CardContent>
          </Card>
       </ScrollArea>

        {selectedTable && isBillPanelVisible && (
          <div className={billPanelClasses}>
            <Tabs value={activeBillTab} onValueChange={setActiveBillTab} className="w-full">
              <TabsList className="mb-4 overflow-x-auto flex-nowrap whitespace-nowrap">
                <TabsTrigger value="main">Main Bill</TabsTrigger>
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
              <TabsContent value="main">
                <BillingPanel
                  billItems={currentBillItems}
                  restaurant={restaurant}
                  categoryMap={categoryMap}
                  isLoading={formSubmitting}
                  onUpdateItemQuantity={handleUpdateItemQuantityInBill}
                  onRemoveItem={handleRemoveItemFromBill}
                  onFinalize={handleFinalizeBill}
                  onClose={() => { setIsBillPanelVisible(false); setSelectedTable(null); }}
                  onToggleMenuSelection={() => setIsMenuSelectionPanelOpen(prev => !prev)}
                  isMenuSelectionOpen={isMenuSelectionPanelOpen}
                  panelTitle={`Bill for Table ${selectedTable.tableNumber}`}
                  showMenuButton
                  showCloseButton
                  activeTab="bill" 
                />
              </TabsContent>
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
                          onUpdateItemQuantity={() => { /* Group cart update logic */ }}
                          onRemoveItem={() => { /* Group cart update logic */ }}
                          onFinalize={() => { /* Group finalize logic */ }}
                          panelTitle={`Group: ${group.creatorName || group.id}`}
                          finalizeLabel="Finalize Group Bill"
                          customerName={group.creatorName || ''}
                          tableNumber={selectedTable?.tableNumber || ''}
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
                          onUpdateItemQuantity={() => { /* Group cart update logic */ }}
                          onRemoveItem={() => { /* Group cart update logic */ }}
                          onFinalize={() => { /* Group finalize logic */ }}
                          panelTitle={`Group: ${group.creatorName || group.id}`}
                          finalizeLabel="Finalize Group Bill"
                          customerName={group.creatorName || ''}
                          customerPhoneNumber={group.creatorPhone || ''}
                          tableNumber={selectedTable?.tableNumber || ''}
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
              <FormField control={form.control} name="areaId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined} defaultValue={field.value || undefined}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Assign to an area..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="">No Area / Unassigned</SelectItem>
                        {tableAreas.map(area => <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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

      {/* Manage Areas Dialog */}
      <Dialog open={isAreaModalOpen} onOpenChange={(isOpen) => { if (!isOpen) setEditingArea(null); setIsAreaModalOpen(isOpen);}}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Manage Table Areas</DialogTitle>
                <DialogDescription>Create, edit, or delete areas to organize your tables.</DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto space-y-3 p-1">
                {tableAreas.length > 0 ? tableAreas.map(area => (
                    <Card key={area.id} className="flex items-center justify-between p-3">
                        <div>
                            <p className="font-medium">{area.name}</p>
                            <p className="text-xs text-muted-foreground">Display Order: {area.order}</p>
                        </div>
                        <div className="space-x-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingArea(area); }}><Edit3 className="h-4 w-4"/></Button>
                            <Button variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => openDeleteDialog(area, 'area')}><Trash2 className="h-4 w-4"/></Button>
                        </div>
                    </Card>
                )) : <p className="text-sm text-muted-foreground text-center py-3">No areas created yet.</p>}
            </div>
            <Separator className="my-3"/>
            <AreaForm 
                area={editingArea} 
                onSubmit={handleAreaSubmit} 
                isLoading={formSubmitting}
                onDone={() => {setEditingArea(null); /* Potentially close parent if no edit, or keep open */}}
            />
             <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline" onClick={() => {setIsAreaModalOpen(false); setEditingArea(null);}}>Close</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {deleteConfirmation?.isOpen && (
        <ConfirmationDialog
          isOpen={deleteConfirmation.isOpen}
          onClose={() => setDeleteConfirmation(null)}
          onConfirm={confirmDelete}
          title={`Delete ${deleteConfirmation.type === 'table' ? 'Table' : 'Area'}: ${deleteConfirmation.type === 'table' ? (deleteConfirmation.data as FirebaseTableType).tableNumber : (deleteConfirmation.data as TableArea).name}?`}
          description={deleteConfirmation.type === 'area' ? "Deleting an area will disassociate tables from it, but will not delete the tables themselves. This action cannot be undone." : "This action cannot be undone. Associated active orders might need manual resolution."}
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
