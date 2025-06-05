
// src/contexts/waiter/OrderContext.tsx
"use client";

import type { OrderItem, TableStatus, MenuItem, Waiter, HistoricalOrder, TipEntry, Table as FirebaseTableType, MenuCategory, MenuSubcategory, ClientOrder, OrderStatus, OrderItemStatus } from '@/types';
import type React from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth/context';
import { getMenuItems, getMenuCategories, getMenuSubcategories } from '@/lib/firebase/menu';
import { getTables as fetchTablesFromDb, updateTable as updateFirebaseTable } from '@/lib/firebase/tables';
import { 
  createOrder as createFirebaseOrder, 
  updateOrder as updateFirebaseOrder, 
  getOrdersByTable, 
  getOrder, 
  updateOrderItemStatusInFirestore,
  deriveOverallOrderStatus, // Import the derivation function
  sanitizeOrderItem // Import for local item construction
} from '@/lib/firebase/orders';
import { serverTimestamp, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface OrderContextType {
  // Dynamic Data
  menuItems: MenuItem[];
  menuCategories: MenuCategory[];
  menuSubcategories: MenuSubcategory[];
  tables: FirebaseTableType[];
  activeOrders: Map<string, OrderItem[]>; // Local draft/active items per table
  activeFirestoreOrderIds: Map<string, string | null>; // Tracks Firestore order ID for active table orders

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
  updateItemStatus: (tableId: string, itemUniqueId: string, status: OrderItemStatus) => Promise<void>; // itemUniqueId is mandatory
  clearOrder: (tableId: string) => void;
  sendOrderToKitchen: (tableId: string) => Promise<void>;


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
  const [activeFirestoreOrderIds, setActiveFirestoreOrderIds] = useState<Map<string, string | null>>(() => new Map());

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
            newOrdersMap.set(tableId, items.map((itemData) => sanitizeOrderItem(itemData as Partial<OrderItem>)));
          });
          setActiveOrders(newOrdersMap);
        } catch (e) { console.error("Failed to parse active orders from localStorage", e); }
      }
      const storedFirestoreOrderIds = localStorage.getItem(`waiterFirestoreOrderIds_${restaurantId}`);
      if (storedFirestoreOrderIds) { try { setActiveFirestoreOrderIds(new Map(JSON.parse(storedFirestoreOrderIds))); } catch(e) { console.error("Failed to parse Firestore Order IDs", e);}}

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
    if (restaurantId) localStorage.setItem(`waiterFirestoreOrderIds_${restaurantId}`, JSON.stringify(Array.from(activeFirestoreOrderIds.entries())));
  }, [activeFirestoreOrderIds, restaurantId]);
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
    return items.reduce((total, item) => total + (item.menuItem?.price || item.unitPrice || 0) * item.quantity, 0);
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
          totalPrice: (currentOrder[existingItemIndex].quantity + quantity) * (currentOrder[existingItemIndex].menuItem.price || 0),
          updatedAt: now,
        };
        currentOrder[existingItemIndex] = updatedItem;
      } else {
        const newItemData = sanitizeOrderItem({ // Use sanitizeOrderItem here
          menuItemId: menuItem.id,
          menuItemName: menuItem.name,
          quantity,
          unitPrice: menuItem.price,
          totalPrice: menuItem.price * quantity,
          status: 'pending',
          instructions: instructions || null,
          groupId: normalizedGroupId,
          createdAt: now,
          updatedAt: now,
          imageUrl: menuItem.imageUrl || null,
          categoryId: menuItem.categoryId,
          taxOverrides: menuItem.taxOverrides || null,
          // menuItem: menuItem, // Keep for local display if needed, sanitizeOrderItem will handle Firestore structure
        });
        // Store full menuItem object locally for UI convenience
        currentOrder = [...currentOrder, { ...newItemData, menuItem }];
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
            totalPrice: (currentOrder[itemIndex].menuItem.price || 0) * quantity,
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

  const checkAndUpdateOverallOrderStatusAndTable = useCallback(async (orderRestaurantId: string, orderId: string) => {
    if (!orderRestaurantId || !orderId) return;
    try {
      const firestoreOrder = await getOrder(orderRestaurantId, orderId); // Fetches ClientOrder
      if (firestoreOrder && firestoreOrder.items && firestoreOrder.items.length > 0) {
        const newOverallStatus = deriveOverallOrderStatus(firestoreOrder.items);
        
        if (newOverallStatus !== firestoreOrder.status) {
          await updateFirebaseOrder(orderRestaurantId, orderId, { status: newOverallStatus });
          toast({ title: "Overall Order Status Updated", description: `Order #${orderId.substring(0,6)} status is now ${newOverallStatus}.` });
        }

        // Update local table status based on the new overall order status
        const tableForOrder = tables.find(t => t.id === firestoreOrder.tableId);
        if (tableForOrder) {
            if (newOverallStatus === 'payment_pending' && tableForOrder.status !== 'paying') {
                updateTableStatus(tableForOrder.id, 'paying');
            } else if ((newOverallStatus === 'completed' || newOverallStatus === 'cancelled_by_restaurant' || newOverallStatus === 'cancelled_by_customer')) {
                // Check if there are any other active orders for this table before setting to available
                const otherActiveOrders = await getOrdersByTable(orderRestaurantId, tableForOrder.id, ['pending_kitchen', 'confirmed_by_kitchen', 'preparing', 'ready_for_pickup', 'served', 'payment_pending']);
                if (otherActiveOrders.filter(o => o.id !== orderId).length === 0 && tableForOrder.status !== 'reserved') {
                   updateTableStatus(tableForOrder.id, 'available');
                }
            } else if (newOverallStatus !== 'pending_customer_confirmation' && newOverallStatus !== 'completed' && newOverallStatus !== 'cancelled_by_customer' && newOverallStatus !== 'cancelled_by_restaurant' && tableForOrder.status === 'available') {
                updateTableStatus(tableForOrder.id, 'occupied');
            }
        }
      }
    } catch (error) {
      console.error("Error checking/updating overall order status:", error);
      toast({ variant: "destructive", title: "Order Sync Issue", description: "Could not update overall order status and table." });
    }
  }, [tables, updateTableStatus, toast]);

  const updateItemStatus = useCallback(async (tableId: string, itemUniqueId: string, newStatus: OrderItemStatus) => {
    if (!restaurantId || !user?.uid) {
      toast({ variant: "destructive", title: "Auth Error", description: "Cannot update item status." });
      return;
    }

    let localItemToUpdate: OrderItem | undefined;
    setActiveOrders(prev => {
      const newMap = new Map(prev);
      const items = newMap.get(tableId) || [];
      const itemIndex = items.findIndex(i => i.uniqueId === itemUniqueId);
      if (itemIndex > -1) {
        localItemToUpdate = { ...items[itemIndex], status: newStatus, updatedAt: Date.now() };
        items[itemIndex] = localItemToUpdate;
        newMap.set(tableId, [...items]);
      }
      return newMap;
    });

    if (!localItemToUpdate) {
      console.error(`Could not find item ${itemUniqueId} locally to update status.`);
      return;
    }
    
    const currentFirestoreOrderId = activeFirestoreOrderIds.get(tableId);

    setIsSubmittingOrder(true);
    try {
      if (currentFirestoreOrderId) {
        // Order exists in Firestore, update the specific item
        await updateOrderItemStatusInFirestore(restaurantId, currentFirestoreOrderId, itemUniqueId, newStatus);
        await checkAndUpdateOverallOrderStatusAndTable(restaurantId, currentFirestoreOrderId);
      } else if (newStatus === 'sent_to_kitchen') {
        // First item being sent, create new order
        const itemsToSend = getOrderForTable(tableId).filter(item => item.status === 'sent_to_kitchen' || item.status === 'pending' /* if sendOrderToKitchen wasn't called first */);
        if (itemsToSend.length > 0) {
          const tableInfo = tables.find(t => t.id === tableId);
          const firestoreOrderItems = itemsToSend.map(li => sanitizeOrderItem({
            ...li, // contains full menuItem object locally
            menuItemId: li.menuItem.id, // ensure these are from the menuItem
            menuItemName: li.menuItem.name,
            unitPrice: li.menuItem.price,
            totalPrice: li.menuItem.price * li.quantity,
            status: 'sent_to_kitchen', // Force status
          } as Partial<OrderItem>));

          const newOrderData = {
            userId: user.uid,
            tableId,
            tableNumber: tableInfo?.tableNumber || null,
            items: firestoreOrderItems,
            status: deriveOverallOrderStatus(firestoreOrderItems), // Derive status based on these items
            kitchenNotes: getTableNote(tableId) || null,
          };
          const createdOrder = await createFirebaseOrder(restaurantId, newOrderData);
          setActiveFirestoreOrderIds(prev => new Map(prev).set(tableId, createdOrder.id));
          await checkAndUpdateOverallOrderStatusAndTable(restaurantId, createdOrder.id);
        }
      }
      toast({ title: "Item Status Synced", description: `${localItemToUpdate.menuItemName} status updated.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sync Error", description: `Failed to sync item status: ${error.message}` });
      // Revert local state if needed (complex, consider error state for item)
    } finally {
      setIsSubmittingOrder(false);
    }
  }, [restaurantId, user?.uid, activeFirestoreOrderIds, getOrderForTable, tables, getTableNote, toast, checkAndUpdateOverallOrderStatusAndTable]);

  const sendOrderToKitchen = useCallback(async (tableId: string) => {
    if (!restaurantId || !user?.uid) {
      toast({ variant: "destructive", title: "Error", description: "Cannot send order." });
      return;
    }
    const localItemsForTable = getOrderForTable(tableId);
    const pendingItems = localItemsForTable.filter(item => item.status === 'pending');

    if (pendingItems.length === 0) {
      toast({ title: "No New Items", description: "All items already sent or processed." });
      return;
    }

    setIsSubmittingOrder(true);
    try {
      for (const item of pendingItems) {
        // This will trigger individual sync or order creation logic in updateItemStatus
        await updateItemStatus(tableId, item.uniqueId, 'sent_to_kitchen');
      }
      toast({ title: "Order Sent to Kitchen", description: `${pendingItems.length} item(s) have been sent.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Send Failed", description: `Could not send items to kitchen: ${error.message}` });
    } finally {
      setIsSubmittingOrder(false);
    }
  }, [restaurantId, user?.uid, getOrderForTable, updateItemStatus, toast]);
  

  const clearOrder = useCallback((tableId: string) => {
    const currentFirestoreOrderId = activeFirestoreOrderIds.get(tableId);
    if (currentFirestoreOrderId) {
      // If there's an active order in Firestore, we might want to cancel it.
      // For now, just clearing local. A more robust clear would interact with Firestore.
      console.warn(`Clearing local order for table ${tableId} which has an active Firestore order ${currentFirestoreOrderId}. Consider cancelling the Firestore order.`);
    }
    setActiveOrders(prevOrders => {
      const newOrders = new Map(prevOrders);
      newOrders.delete(tableId);
      return newOrders;
    });
    setActiveFirestoreOrderIds(prev => {
      const newMap = new Map(prev);
      newMap.delete(tableId);
      return newMap;
    });
    if (getTableStatus(tableId) !== 'reserved' && getTableStatus(tableId) !== 'paying') {
      updateTableStatus(tableId, 'available');
    }
  }, [activeFirestoreOrderIds, getTableStatus, updateTableStatus]);


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
      const firestoreOrderId = activeFirestoreOrderIds.get(tableId);

      if (firestoreOrderId) {
        const currentFirestoreOrder = await getOrder(restaurantId, firestoreOrderId);
        if (currentFirestoreOrder) {
            const updatedFirestoreItems = currentFirestoreOrder.items.map(item => 
                sanitizeOrderItem({ ...item, status: 'served' })
            );
            const finalDerivedStatus = deriveOverallOrderStatus(updatedFirestoreItems); // Should be 'payment_pending' or 'completed'
            await updateFirebaseOrder(restaurantId, firestoreOrderId, {
            status: 'completed', // Force completed on archive
            totalAmount: actualTotalAmount,
            paymentMethod: paymentMethod || null,
            customerNotes: paymentNote ? `${currentFirestoreOrder.customerNotes || ''} Payment Note: ${paymentNote}`.trim() : (currentFirestoreOrder.customerNotes || null),
            items: updatedFirestoreItems,
            updatedAt: serverTimestamp() as Timestamp,
            });
        }
      } else {
        console.warn(`WaiterContext: No active Firestore order found for table ${tableId} to mark as completed when archiving. Creating historical record locally.`);
      }

      const historicalOrder: HistoricalOrder = {
        id: firestoreOrderId || `hist-${tableId}-${Date.now()}`,
        originalTableId: tableId,
        items: JSON.parse(JSON.stringify(itemsToArchive.map(item => sanitizeOrderItem({ ...item, status: 'served', menuItem: undefined } )))),
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

      clearOrder(tableId); // This also resets activeFirestoreOrderIds for the table
      await updateTableStatus(tableId, 'available');
      toast({ title: "Order Archived & Table Cleared" });
    } catch (error) {
      toast({ variant: "destructive", title: "Archival Failed", description: "Could not archive order." });
      console.error("Error archiving order:", error);
    } finally {
      setIsSubmittingOrder(false);
    }
  }, [restaurantId, getOrderForTable, clearOrder, updateTableStatus, calculateTotal, toast, activeFirestoreOrderIds]);


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
      const fullMenuItem = menuItems.find(mi => mi.id === histItem.menuItemId);
      if (fullMenuItem) {
        addItemToOrder(tableId, fullMenuItem, histItem.quantity, histItem.instructions || undefined, histItem.groupId || undefined);
      } else {
        console.warn(`Cannot repeat item ${histItem.menuItemName} (ID: ${histItem.menuItemId}) as it's not found in the current menuItems list.`);
      }
    });
    const currentStatus = getTableStatus(tableId);
    if (currentStatus === 'available' || currentStatus === 'reserved') {
      updateTableStatus(tableId, 'occupied');
    }
  }, [addItemToOrder, getTableStatus, updateTableStatus, menuItems]);

  const addTip = useCallback((amount: number, tableId?: string, notes?: string) => {
    setTips(prev => [...prev, { id: `tip-${Date.now()}`, amount, timestamp: Date.now(), tableId: tableId || null, notes: notes || null }]);
  }, []);


  const contextValue = useMemo(() => ({
    menuItems, menuCategories, menuSubcategories, tables, activeOrders, activeFirestoreOrderIds, orderHistory, tableNotes, tips,
    getOrderForTable, addItemToOrder, updateItemQuantity, updateItemInstructions, removeItemFromOrder, removeItemsByGroupId,
    updateItemStatus, clearOrder, sendOrderToKitchen,
    getTableStatus, updateTableStatus,
    assignWaiterToTable, clearWaiterAssignment, getAssignedWaiterInfo,
    calculateTotal, getTotalItemsForTable, getFirstItemAddedTime,
    archiveOrder, getHistoricalOrdersForTable, getHistoricalOrderById, repeatOrder,
    getTableNote, updateTableNote, addTip,
    isMenuLoading, isTablesLoading, isSubmittingOrder,
  }), [
    menuItems, menuCategories, menuSubcategories, tables, activeOrders, activeFirestoreOrderIds, orderHistory, tableNotes, tips,
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

```
  </change>

  <change>
    <file>/src/app/dashboard/restaurant/[restaurantId]/kitchen/page.tsx</file>
    <content><![CDATA[
'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { updateOrderItemStatusInFirestore, deriveOverallOrderStatus } from '@/lib/firebase/orders'; // Added deriveOverallOrderStatus
import { getOrdersCollectionPath, convertFirebaseTimestampToString } from '@/lib/firebase/utils';
import type { OrderStatus as OverallOrderStatus, ClientOrder, OrderItemStatus, OrderItem } from '@/types'; // Added OrderItem
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase/config';
import { collection, query, where, orderBy, onSnapshot, Timestamp, doc, runTransaction } from 'firebase/firestore'; // Added doc, runTransaction
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNowStrict, parseISO, differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import KitchenOrderTicket from '@/components/kds/KitchenOrderTicket';
import { BellRing, Utensils, ChefHat, CheckCircle, Settings2 } from 'lucide-react'; 
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { KDS_ITEM_STATUS_CONFIG, KDS_OVERALL_STATUS_TABS_CONFIG } from '@/config/kdsConfig';

const toClientOrder = (docId: string, data: any): ClientOrder => {
  const orderBase: Omit<ClientOrder, 'id' | 'createdAt' | 'updatedAt'> = {
    restaurantId: data.restaurantId, userId: data.userId, tableId: data.tableId || null, tableNumber: data.tableNumber || null,
    items: (data.items || []).map((item: any) => ({
        ...item,
        uniqueId: item.uniqueId || `${item.menuItemId}-${item.createdAt || Date.now()}-${Math.random().toString(36).substring(7)}`,
        status: item.status || 'sent_to_kitchen', // Default if somehow missing
        createdAt: typeof item.createdAt === 'number' ? item.createdAt : (item.createdAt?.toDate?.().getTime() || Date.now()),
        updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : (item.updatedAt?.toDate?.().getTime() || Date.now()),
    })),
    subtotal: data.subtotal, totalAmount: data.totalAmount, status: data.status as OverallOrderStatus,
    taxAmount: typeof data.taxAmount === 'number' ? data.taxAmount : undefined, serviceCharge: typeof data.serviceCharge === 'number' ? data.serviceCharge : undefined,
    discountAmount: typeof data.discountAmount === 'number' ? data.discountAmount : undefined, customerNotes: typeof data.customerNotes === 'string' ? data.customerNotes : undefined,
    kitchenNotes: typeof data.kitchenNotes === 'string' ? data.kitchenNotes : undefined, paymentMethod: typeof data.paymentMethod === 'string' ? data.paymentMethod : undefined,
    transactionId: typeof data.transactionId === 'string' ? data.transactionId : undefined, customerName: typeof data.customerName === 'string' ? data.customerName : undefined,
    customerPhoneNumber: typeof data.customerPhoneNumber === 'string' ? data.customerPhoneNumber : undefined,
  };
  return { id: docId, ...orderBase, createdAt: convertFirebaseTimestampToString(data.createdAt), updatedAt: convertFirebaseTimestampToString(data.updatedAt) };
};

export default function KitchenDisplaySystemPage() {
  const params = useParams();
  const restaurantId = params.restaurantId as string;
  const { toast } = useToast();
  const [allKitchenOrders, setAllKitchenOrders] = useState<ClientOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeKdsTabKey, setActiveKdsTabKey] = useState<keyof typeof KDS_OVERALL_STATUS_TABS_CONFIG>('new');
  const [updatingItems, setUpdatingItems] = useState<Record<string, boolean>>({});

  const newOrderSoundRef = typeof Audio !== "undefined" ? new Audio('/sounds/kds-new-order.mp3') : null;
  const itemReadySoundRef = typeof Audio !== "undefined" ? new Audio('/sounds/kds-item-ready.mp3') : null; // Add a sound for ready items

  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);


  useEffect(() => {
    if (!restaurantId || !db) return;
    setLoading(true);
    const ordersColRef = collection(db, getOrdersCollectionPath(restaurantId));
    
    // Listen to orders that are not yet fully completed or cancelled by customer
    const relevantOverallStatuses: OverallOrderStatus[] = [
      'pending_kitchen', 'confirmed_by_kitchen', 'preparing', 'ready_for_pickup'
    ];
    
    const q = query(
      ordersColRef,
      where('status', 'in', relevantOverallStatuses),
      orderBy('createdAt', 'asc') // Oldest orders first
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const previousOrderIds = new Set(allKitchenOrders.map(o => o.id));
      const fetchedOrders = snapshot.docs.map(docSnap => toClientOrder(docSnap.id, docSnap.data()));
      
      const newOrdersJustArrived = fetchedOrders.filter(fo => !previousOrderIds.has(fo.id) && (fo.status === 'pending_kitchen' || fo.status === 'confirmed_by_kitchen'));

      if (newOrdersJustArrived.length > 0 && audioEnabled && newOrderSoundRef) {
         newOrderSoundRef.play().catch(e => console.warn("KDS new order sound play failed:", e));
      }
      setAllKitchenOrders(fetchedOrders);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching KDS orders:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load kitchen orders." });
      setLoading(false);
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, toast]);

  const handleItemStatusChange = useCallback(async (orderId: string, itemUniqueId: string, newStatus: OrderItemStatus) => {
    setUpdatingItems(prev => ({ ...prev, [itemUniqueId]: true }));
    try {
      await updateOrderItemStatusInFirestore(restaurantId, orderId, itemUniqueId, newStatus); // This will also derive and update overall order status
      toast({ title: "Item Status Updated", description: `Item marked as ${KDS_ITEM_STATUS_CONFIG[newStatus]?.label || newStatus}.` });
       if (newStatus === 'ready_for_pickup' && audioEnabled && itemReadySoundRef) {
        itemReadySoundRef.play().catch(e => console.warn("KDS item ready sound play failed:", e));
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message || "Could not update item status." });
    } finally {
      setUpdatingItems(prev => ({ ...prev, [itemUniqueId]: false }));
    }
  }, [restaurantId, toast, audioEnabled, itemReadySoundRef]);


  const filteredOrders = useMemo(() => {
    const tabConfig = KDS_OVERALL_STATUS_TABS_CONFIG[activeKdsTabKey];
    return allKitchenOrders.filter(order => {
        // Filter by overall order status first
        if (!tabConfig.statuses.includes(order.status)) {
            return false;
        }
        // For 'new' and 'preparing' tabs, ensure there are actually items matching item-level criteria
        if (activeKdsTabKey === 'new') {
            return order.items.some(item => item.status === 'sent_to_kitchen' || item.status === 'confirmed_by_kitchen');
        }
        if (activeKdsTabKey === 'preparing') {
            return order.items.some(item => item.status === 'preparing');
        }
        // For 'ready' tab, ensure AT LEAST ONE item is ready_for_pickup and not all are served/cancelled.
        // The overall order status 'ready_for_pickup' should ideally mean this.
        if (activeKdsTabKey === 'ready') {
            return order.items.some(item => item.status === 'ready_for_pickup') && 
                   !order.items.every(item => item.status === 'served' || item.status === 'cancelled_by_customer' || item.status === 'cancelled_by_kitchen');
        }
        return true; 
    });
  }, [activeKdsTabKey, allKitchenOrders]);


  return (
    <div className="h-screen flex flex-col bg-muted/20 print:bg-white">
      <header className="bg-card border-b shadow-sm p-3 sticky top-0 z-30 print:hidden">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
          <h1 className="text-lg sm:text-xl font-bold text-primary flex items-center self-start sm:self-center">
             <ChefHat className="mr-2 h-5 w-5 sm:h-6 sm:w-6" /> Kitchen Display System
          </h1>
          <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-2">
            <Tabs value={activeKdsTabKey} onValueChange={(value) => setActiveKdsTabKey(value as keyof typeof KDS_OVERALL_STATUS_TABS_CONFIG)} className="flex-grow sm:flex-grow-0">
              <TabsList className="grid grid-cols-3 gap-0.5 h-9 w-full sm:w-auto">
                {(Object.keys(KDS_OVERALL_STATUS_TABS_CONFIG) as Array<keyof typeof KDS_OVERALL_STATUS_TABS_CONFIG>).map(tabKey => {
                  const TabIcon = KDS_OVERALL_STATUS_TABS_CONFIG[tabKey].icon;
                  return (
                    <TabsTrigger key={tabKey} value={tabKey} className="text-xs px-1.5 sm:px-2 py-1 h-full flex items-center gap-1 sm:gap-1.5">
                      <TabIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4"/> 
                      <span className="hidden sm:inline">{KDS_OVERALL_STATUS_TABS_CONFIG[tabKey].label}</span>
                      <span className="sm:hidden">{KDS_OVERALL_STATUS_TABS_CONFIG[tabKey].shortLabel || KDS_OVERALL_STATUS_TABS_CONFIG[tabKey].label}</span>
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </Tabs>
            <Button variant="ghost" size="icon" onClick={() => setShowSettingsModal(true)} className="text-muted-foreground hover:text-primary">
                <Settings2 size={20}/>
                <span className="sr-only">KDS Settings</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-grow overflow-y-auto p-2 sm:p-3 md:p-4 print:p-0">
        {loading ? (
          <div className="flex justify-center items-center h-full"><LoadingSpinner className="w-12 h-12 text-primary" /></div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
            <CheckCircle size={64} className="mb-4 text-green-500" />
            <p className="text-xl font-semibold">All caught up!</p>
            <p>No orders currently in the "{KDS_OVERALL_STATUS_TABS_CONFIG[activeKdsTabKey].label}" queue.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3 print:grid-cols-2 print:gap-2">
            {filteredOrders.map(order => (
              <KitchenOrderTicket
                key={order.id}
                order={order}
                onItemStatusChange={handleItemStatusChange}
                updatingItems={updatingItems}
                itemStatusConfig={KDS_ITEM_STATUS_CONFIG}
              />
            ))}
          </div>
        )}
      </main>
       {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center print:hidden" onClick={() => setShowSettingsModal(false)}>
          <Card className="w-full max-w-sm m-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>KDS Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <label htmlFor="audio-toggle" className="text-sm font-medium">Enable Sound Notifications</label>
                <input type="checkbox" id="audio-toggle" checked={audioEnabled} onChange={(e) => setAudioEnabled(e.target.checked)} className="toggle toggle-primary"/>
              </div>
               <p className="text-xs text-muted-foreground">More settings like display density, theme, etc. can be added here.</p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => setShowSettingsModal(false)} className="w-full">Close</Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}

    