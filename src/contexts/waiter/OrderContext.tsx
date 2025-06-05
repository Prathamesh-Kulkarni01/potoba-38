
// src/contexts/waiter/OrderContext.tsx
"use client";

import type { OrderItem, TableStatus, MenuItem, Waiter, HistoricalOrder, TipEntry, Table as FirebaseTableType, MenuCategory, MenuSubcategory, ClientOrder, OrderStatus, OrderItemStatus } from '@/types';
import type React from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { getMenuItems, getMenuCategories, getMenuSubcategories } from '@/lib/firebase/menu';
import { getTables as fetchTablesFromDb, updateTable as updateFirebaseTable } from '@/lib/firebase/tables';
import { createOrder as createFirebaseOrder, updateOrder as updateFirebaseOrder, getOrdersByTable, getOrder, updateOrderItemStatusInFirestore } from '@/lib/firebase/orders';
import { Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface OrderContextType {
  // Dynamic Data
  menuItems: MenuItem[];
  menuCategories: MenuCategory[];
  menuSubcategories: MenuSubcategory[];
  tables: FirebaseTableType[];
  activeOrders: Map<string, OrderItem[]>; 

  // Local Waiter App State
  tableNotes: Map<string, string>;
  tips: TipEntry[];
  orderHistory: Map<string, HistoricalOrder[]>;

  // Core Order Functions
  getOrderForTable: (tableId: string) => OrderItem[];
  addItemToOrder: (tableId: string, menuItem: MenuItem, quantity?: number, instructions?: string, groupId?: string) => void;
  updateItemQuantity: (tableId: string, menuItemId: string, quantity: number, itemInstructions?: string, itemUniqueId?: string) => void;
  updateItemInstructions: (tableId: string, menuItemId: string, instructions: string, itemUniqueId?: string) => void;
  removeItemFromOrder: (tableId: string, menuItemId: string, itemUniqueId?: string) => void;
  removeItemsByGroupId: (tableId: string, groupId: string) => void;
  updateItemStatus: (tableId: string, menuItemId: string, status: OrderItemStatus, itemUniqueId?: string) => Promise<void>;
  clearOrder: (tableId: string) => void;
  sendOrderToKitchen: (tableId: string, isIndividualItemSend?: boolean) => Promise<void>;

  // Table Status & Assignment
  getTableStatus: (tableId: string) => TableStatus;
  updateTableStatus: (tableId: string, status: TableStatus) => Promise<void>;
  assignWaiterToTable: (tableId: string, waiterId: string, waiterName: string) => Promise<void>;
  clearWaiterAssignment: (tableId: string) => Promise<void>;
  getAssignedWaiterInfo: (tableId: string) => { waiterId?: string | null; waiterName?: string | null } | undefined;

  // Calculations
  calculateTotal: (tableId: string, itemsToCalculate?: OrderItem[]) => number;
  getTotalItemsForTable: (tableId: string, itemsToCount?: OrderItem[]) => number;
  getFirstItemAddedTime: (tableId: string) => number | null;

  // Order Archival & History
  archiveOrder: (tableId: string, finalBillAmount?: number, paymentMethod?: HistoricalOrder['paymentMethod'], paymentNote?: string) => Promise<void>;
  getHistoricalOrdersForTable: (tableId: string) => HistoricalOrder[];
  getHistoricalOrderById: (orderId: string) => HistoricalOrder | undefined;
  repeatOrder: (tableId: string, historicalOrderItems: OrderItem[]) => void;

  // Table Notes
  getTableNote: (tableId: string) => string | undefined;
  updateTableNote: (tableId: string, note: string) => void;

  // Tips
  addTip: (amount: number, tableId?: string, notes?: string) => void;

  // Loading states
  isMenuLoading: boolean; 
  isTablesLoading: boolean;
  isSubmittingOrder: boolean;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId;
  const { toast } = useToast();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [menuSubcategories, setMenuSubcategories] = useState<MenuSubcategory[]>([]);
  const [tables, setTables] = useState<FirebaseTableType[]>([]);
  const [activeOrders, setActiveOrders] = useState<Map<string, OrderItem[]>>(() => new Map());

  const [orderHistory, setOrderHistory] = useState<Map<string, HistoricalOrder[]>>(() => new Map());
  const [tableNotes, setTableNotes] = useState<Map<string, string>>(() => new Map());
  const [tips, setTips] = useState<TipEntry[]>(() => []);

  const [isMenuLoading, setIsMenuLoading] = useState(true);
  const [isTablesLoading, setIsTablesLoading] = useState(true);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);


  useEffect(() => {
    if (restaurantId) {
      setIsMenuLoading(true);
      Promise.all([
        getMenuItems(restaurantId),
        getMenuCategories(restaurantId),
        getMenuSubcategories(restaurantId),
      ]).then(([items, categories, subcategories]) => {
        setMenuItems(items);
        setMenuCategories(categories.sort((a, b) => a.order - b.order));
        setMenuSubcategories(subcategories.sort((a, b) => a.order - b.order));
      }).catch(err => {
        toast({ variant: "destructive", title: "Error", description: "Could not load menu data." });
        console.error("Error fetching menu data:", err);
      }).finally(() => setIsMenuLoading(false));
    } else {
      setIsMenuLoading(false);
    }
  }, [restaurantId, toast]);

  useEffect(() => {
    if (restaurantId) {
      setIsTablesLoading(true);
      fetchTablesFromDb(restaurantId)
        .then(fetchedTables => setTables(fetchedTables.sort((a,b) => (a.order || 0) - (b.order || 0) || a.tableNumber.localeCompare(b.tableNumber))))
        .catch(err => toast({ variant: "destructive", title: "Error", description: "Could not load tables." }))
        .finally(() => setIsTablesLoading(false));
    } else {
      setIsTablesLoading(false);
    }
  }, [restaurantId, toast]);

  // Load from localStorage on mount
  useEffect(() => {
    if (restaurantId) {
      const storedActiveOrders = localStorage.getItem(`waiterActiveOrders_${restaurantId}`);
        if (storedActiveOrders) { try {
          const parsedOrdersArray: [string, any[]][] = JSON.parse(storedActiveOrders);
          const newOrdersMap = new Map<string, OrderItem[]>();
          parsedOrdersArray.forEach(([tableId, items]) => {
            newOrdersMap.set(tableId, items.map((item) => ({
              ...item,
              uniqueId: item.uniqueId || `${item.menuItem.id}-${item.createdAt || Date.now()}-${Math.random().toString(36).substring(7)}`,
              status: item.status || 'pending',
              createdAt: item.createdAt || Date.now(),
              updatedAt: item.updatedAt || Date.now(),
              instructions: item.instructions || null,
              notes: item.notes || null,
              groupId: item.groupId || null,
            })));
          });
          setActiveOrders(newOrdersMap);
        } catch (e) { console.error("Failed to parse active orders from localStorage", e); }
      }

      const storedOrderHistory = localStorage.getItem(`waiterOrderHistory_${restaurantId}`);
      if (storedOrderHistory) { try { setOrderHistory(new Map(JSON.parse(storedOrderHistory))); } catch (e) { console.error("Failed to parse order history from localStorage", e); } }

      const storedTableNotes = localStorage.getItem(`waiterTableNotes_${restaurantId}`);
      if (storedTableNotes) { try { setTableNotes(new Map(JSON.parse(storedTableNotes))); } catch (e) { console.error("Failed to parse table notes from localStorage", e); } }

      const storedTips = localStorage.getItem(`waiterTips_${restaurantId}`);
      if (storedTips) { try { setTips(JSON.parse(storedTips)); } catch (e) { console.error("Failed to parse tips from localStorage", e); } }
    }
  }, [restaurantId]);

  // Persist to localStorage on change
  useEffect(() => {
    if (restaurantId) localStorage.setItem(`waiterActiveOrders_${restaurantId}`, JSON.stringify(Array.from(activeOrders.entries())));
  }, [activeOrders, restaurantId]);
  useEffect(() => {
    if (restaurantId) localStorage.setItem(`waiterOrderHistory_${restaurantId}`, JSON.stringify(Array.from(orderHistory.entries())));
  }, [orderHistory, restaurantId]);
  useEffect(() => {
    if (restaurantId) localStorage.setItem(`waiterTableNotes_${restaurantId}`, JSON.stringify(Array.from(tableNotes.entries())));
  }, [tableNotes, restaurantId]);
  useEffect(() => {
    if (restaurantId) localStorage.setItem(`waiterTips_${restaurantId}`, JSON.stringify(tips));
  }, [tips, restaurantId]);

  const getTableNote = useCallback((tableId: string): string | undefined => tableNotes.get(tableId), [tableNotes]);
  const updateTableNote = useCallback((tableId: string, note: string) => {
    setTableNotes(prev => new Map(prev).set(tableId, note.trim()));
  }, []);
  const getOrderForTable = useCallback((tableId: string): OrderItem[] => {
    return activeOrders.get(tableId) || [];
  }, [activeOrders]);
  const getTableStatus = useCallback((tableId: string): TableStatus => {
    return tables.find(t => t.id === tableId)?.status || 'available';
  }, [tables]);

  const calculateTotal = useCallback((tableId: string, itemsToCalculate?: OrderItem[]): number => {
    const items = itemsToCalculate || getOrderForTable(tableId);
    return items.reduce((total, item) => total + (item.menuItem?.price || 0) * item.quantity, 0);
  }, [getOrderForTable]);
  const getTotalItemsForTable = useCallback((tableId: string, itemsToCount?: OrderItem[]): number => {
    const items = itemsToCount || getOrderForTable(tableId);
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [getOrderForTable]);
  const getFirstItemAddedTime = useCallback((tableId: string): number | null => {
    const currentOrder = getOrderForTable(tableId);
    if (currentOrder.length === 0) return null;
    const validTimestamps = currentOrder.map(item => item.createdAt).filter(ts => typeof ts === 'number' && !isNaN(ts));
    return validTimestamps.length > 0 ? Math.min(...validTimestamps) : null;
  }, [getOrderForTable]);

  const updateTableStatus = useCallback(async (tableId: string, status: TableStatus) => {
    if (!restaurantId) return;
    try {
      await updateFirebaseTable(restaurantId, tableId, { status });
      setTables(prevTables => prevTables.map(t => t.id === tableId ? { ...t, status, updatedAt: new Date().toISOString() } : t));
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not update table status." });
      console.error("Error updating table status:", error);
    }
  }, [restaurantId, toast]);

  const addItemToOrder = useCallback((tableId: string, menuItem: MenuItem, quantity: number = 1, instructions?: string, groupId?: string) => {
    setActiveOrders(prevOrders => {
      const newOrders = new Map(prevOrders);
      let currentOrder = newOrders.get(tableId) || [];
      const normalizedGroupId = groupId?.trim() || null;
      const now = Date.now();

      const existingItemIndex = currentOrder.findIndex(item =>
        item.menuItem.id === menuItem.id &&
        (item.instructions || null) === (instructions || null) &&
        item.status === 'pending' &&
        (item.groupId || null) === normalizedGroupId
      );

      if (existingItemIndex > -1) {
        const updatedItem = {
          ...currentOrder[existingItemIndex],
          quantity: currentOrder[existingItemIndex].quantity + quantity,
          totalPrice: (currentOrder[existingItemIndex].quantity + quantity) * currentOrder[existingItemIndex].unitPrice,
          updatedAt: now,
        };
        currentOrder[existingItemIndex] = updatedItem;
      } else {
        const newItemUniqueId = `${menuItem.id}-${now}-${Math.random().toString(36).substring(2,9)}`;
        const newItemData: OrderItem = {
          menuItem,
          quantity,
          status: 'pending',
          createdAt: now,
          updatedAt: now,
          uniqueId: newItemUniqueId,
          instructions: instructions || null,
          notes: null,
          groupId: normalizedGroupId,
          unitPrice: menuItem.price,
          totalPrice: menuItem.price * quantity,
          categoryId: menuItem.categoryId,
          imageUrl: menuItem.imageUrl,
          taxOverrides: menuItem.taxOverrides,
        };
        currentOrder = [...currentOrder, newItemData];
      }
      newOrders.set(tableId, currentOrder);
      return newOrders;
    });
    const currentStatus = getTableStatus(tableId);
    if (currentStatus === 'available' || currentStatus === 'reserved') {
      updateTableStatus(tableId, 'occupied');
    }
  }, [getTableStatus, updateTableStatus]);

  const updateItemQuantity = useCallback((tableId: string, menuItemId: string, quantity: number, itemInstructions?: string, itemUniqueId?: string) => {
    setActiveOrders(prevOrders => {
      const newOrders = new Map(prevOrders);
      const currentOrder = newOrders.get(tableId) || [];
      const itemIndex = currentOrder.findIndex(item => item.uniqueId === itemUniqueId);

      if (itemIndex > -1) {
        if (quantity <= 0) {
          currentOrder.splice(itemIndex, 1);
        } else {
          const updatedItem = {
            ...currentOrder[itemIndex],
            quantity,
            totalPrice: currentOrder[itemIndex].unitPrice * quantity,
            updatedAt: Date.now(),
          };
          currentOrder[itemIndex] = updatedItem;
        }
        newOrders.set(tableId, [...currentOrder]);
        if (currentOrder.length === 0 && getTableStatus(tableId) !== 'paying' && getTableStatus(tableId) !== 'reserved') {
          updateTableStatus(tableId, 'available');
        }
      }
      return newOrders;
    });
  }, [getTableStatus, updateTableStatus]);

  const updateItemInstructions = useCallback((tableId: string, menuItemId: string, instructions: string, itemUniqueId?: string) => {
    setActiveOrders(prevOrders => {
      const newOrders = new Map(prevOrders);
      const currentOrder = newOrders.get(tableId) || [];
      const itemIndex = currentOrder.findIndex(item => item.uniqueId === itemUniqueId);
      if (itemIndex > -1) {
        currentOrder[itemIndex] = { ...currentOrder[itemIndex], instructions: instructions.trim() || null, updatedAt: Date.now() };
        newOrders.set(tableId, [...currentOrder]);
      }
      return newOrders;
    });
  }, []);

  const removeItemFromOrder = useCallback((tableId: string, menuItemId: string, itemUniqueId?: string) => {
    setActiveOrders(prevOrders => {
      const newOrders = new Map(prevOrders);
      let currentOrder = newOrders.get(tableId) || [];
      const updatedOrder = currentOrder.filter(item => item.uniqueId !== itemUniqueId);
      newOrders.set(tableId, updatedOrder);
      if (updatedOrder.length === 0 && getTableStatus(tableId) !== 'paying' && getTableStatus(tableId) !== 'reserved') {
        updateTableStatus(tableId, 'available');
      }
      return newOrders;
    });
  }, [getTableStatus, updateTableStatus]);

  const removeItemsByGroupId = useCallback((tableId: string, groupId: string) => {
    setActiveOrders(prevOrders => {
      const newOrders = new Map(prevOrders);
      let currentOrder = newOrders.get(tableId) || [];
      const normalizedGroupId = groupId?.trim() || null;
      const updatedOrder = currentOrder.filter(item => (item.groupId || null) !== normalizedGroupId);
      newOrders.set(tableId, updatedOrder);
      if (updatedOrder.length === 0 && getTableStatus(tableId) !== 'paying' && getTableStatus(tableId) !== 'reserved') {
        updateTableStatus(tableId, 'available');
      } else if (updatedOrder.length > 0 && getTableStatus(tableId) === 'paying') {
        updateTableStatus(tableId, 'occupied');
      }
      return newOrders;
    });
  }, [getTableStatus, updateTableStatus]);

  const checkAndUpdateOverallOrderStatus = useCallback(async (orderRestaurantId: string, orderId: string) => {
    if (!orderRestaurantId || !orderId) return;
    try {
      const firestoreOrder = await getOrder(orderRestaurantId, orderId);
      if (firestoreOrder && firestoreOrder.items && firestoreOrder.items.length > 0) {
        const allItemsEffectivelyServedOrCancelled = firestoreOrder.items.every(item =>
          item.status === 'served' || item.status === 'cancelled_by_customer' || item.status === 'cancelled_by_kitchen'
        );
        const hasAtLeastOneServedItem = firestoreOrder.items.some(item => item.status === 'served');

        let newOverallStatus: OrderStatus | null = null;

        if (allItemsEffectivelyServedOrCancelled && hasAtLeastOneServedItem) {
            newOverallStatus = 'payment_pending';
        } else if (firestoreOrder.items.some(item => item.status === 'preparing' || item.status === 'ready_for_pickup')) {
            newOverallStatus = 'preparing'; // Or more specific based on item mix
        } else if (firestoreOrder.items.some(item => item.status === 'confirmed_by_kitchen')) {
            newOverallStatus = 'confirmed_by_kitchen';
        } else if (firestoreOrder.items.every(item => item.status === 'cancelled_by_customer' || item.status === 'cancelled_by_kitchen')) {
            newOverallStatus = 'cancelled_by_restaurant'; // Or customer, depending on who initiated the last cancel
        }
        
        if (newOverallStatus && newOverallStatus !== firestoreOrder.status) {
          await updateFirebaseOrder(orderRestaurantId, orderId, { status: newOverallStatus });
          toast({ title: "Overall Order Status Updated", description: `Order #${orderId.substring(0,6)} status is now ${newOverallStatus}.` });
          const tableForOrder = tables.find(t => t.id === firestoreOrder.tableId);
          if (tableForOrder && newOverallStatus === 'payment_pending') {
             updateTableStatus(tableForOrder.id, 'paying');
          } else if (tableForOrder && (newOverallStatus === 'completed' || newOverallStatus === 'cancelled_by_customer' || newOverallStatus === 'cancelled_by_restaurant')) {
             const otherActiveOrders = await getOrdersByTable(orderRestaurantId, tableForOrder.id, ['pending_kitchen', 'confirmed_by_kitchen', 'preparing', 'ready_for_pickup', 'served', 'payment_pending']);
             if (otherActiveOrders.filter(o => o.id !== orderId).length === 0) { 
                updateTableStatus(tableForOrder.id, 'available');
             }
          }
        }
      }
    } catch (error) {
      console.error("Error checking/updating overall order status:", error);
      toast({ variant: "destructive", title: "Order Sync Issue", description: "Could not update overall order status." });
    }
  }, [tables, updateTableStatus, toast]);

  const sendOrderToKitchen = useCallback(async (tableId: string, isIndividualItemSend: boolean = false) => {
    if (!restaurantId || !user?.uid) {
      toast({ variant: "destructive", title: "Error", description: "Cannot send order without restaurant/user context." });
      return;
    }
    const allLocalItemsForTable = getOrderForTable(tableId);
    const itemsToSyncToKitchen = allLocalItemsForTable.filter(item => item.status === 'pending' || (isIndividualItemSend && item.status === 'sent_to_kitchen')); 
    
    if (itemsToSyncToKitchen.length === 0 && !isIndividualItemSend) {
      toast({ title: "No New Items", description: "No pending items to send to the kitchen." });
      return;
    }
    
    if (itemsToSyncToKitchen.length === 0 && isIndividualItemSend) {
        console.log("sendOrderToKitchen called for individual item, but no items to sync.");
        return;
    }

    setIsSubmittingOrder(true);
    try {
      const activeFirebaseOrders = await getOrdersByTable(restaurantId, tableId, ['pending_kitchen', 'confirmed_by_kitchen', 'preparing', 'ready_for_pickup', 'served', 'payment_pending']);
      let targetOrderId: string | undefined;

      const itemsToSaveInFirebase = allLocalItemsForTable.map(localItem => ({
        ...localItem,
        status: localItem.status === 'pending' ? 'sent_to_kitchen' : localItem.status, 
        updatedAt: Date.now(), 
      }));

      const tableInfo = tables.find(t => t.id === tableId);

      if (activeFirebaseOrders.length > 0) {
        targetOrderId = activeFirebaseOrders[0].id;
        
        const existingFirestoreItems = activeFirebaseOrders[0].items;
        const mergedItems = [...existingFirestoreItems];

        itemsToSaveInFirebase.forEach(localItem => {
            const existingIndex = mergedItems.findIndex(fi => fi.uniqueId === localItem.uniqueId);
            if (existingIndex > -1) {
                mergedItems[existingIndex] = { ...mergedItems[existingIndex], ...localItem}; 
            } else {
                mergedItems.push(localItem); 
            }
        });
        
        await updateFirebaseOrder(restaurantId, targetOrderId, {
          items: mergedItems,
          status: 'pending_kitchen', 
          kitchenNotes: getTableNote(tableId) || null,
          updatedAt: serverTimestamp() as Timestamp, 
        });
      } else {
        const newOrder = await createFirebaseOrder(restaurantId, {
          userId: user.uid,
          restaurantId,
          tableId,
          tableNumber: tableInfo?.tableNumber || null,
          items: itemsToSaveInFirebase,
          subtotal: 0, 
          totalAmount: 0, 
          status: 'pending_kitchen',
          kitchenNotes: getTableNote(tableId) || null,
        });
        targetOrderId = newOrder.id;
      }

      setActiveOrders(prevOrders => {
        const newOrders = new Map(prevOrders);
        const currentLocalOrder = newOrders.get(tableId) || [];
        const updatedLocalOrder = currentLocalOrder.map(item =>
          (item.status === 'pending' || (isIndividualItemSend && itemsToSyncToKitchen.some(si => si.uniqueId === item.uniqueId))) 
            ? { ...item, status: 'sent_to_kitchen' as OrderItemStatus, updatedAt: Date.now() } 
            : item
        );
        newOrders.set(tableId, updatedLocalOrder);
        return newOrders;
      });

      toast({ title: "Order Sent/Updated", description: `${itemsToSyncToKitchen.length} item(s) synced with kitchen.` });
      if (targetOrderId) {
        await checkAndUpdateOverallOrderStatus(restaurantId, targetOrderId);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to Send/Update Order", description: error.message });
      console.error("Error sending/updating order:", error);
    } finally {
      setIsSubmittingOrder(false);
    }
  }, [restaurantId, user?.uid, getOrderForTable, getTableNote, tables, toast, checkAndUpdateOverallOrderStatus]);

  const updateItemStatus = useCallback(async (tableId: string, menuItemId: string, status: OrderItemStatus, itemUniqueId?: string) => {
    if (!restaurantId || !user?.uid) {
      toast({ variant: "destructive", title: "Error", description: "Cannot update item status without context." });
      return;
    }

    let orderIdToUpdateInFirestore: string | null = null;
    setActiveOrders(prevOrders => {
      const newOrders = new Map(prevOrders);
      const currentOrder = newOrders.get(tableId) || [];
      const itemIndex = currentOrder.findIndex(item => item.uniqueId === itemUniqueId);
      if (itemIndex > -1) {
        currentOrder[itemIndex] = { ...currentOrder[itemIndex], status, updatedAt: Date.now() };
        newOrders.set(tableId, [...currentOrder]);
      }
      return newOrders;
    });

    try {
      const activeFirebaseOrders = await getOrdersByTable(restaurantId, tableId, ['pending_kitchen', 'confirmed_by_kitchen', 'preparing', 'ready_for_pickup', 'served', 'payment_pending']);
      const orderContainingItem = activeFirebaseOrders.find(o => o.items.some(i => i.uniqueId === itemUniqueId));

      if (orderContainingItem) {
        orderIdToUpdateInFirestore = orderContainingItem.id;
        await updateOrderItemStatusInFirestore(restaurantId, orderIdToUpdateInFirestore, itemUniqueId!, status);
      } else if (status === 'sent_to_kitchen') {
        await sendOrderToKitchen(tableId, true); 
        return; 
      } else {
        console.warn(`OrderContext: No active Firebase order found for table ${tableId} containing item ${itemUniqueId} to update its status to ${status}. Local status update only.`);
      }
      
      if(orderIdToUpdateInFirestore){
        await checkAndUpdateOverallOrderStatus(restaurantId, orderIdToUpdateInFirestore);
      }

    } catch (error: any) {
      toast({ variant: "destructive", title: "Firestore Sync Error", description: `Could not sync item status: ${error.message}` });
    }
  }, [restaurantId, user?.uid, toast, checkAndUpdateOverallOrderStatus, sendOrderToKitchen]);


  const clearOrder = useCallback((tableId: string) => {
    setActiveOrders(prevOrders => {
      const newOrders = new Map(prevOrders);
      newOrders.delete(tableId);
      return newOrders;
    });
    if (getTableStatus(tableId) !== 'reserved' && getTableStatus(tableId) !== 'paying') {
      updateTableStatus(tableId, 'available');
    }
  }, [getTableStatus, updateTableStatus]);


  const assignWaiterToTable = useCallback(async (tableId: string, waiterId: string, waiterName: string) => {
    if (!restaurantId) return;
    try {
      await updateFirebaseTable(restaurantId, tableId, { assignedWaiterId: waiterId, assignedWaiterName: waiterName });
      setTables(prev => prev.map(t => t.id === tableId ? { ...t, assignedWaiterId: waiterId, assignedWaiterName: waiterName, updatedAt: new Date().toISOString() } : t));
      toast({ title: "Waiter Assigned", description: `${waiterName} assigned to table.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to assign waiter." });
    }
  }, [restaurantId, toast]);

  const clearWaiterAssignment = useCallback(async (tableId: string) => {
    if (!restaurantId) return;
    try {
      await updateFirebaseTable(restaurantId, tableId, { assignedWaiterId: null, assignedWaiterName: null });
      setTables(prev => prev.map(t => t.id === tableId ? { ...t, assignedWaiterId: null, assignedWaiterName: null, updatedAt: new Date().toISOString() } : t));
      toast({ title: "Waiter Unassigned" });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to unassign waiter." });
    }
  }, [restaurantId, toast]);

  const getAssignedWaiterInfo = useCallback((tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    return table ? { waiterId: table.assignedWaiterId, waiterName: table.assignedWaiterName } : undefined;
  }, [tables]);


  const archiveOrder = useCallback(async (tableId: string, finalBillAmount?: number, paymentMethod?: HistoricalOrder['paymentMethod'], paymentNote?: string) => {
    if (!restaurantId) return;
    const itemsToArchive = getOrderForTable(tableId);
    if (itemsToArchive.length === 0) return;

    setIsSubmittingOrder(true);
    try {
      const actualTotalAmount = finalBillAmount ?? calculateTotal(tableId, itemsToArchive);

      const activeFirebaseOrders = await getOrdersByTable(restaurantId, tableId, ['pending_kitchen', 'confirmed_by_kitchen', 'preparing', 'ready_for_pickup', 'served', 'payment_pending']);
      if (activeFirebaseOrders.length > 0) {
        const orderToFinalize = activeFirebaseOrders[0];
        await updateFirebaseOrder(restaurantId, orderToFinalize.id, {
          status: 'completed',
          totalAmount: actualTotalAmount, 
          paymentMethod: paymentMethod || null,
          customerNotes: paymentNote ? `${orderToFinalize.customerNotes || ''} Payment Note: ${paymentNote}`.trim() : (orderToFinalize.customerNotes || null),
          items: orderToFinalize.items.map(item => ({ ...item, status: 'served' })), 
          updatedAt: serverTimestamp() as Timestamp,
        });
      } else {
        console.warn(`WaiterContext: No active Firebase order found for table ${tableId} to mark as completed when archiving.`);
      }

      const historicalOrder: HistoricalOrder = {
        id: `hist-${tableId}-${Date.now()}`,
        originalTableId: tableId,
        items: JSON.parse(JSON.stringify(itemsToArchive.map(item => ({ ...item, status: 'served' as OrderItemStatus, instructions: item.instructions || null, groupId: item.groupId || null })))),
        completedAt: Date.now(),
        totalAmount: actualTotalAmount,
        paymentMethod: paymentMethod || null,
        paymentNote: paymentNote || null,
      };

      setOrderHistory(prevHistory => {
        const newHistory = new Map(prevHistory);
        const tableHistory = newHistory.get(tableId) || [];
        newHistory.set(tableId, [historicalOrder, ...tableHistory].slice(0, 10));
        return newHistory;
      });

      clearOrder(tableId);
      await updateTableStatus(tableId, 'available'); 
      toast({ title: "Order Archived & Table Cleared" });
    } catch (error) {
      toast({ variant: "destructive", title: "Archival Failed", description: "Could not archive order." });
      console.error("Error archiving order:", error);
    } finally {
      setIsSubmittingOrder(false);
    }
  }, [restaurantId, getOrderForTable, clearOrder, updateTableStatus, calculateTotal, toast]);


  const getHistoricalOrdersForTable = useCallback((tableId: string): HistoricalOrder[] => {
    return (orderHistory.get(tableId) || []).sort((a, b) => b.completedAt - a.completedAt);
  }, [orderHistory]);

  const getHistoricalOrderById = useCallback((orderId: string): HistoricalOrder | undefined => {
    for (const tableHistory of orderHistory.values()) {
      const foundOrder = tableHistory.find(order => order.id === orderId);
      if (foundOrder) return foundOrder;
    }
    return undefined;
  }, [orderHistory]);

  const repeatOrder = useCallback((tableId: string, historicalOrderItems: OrderItem[]) => {
    historicalOrderItems.forEach(histItem => {
      addItemToOrder(tableId, histItem.menuItem, histItem.quantity, histItem.instructions || undefined, histItem.groupId || undefined);
    });
    const currentStatus = getTableStatus(tableId);
    if (currentStatus === 'available' || currentStatus === 'reserved') {
      updateTableStatus(tableId, 'occupied');
    }
  }, [addItemToOrder, getTableStatus, updateTableStatus]);

  const addTip = useCallback((amount: number, tableId?: string, notes?: string) => {
    setTips(prev => [...prev, { id: `tip-${Date.now()}`, amount, timestamp: Date.now(), tableId: tableId || null, notes: notes || null }]);
  }, []);


  const contextValue = useMemo(() => ({
    menuItems, menuCategories, menuSubcategories, tables, activeOrders, orderHistory, tableNotes, tips,
    getOrderForTable, addItemToOrder, updateItemQuantity, updateItemInstructions, removeItemFromOrder, removeItemsByGroupId,
    updateItemStatus, clearOrder, sendOrderToKitchen,
    getTableStatus, updateTableStatus,
    assignWaiterToTable, clearWaiterAssignment, getAssignedWaiterInfo,
    calculateTotal, getTotalItemsForTable, getFirstItemAddedTime,
    archiveOrder, getHistoricalOrdersForTable, getHistoricalOrderById, repeatOrder,
    getTableNote, updateTableNote, addTip,
    isMenuLoading, isTablesLoading, isSubmittingOrder,
  }), [
    menuItems, menuCategories, menuSubcategories, tables, activeOrders, orderHistory, tableNotes, tips,
    getOrderForTable, addItemToOrder, updateItemQuantity, updateItemInstructions, removeItemFromOrder, removeItemsByGroupId,
    updateItemStatus, clearOrder, sendOrderToKitchen,
    getTableStatus, updateTableStatus,
    assignWaiterToTable, clearWaiterAssignment, getAssignedWaiterInfo,
    calculateTotal, getTotalItemsForTable, getFirstItemAddedTime,
    archiveOrder, getHistoricalOrdersForTable, getHistoricalOrderById, repeatOrder,
    getTableNote, updateTableNote, addTip,
    isMenuLoading, isTablesLoading, isSubmittingOrder,
  ]);

  return <OrderContext.Provider value={contextValue}>{children}</OrderContext.Provider>;
};

export const useOrders = (): OrderContextType => {
  const context = useContext(OrderContext);
  if (context === undefined) throw new Error('useOrders must be used within an OrderProvider');
  return context;
};

