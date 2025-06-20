// src/app/dashboard/table-management/[restaurantId]/page.tsx
'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth/context';
import { getRestaurant } from '@/lib/firebase/firestore';
import { addTable, updateTable, deleteTable, getTableAreas, addTableArea, updateTableArea, deleteTableArea, getTables as fetchTablesFromDb } from '@/lib/firebase/tables';
import { updateOrder as updateFirebaseOrder, createOrder as createFirebaseOrder, getOrder as getFirestoreOrder } from '@/lib/firebase/orders';
import { getOrdersCollectionPath, getTablesCollectionPath, convertFirebaseTimestampToString } from '@/lib/firebase/utils';
import { getMenuItems as fetchMenuItemsFirebase, getMenuCategories, getMenuSubcategories } from '@/lib/firebase/menu';
import type { RestaurantProfile, Table as FirebaseTableType, TableStatus, OrderStatus, OrderItem, MenuItem as MenuItemType, MenuCategory, MenuSubcategory, ClientOrder, ClientTableGroup, TableArea, BillableSession, Waiter, TableGroup } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Edit3, Trash2, QrCode, Users, Circle, X, MinusCircle, Utensils, Hourglass, ShoppingCart, CheckCircle, Clock, XCircle, LayoutGrid, MapPin as MapPinIcon, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import ConfirmationDialog from '@/components/shared/confirmation-dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import MenuSelectionForBill from '@/components/table-management/menu-selection-for-bill';
import { cn } from '@/lib/utils';
import { collection, query, where, orderBy, onSnapshot, Timestamp, Unsubscribe, doc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { calculateOrderTaxes } from '@/lib/taxEngine';
import BillingPanel from '@/components/shared/billing-panel';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getTableGroupsForTable } from '@/lib/firebase/groups';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import AreaForm from '@/components/table-management/area-form';
import { Separator } from '@/components/ui/separator';
import { useOrders as useOrderContext } from '@/contexts/waiter/OrderContext';
import { EditInstructionsDialog } from '@/components/waiter/EditInstructionsDialog';


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
  paying: 'bg-indigo-500',
};

const orderStatusConfig: Record<OrderStatus, { label: string; icon?: React.ElementType; color: string; shortLabel?: string }> = {
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

const possibleNextStatusesForOrder: Record<OrderStatus, OrderStatus[]> = {
  pending_customer_confirmation: ['pending_kitchen', 'cancelled_by_restaurant', 'cancelled_by_customer'],
  pending_kitchen: ['confirmed_by_kitchen', 'cancelled_by_restaurant'],
  confirmed_by_kitchen: ['preparing', 'cancelled_by_restaurant'],
  preparing: ['ready_for_pickup', 'served', 'cancelled_by_restaurant'],
  ready_for_pickup: ['served', 'completed', 'cancelled_by_restaurant'],
  served: ['payment_pending', 'completed'],
  payment_pending: ['completed', 'cancelled_by_restaurant'],
  completed: [],
  cancelled_by_customer: [],
  cancelled_by_restaurant: [],
};


const toClientOrder = (docId: string, data: any): ClientOrder => {
    const orderBase: Omit<ClientOrder, 'id' | 'createdAt' | 'updatedAt'> = {
        restaurantId: data.restaurantId,
        userId: data.userId || null, 
        tableId: data.tableId || null,
        tableNumber: data.tableNumber || null,
        items: data.items as OrderItem[],
        subtotal: data.subtotal,
        totalAmount: data.totalAmount,
        status: data.status as OrderStatus,
        customerName: data.customerName || null, 
        customerPhoneNumber: data.customerPhoneNumber || null, 
        customerWhatsapp: data.customerWhatsapp || null,
        email: data.email || null,
        taxAmount: typeof data.taxAmount === 'number' ? data.taxAmount : undefined,
        serviceCharge: typeof data.serviceCharge === 'number' ? data.serviceCharge : undefined,
        discountAmount: typeof data.discountAmount === 'number' ? data.discountAmount : undefined,
        discountType: data.discountType || 'amount',
        customerNotes: typeof data.customerNotes === 'string' ? data.customerNotes : undefined,
        kitchenNotes: typeof data.kitchenNotes === 'string' ? data.kitchenNotes : undefined,
        paymentMethod: typeof data.paymentMethod === 'string' ? data.paymentMethod : undefined,
        transactionId: typeof data.transactionId === 'string' ? data.transactionId : undefined,
        groupId: typeof data.groupId === 'string' ? data.groupId : null,
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
    tableDocId: docId, 
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
  const orderContext = useOrderContext();

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
  
  const [menuItems, setMenuItemsState] = useState<MenuItemType[]>([]);
  const [categories, setCategoriesState] = useState<MenuCategory[]>([]);
  const [subcategories, setSubcategoriesState] = useState<MenuSubcategory[]>([]);
  
  const [isBillPanelVisible, setIsBillPanelVisible] = useState(false);
  const [isMenuSelectionPanelOpen, setIsMenuSelectionPanelOpen] = useState(false);

  const [persistedTableOrders, setPersistedTableOrders] = useState<ClientOrder[]>([]);
  const ordersListenerUnsubscribeRef = useRef<Unsubscribe | null>(null);
  
  const [activeTableGroups, setActiveTableGroups] = useState<ClientTableGroup[]>([]);
  const groupListenersUnsubscribeRef = useRef<Map<string, Unsubscribe>>(new Map());

  const [activeBillSessionKey, setActiveBillSessionKey] = useState<string | null>('main_bill');

  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhoneNumber, setCustomerPhoneNumber] = useState<string>('');
  const [customerWhatsapp, setCustomerWhatsapp] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [currentCustomerNotes, setCurrentCustomerNotes] = useState<string>('');
  const [currentKitchenNotes, setCurrentKitchenNotes] = useState<string>('');
  const [currentOrderStatusForPanel, setCurrentOrderStatusForPanel] = useState<OrderStatus | null>(null);
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('amount');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [serviceChargeValue, setServiceChargeValue] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<ClientOrder['paymentMethod']>(undefined);
  const [transactionId, setTransactionId] = useState<string>('');

  const [itemsForActiveSession, setItemsForActiveSession] = useState<OrderItem[]>([]);
  const [editingItemForInstructions, setEditingItemForInstructions] = useState<OrderItem | null>(null);
  const [isInstructionsModalOpen, setIsInstructionsModalOpen] = useState(false);

  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<TableArea | null>(null);

  // Placeholder for waiters data (replace with real data/fetch as needed)
  const WAITERS_DATA: { id: string; name: string }[] = [];

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
            setCategoriesState(fetchedCategories.sort((a,b) => (a.order || 0) - (b.order || 0)));
            setSubcategoriesState(fetchedSubcategories.sort((a,b) => (a.order || 0) - (b.order || 0)));
            setTableAreas(fetchedAreas.sort((a, b) => (a.order || 0) - (b.order || 0)));
        } else {
            toast({ variant: "destructive", title: "Access Denied", description: "Restaurant not found or you don't have permission." });
            router.replace('/dashboard');
        }
    } catch (error) {
        console.error("Error fetching initial restaurant/menu/area data:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load initial restaurant data." });
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

    const unsubscribeTables = onSnapshot(q, (snapshot) => {
      const fetchedTables = snapshot.docs.map(docSnap => toFirebaseTableType(docSnap.id, docSnap.data()));
      setTables(fetchedTables);
      setPageLoading(false);
    }, (error) => {
      console.error("Error listening to tables:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load live table data." });
      setPageLoading(false);
    });
    return () => unsubscribeTables();
  }, [restaurantId, user, role, toast]);

  useEffect(() => {
    if (ordersListenerUnsubscribeRef.current) ordersListenerUnsubscribeRef.current();
    groupListenersUnsubscribeRef.current.forEach(unsub => unsub());
    groupListenersUnsubscribeRef.current.clear();

    if (!selectedTable || !restaurantId || !db) {
      setPersistedTableOrders([]);
      setActiveTableGroups([]);
      setItemsForActiveSession([]);
      setActiveBillSessionKey('main_bill');
      return;
    }
    
    const ordersColRef = collection(db, getOrdersCollectionPath(restaurantId));
    const activeOrderStatuses: OrderStatus[] = ['pending_kitchen', 'confirmed_by_kitchen', 'preparing', 'ready_for_pickup', 'served', 'payment_pending'];
    const ordersQuery = query(ordersColRef, where('tableId', '==', selectedTable.id), where('status', 'in', activeOrderStatuses), orderBy('createdAt', 'asc'));
    
    ordersListenerUnsubscribeRef.current = onSnapshot(ordersQuery, (snapshot) => {
      const orders = snapshot.docs.map(docSnap => toClientOrder(docSnap.id, docSnap.data()));
      setPersistedTableOrders(orders);
    }, (error) => console.error(`Error listening to orders for table ${selectedTable.id}:`, error));
    
    const groupsColRef = collection(db, `restaurants/${restaurantId}/tableGroups`);
    const groupsQuery = query(groupsColRef, where('tableId', '==', selectedTable.id), where('status', 'in', ['active', 'ordering', 'locked']));
    const groupSub = onSnapshot(groupsQuery, (snapshot) => {
        const groups = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<TableGroup, 'id'>),
            createdAt: convertFirebaseTimestampToString(docSnap.data().createdAt),
            updatedAt: convertFirebaseTimestampToString(docSnap.data().updatedAt),
        } as ClientTableGroup));
        setActiveTableGroups(groups);
    }, (error) => console.error(`Error listening to groups for table ${selectedTable.id}:`, error));
    groupListenersUnsubscribeRef.current.set('main_groups_listener', groupSub);

    return () => { 
      if (ordersListenerUnsubscribeRef.current) ordersListenerUnsubscribeRef.current();
      groupListenersUnsubscribeRef.current.forEach(unsub => unsub());
      groupListenersUnsubscribeRef.current.clear();
    };
  }, [selectedTable, restaurantId]);
  
  const billableSessions = useMemo((): BillableSession[] => {
    if (!selectedTable) return [];
    const sessions: BillableSession[] = [];
    const mainBillLocalItems = orderContext.getOrderForTable(selectedTable.id).filter(item => !item.groupId);
    const mainBillPersistedOrder = persistedTableOrders.find(o => !o.groupId && o.tableId === selectedTable.id);

    if (mainBillPersistedOrder || mainBillLocalItems.length > 0) {
      const items = mainBillPersistedOrder ? mainBillPersistedOrder.items : mainBillLocalItems;
      sessions.push({
        key: 'main_bill',
        displayName: 'Main Bill',
        items: items,
        orderId: mainBillPersistedOrder?.id || null,
        createdAt: mainBillPersistedOrder?.createdAt || (mainBillLocalItems[0]?.createdAt),
        customerName: mainBillPersistedOrder?.customerName || null,
        status: mainBillPersistedOrder?.status || null,
        isGroup: false,
      });
    }

    persistedTableOrders.filter(o => o.groupId && o.tableId === selectedTable.id).forEach(order => {
      sessions.push({
        key: `group_${order.groupId}`,
        displayName: `Group: ${order.groupId?.substring(0,4)} (${activeTableGroups.find(g=>g.id===order.groupId)?.creatorName || 'Host'})`,
        items: order.items,
        orderId: order.id,
        createdAt: order.createdAt,
        customerName: order.customerName || activeTableGroups.find(g => g.id === order.groupId)?.creatorName || `Group ${order.groupId}`,
        status: order.status,
        isGroup: true,
        groupId: order.groupId,
      });
    });

    activeTableGroups.forEach(group => {
      if (group.tableId === selectedTable.id && !sessions.some(s => s.groupId === group.id && s.orderId)) {
        sessions.push({
          key: `group_${group.id}`,
          displayName: `Group Cart: ${group.creatorName || group.id.substring(0,4)}`,
          items: group.cartItems,
          orderId: null,
          createdAt: group.createdAt,
          customerName: group.creatorName,
          status: null, // Cart not yet an order
          isGroup: true,
          groupId: group.id,
        });
      }
    });

    if (sessions.length === 0 && mainBillLocalItems.length > 0) {
         sessions.push({
            key: 'main_bill_local_only',
            displayName: 'Main Bill (Local)',
            items: mainBillLocalItems,
            orderId: null,
            createdAt: mainBillLocalItems[0]?.createdAt || Date.now(),
            customerName: null,
            status: null,
            isGroup: false,
        });
    }
    
    return sessions.sort((a, b) => {
      if (a.key === 'main_bill' || a.key === 'main_bill_local_only') return -1;
      if (b.key === 'main_bill' || b.key === 'main_bill_local_only') return 1;
      const dateA = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
      return dateA - dateB;
    });
  }, [selectedTable, persistedTableOrders, activeTableGroups, orderContext]);

  useEffect(() => {
    const activeSession = billableSessions.find(s => s.key === activeBillSessionKey);
    if (activeSession) {
      setItemsForActiveSession(activeSession.items);
      setCustomerName(activeSession.customerName || '');
      const associatedOrder = activeSession.orderId ? persistedTableOrders.find(o => o.id === activeSession.orderId) : null;
      
      if (associatedOrder) {
        setCurrentOrderStatusForPanel(associatedOrder.status);
        setCustomerPhoneNumber(associatedOrder.customerPhoneNumber || '');
        setCustomerWhatsapp(associatedOrder.customerWhatsapp || '');
        setEmail(associatedOrder.email || '');
        setCurrentCustomerNotes(associatedOrder.customerNotes || '');
        setCurrentKitchenNotes(associatedOrder.kitchenNotes || '');
        setDiscountType(associatedOrder.discountType || 'amount');
        setDiscountValue(associatedOrder.discountAmount || 0);
        setServiceChargeValue(associatedOrder.serviceCharge || 0);
        setPaymentMethod(associatedOrder.paymentMethod || undefined);
        setTransactionId(associatedOrder.transactionId || '');
      } else { 
        setCurrentOrderStatusForPanel(activeSession.isGroup ? 'pending_kitchen' : null); // Group carts are pending
        setCustomerPhoneNumber(''); setCustomerWhatsapp(''); setEmail('');
        setCurrentCustomerNotes(''); setCurrentKitchenNotes('');
        setDiscountType('amount'); setDiscountValue(0); setServiceChargeValue(0);
        setPaymentMethod(undefined); setTransactionId('');
      }
    } else if (billableSessions.length > 0 && (!activeBillSessionKey || !billableSessions.find(s => s.key === activeBillSessionKey))) {
      setActiveBillSessionKey(billableSessions[0].key);
    } else if (billableSessions.length === 0) {
      setItemsForActiveSession([]);
      setActiveBillSessionKey('main_bill'); // Default back if no sessions
    }
  }, [activeBillSessionKey, billableSessions, persistedTableOrders]);


  const handleSelectTable = (table: FirebaseTableType) => {
    setSelectedTable(table);
    setIsBillPanelVisible(true);
    setIsMenuSelectionPanelOpen(false); 
    const initialSession = billableSessions.find(s => s.key === 'main_bill' || s.key === 'main_bill_local_only') || billableSessions[0];
    setActiveBillSessionKey(initialSession ? initialSession.key : 'main_bill');
  };

  const handleAddItemToBill = (menuItem: MenuItemType) => {
    if (!selectedTable) return;
    const groupId = activeBillSessionKey?.startsWith('group_') ? activeBillSessionKey.replace('group_', '') : null;
    orderContext.addItemToOrder(selectedTable.id, menuItem, 1, undefined, groupId);
    toast({ title: "Item Added", description: `${menuItem.name} added to ${activeBillSessionKey === 'main_bill' || activeBillSessionKey === 'main_bill_local_only' ? 'main bill' : `group ${groupId}`}.`});
  };

  const handleUpdateItemQuantityInBill = (menuItemId: string, newQuantity: number, itemUniqueId?: string) => {
    if (!selectedTable) return;
    orderContext.updateItemQuantity(selectedTable.id, menuItemId, newQuantity, undefined, itemUniqueId);
  };

  const handleRemoveItemFromBill = (menuItemId: string, itemUniqueId?: string) => {
    if (!selectedTable) return;
    orderContext.removeItemFromOrder(selectedTable.id, menuItemId, itemUniqueId);
  };

  const handleEditItemInstructions = (item: OrderItem) => {
    setEditingItemForInstructions(item);
    setIsInstructionsModalOpen(true);
  };

  const handleSaveItemInstructions = (instructions: string) => {
    if (editingItemForInstructions && selectedTable) {
      orderContext.updateItemInstructions(selectedTable.id, editingItemForInstructions.menuItemId, instructions, editingItemForInstructions.uniqueId);
    }
    setIsInstructionsModalOpen(false);
    setEditingItemForInstructions(null);
  };


  const handleFinalizeBill = async (
    orderDataFromPanel: Partial<Pick<ClientOrder, 'customerName' | 'customerPhoneNumber' | 'customerWhatsapp' | 'email' | 'customerNotes' | 'kitchenNotes' | 'status' | 'tableNumber' | 'discountAmount' | 'serviceCharge' | 'paymentMethod' | 'transactionId'>> & { discountType?: 'percentage' | 'amount' }
  ) => {
    if (!selectedTable || itemsForActiveSession.length === 0) {
      toast({variant: "destructive", title: "Error", description: "No table selected or bill is empty."});
      return;
    }
    setFormSubmitting(true);
    try {
      const activeSession = billableSessions.find(s => s.key === activeBillSessionKey);
      if (!activeSession) throw new Error("Active bill session not found.");

      const orderPayload: Partial<ClientOrder> = {
        restaurantId,
        tableId: selectedTable.id,
        tableNumber: selectedTable.tableNumber,
        items: itemsForActiveSession,
        groupId: activeSession.isGroup ? activeSession.groupId : null,
        status: orderDataFromPanel.status || currentOrderStatusForPanel || 'payment_pending',
        ...orderDataFromPanel,
      };
      
      if (activeSession.orderId) { 
        await updateFirebaseOrder(restaurantId, activeSession.orderId, orderPayload);
        toast({ title: "Order Updated", description: `${activeSession.displayName} updated.` });
      } else { 
        const newOrder = await createFirebaseOrder(restaurantId, orderPayload);
        toast({ title: "Order Placed", description: `${activeSession.displayName} placed and is now ${newOrder.status}.` });
        if (activeSession.isGroup && activeSession.groupId) {
            const groupRef = doc(db, `restaurants/${restaurantId}/tableGroups`, activeSession.groupId);
            await updateDoc(groupRef, { status: 'ordered', lastOrderId: newOrder.id, updatedAt: serverTimestamp() });
        }
      }
      
      await orderContext.updateTableStatus(selectedTable.id, orderPayload.status === 'completed' ? 'available' : 'occupied');
      
      if (orderPayload.status === 'completed') {
        // If main bill completed, clear its local items and its persisted orderId from context
        if (activeSession.key === 'main_bill' || activeSession.key === 'main_bill_local_only') {
           orderContext.clearOrder(selectedTable.id, null); // Clear local main items
        } else if (activeSession.isGroup && activeSession.groupId) {
            orderContext.clearOrder(selectedTable.id, activeSession.groupId); // Clear local group items
        }
        // Check if all sessions are completed for the table
        const allSessionsCompleted = billableSessions.every(s => {
            if (s.key === activeBillSessionKey) return orderPayload.status === 'completed'; // current one
            const otherOrder = persistedTableOrders.find(o => o.id === s.orderId);
            return otherOrder?.status === 'completed' || (!s.orderId && s.items.length === 0); // other persisted or empty local
        });

        if (allSessionsCompleted) {
          setIsBillPanelVisible(false);
          setSelectedTable(null);
          setActiveBillSessionKey('main_bill');
        } else {
           // Switch to another active session or main_bill if available
          const nextSession = billableSessions.find(s => s.key !== activeBillSessionKey && (s.orderId || s.items.length > 0) ) || billableSessions.find(s => s.key === 'main_bill' || s.key === 'main_bill_local_only');
          setActiveBillSessionKey(nextSession ? nextSession.key : 'main_bill');
        }
      }

    } catch (error: any) {
      toast({ variant: "destructive", title: "Operation Failed", description: error.message || "Could not finalize/update order." });
    } finally {
      setFormSubmitting(false);
    }
  };
  
  const handleSendToKOTForActiveSession = async () => {
    if (!selectedTable || !activeBillSessionKey) return;
    const groupId = activeBillSessionKey.startsWith('group_') ? activeBillSessionKey.replace('group_', '') : null;
    await orderContext.sendOrderToKitchen(selectedTable.id, groupId);
    // Toast is handled within sendOrderToKitchen of context
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
      setTableAreas(updatedAreas.sort((a, b) => (a.order || 0) - (b.order || 0)));
      setIsAreaModalOpen(false);
      setEditingArea(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Area Save Failed", description: error.message });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleTableStatusChange = async (tableId: string, newStatus: FirebaseTableType['status']) => {
    setFormSubmitting(true);
    try {
      await updateTable(restaurantId, tableId, { status: newStatus });
      toast({ title: "Table Status Updated" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to update table status." });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Fix handleAssignWaiterToTable to always pass a string for waiterId
  const handleAssignWaiterToTable = async (tableId: string, waiterId: string | null) => {
    if (!selectedTable) return;
    const waiterName = waiterId ? (WAITERS_DATA.find((w: {id: string; name: string}) => w.id === waiterId)?.name || '') : '';
    await orderContext.assignWaiterToTable(tableId, waiterId || '', waiterName);
  };

  const handleUpdateOrderStatusForSession = async (newStatus: OrderStatus) => {
    if (!restaurantId || !activeBillSessionKey) return;
    const activeSession = billableSessions.find(s => s.key === activeBillSessionKey);
    if (activeSession?.orderId) {
      setFormSubmitting(true);
      try {
        await updateFirebaseOrder(restaurantId, activeSession.orderId, { status: newStatus });
        setCurrentOrderStatusForPanel(newStatus); // Update local state for panel
        toast({title: "Order Status Updated", description: `Order for ${activeSession.displayName} is now ${newStatus}.`})
      } catch (error: any) {
         toast({ variant: "destructive", title: "Status Update Failed", description: error.message });
      } finally {
        setFormSubmitting(false);
      }
    } else {
      setCurrentOrderStatusForPanel(newStatus); // For local/new orders, just update panel state
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
        setTableAreas(updatedAreas.sort((a, b) => (a.order || 0) - (b.order || 0)));
        const currentTables = await fetchTablesFromDb(restaurantId);
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
    return storedQrValue; 
  };
  
  const tableGridPanelClasses = cn(
    "p-1 md:p-4 overflow-y-auto transition-all duration-300 ease-in-out flex-grow",
     isBillPanelVisible ? "w-full md:w-1/2 lg:w-2/5 xl:w-1/3" : "w-full" 
  );

  const billPanelClasses = cn(
    "absolute top-0 right-0 h-[calc(100vh-theme(spacing.16)-theme(spacing.16))] md:relative md:top-0 md:right-0 md:h-full border-l bg-card text-card-foreground overflow-y-auto flex flex-col transition-all duration-300 ease-in-out",
    "w-full md:w-1/2 lg:w-3/5 xl:w-2/3", 
    isBillPanelVisible ? "translate-x-0" : "translate-x-full md:hidden"
  );
  
  const menuSelectionPanelClasses = cn(
    "absolute top-0 left-0 h-full bg-card shadow-xl z-20 transition-transform duration-300 ease-in-out overflow-y-auto border-r",
    "w-full sm:w-[350px] md:w-[320px] lg:w-[380px]", 
    isMenuSelectionPanelOpen ? "transform translate-x-0" : "transform -translate-x-full"
  );

  const tablesByArea: Record<string, { name: string; id: string; tables: FirebaseTableType[] }> = tables.reduce<Record<string, { name: string; id: string; tables: FirebaseTableType[] }>>((acc, table: FirebaseTableType) => {
    const areaKey = table.areaId || '_UNASSIGNED_AREA_';
    if (!acc[areaKey]) {
      acc[areaKey] = { name: table.areaName || 'Unassigned Tables', id: areaKey, tables: [] };
    }
    acc[areaKey].tables.push(table);
    return acc;
  }, {});


  const sortedAreaKeys = Object.keys(tablesByArea).sort((a, b) => {
    if (a === '_UNASSIGNED_AREA_') return 1; 
    if (b === '_UNASSIGNED_AREA_') return -1;
    const areaA = tableAreas.find(area => area.id === a);
    const areaB = tableAreas.find(area => area.id === b);
    return (areaA?.order || 0) - (areaB?.order || 0) || areaA!.name.localeCompare(areaB!.name);
  });


  return (
    <div className="flex h-[calc(100vh-theme(spacing.16)-theme(spacing.16))] overflow-hidden relative">
       {selectedTable && isBillPanelVisible && (
        <div className={menuSelectionPanelClasses}>
          {isMenuSelectionPanelOpen && ( 
            <MenuSelectionForBill
                menuItems={menuItems}
                categories={categories}
                subcategories={subcategories}
                onAddItemToBill={handleAddItemToBill}
                onClosePanel={() => setIsMenuSelectionPanelOpen(false)}
                activeGroupId={activeBillSessionKey?.startsWith('group_') ? activeBillSessionKey.replace('group_', '') : undefined}
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
                                <div className={`grid grid-cols-2 ${
                                    (selectedTable && isBillPanelVisible) 
                                    ? 'sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3' 
                                    : 'sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' 
                                } gap-3`}>
                                {areaInfo.tables.map((table: FirebaseTableType) => (
                                    <Card 
                                    key={table.id} 
                                    className={`flex flex-col shadow-md hover:shadow-lg transition-all group cursor-pointer ${selectedTable?.id === table.id ? 'ring-2 ring-primary shadow-xl scale-105' : 'hover:scale-[1.02]'}`}
                                    onClick={() => handleSelectTable(table)}
                                    >
                                    <CardHeader className="pb-2 pt-3 px-3">
                                        <div className="flex justify-between items-center">
                                            <CardTitle className="text-base sm:text-lg">{table.tableNumber}</CardTitle>
                                            <div className={`h-3 w-3 rounded-full ${statusColors[table.status]}`} title={table.status}></div>
                                        </div>
                                        <CardDescription className="text-xs">Cap: {table.capacity}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow space-y-1.5 text-xs px-3 pb-2">
                                        <Select value={table.status} onValueChange={(newStatus) => handleTableStatusChange(table.id, newStatus as TableStatus)}>
                                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {(Object.keys(statusColors) as TableStatus[]).map(s => <SelectItem key={s} value={s} className="capitalize text-xs">{s.replace('_', ' ')}</SelectItem>)}
                                        </SelectContent>
                                        </Select>
                                    </CardContent>
                                    <CardFooter className="flex justify-between items-center pt-1 pb-2 px-3 mt-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {e.stopPropagation(); setQrModalTable(table)}} title="Show QR Code"><QrCode className="h-3.5 w-3.5 text-muted-foreground hover:text-primary"/></Button>
                                        <div className="space-x-0.5">
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {e.stopPropagation(); openEditModal(table)}} title="Edit Table"><Edit3 className="h-3 w-3 text-muted-foreground hover:text-accent"/></Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {e.stopPropagation(); openDeleteDialog(table, 'table')}} title="Delete Table"><Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive"/></Button>
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
                <BillingPanel
                  billableSessions={billableSessions}
                  activeBillSessionKey={activeBillSessionKey}
                  onSelectSession={setActiveBillSessionKey}
                  itemsForActiveSession={itemsForActiveSession}
                  restaurant={restaurant}
                  categoryMap={categoryMap}
                  isLoading={formSubmitting}
                  onUpdateItemQuantity={handleUpdateItemQuantityInBill}
                  onRemoveItem={handleRemoveItemFromBill}
                  onEditItemInstructions={handleEditItemInstructions}
                  onFinalize={handleFinalizeBill}
                  onSendToKOT={handleSendToKOTForActiveSession}
                  onClose={() => { setIsBillPanelVisible(false); setSelectedTable(null); setActiveBillSessionKey('main_bill'); }}
                  onToggleMenuSelection={() => setIsMenuSelectionPanelOpen(prev => !prev)}
                  isMenuSelectionOpen={isMenuSelectionPanelOpen}
                  showMenuButton
                  showCloseButton
                  finalizeLabel="Accept Payment & Settle"
                  customerName={customerName} setCustomerName={setCustomerName}
                  customerPhoneNumber={customerPhoneNumber} setCustomerPhoneNumber={setCustomerPhoneNumber}
                  customerWhatsapp={customerWhatsapp} setCustomerWhatsapp={setCustomerWhatsapp}
                  email={email} setEmail={setEmail}
                  customerNotes={currentCustomerNotes} setCustomerNotes={setCurrentCustomerNotes}
                  kitchenNotes={currentKitchenNotes} setKitchenNotes={setCurrentKitchenNotes}
                  discountType={discountType} setDiscountType={setDiscountType}
                  discountValue={discountValue} setDiscountValue={setDiscountValue}
                  serviceChargeValue={serviceChargeValue} setServiceChargeValue={setServiceChargeValue}
                  paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
                  transactionId={transactionId} setTransactionId={setTransactionId}
                  selectedTable={selectedTable}
                  onUpdateTableStatus={handleTableStatusChange}
                  onAssignWaiter={handleAssignWaiterToTable}
                  orderStatus={currentOrderStatusForPanel}
                  setOrderStatus={handleUpdateOrderStatusForSession}
                  orderStatusConfig={orderStatusConfig}
                  possibleNextStatuses={currentOrderStatusForPanel ? possibleNextStatusesForOrder[currentOrderStatusForPanel] : []}
                />
            </div>
        )}
      </div>

      {editingItemForInstructions && (
        <EditInstructionsDialog
          isOpen={isInstructionsModalOpen}
          onOpenChange={setIsInstructionsModalOpen}
          itemName={editingItemForInstructions.menuItemName}
          initialInstructions={editingItemForInstructions.instructions || ""}
          onSave={handleSaveItemInstructions}
        />
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
              <FormField
                control={form.control}
                name="areaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area (Optional)</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "_UNASSIGNED_" ? null : value)}
                      value={field.value ?? "_UNASSIGNED_"} 
                    >
                      <FormControl><SelectTrigger><SelectValue placeholder="Assign to an area..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="_UNASSIGNED_">No Area / Unassigned</SelectItem> 
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
                onDone={() => {setEditingArea(null);}}
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
                    <DialogDescription>Customers can scan this to view the menu and order.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-4 space-y-4">
                    <Image 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrModalTable.qrCodeValue)}`} 
                        alt={`QR Code for table ${qrModalTable.tableNumber}`} 
                        width={200} 
                        height={200}
                        className="border rounded-md"
                        data-ai-hint="qr code table"
                        loading="lazy"
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


