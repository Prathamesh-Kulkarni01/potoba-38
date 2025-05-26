
// src/contexts/waiter/OrderContext.tsx
"use client";

import type { OrderItem, TableStatus, MenuItem, Waiter, HistoricalOrder, TipEntry, Table as FirebaseTableType, MenuCategory, MenuSubcategory, ClientOrder, OrderStatus } from '@/types';
import type React from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { getMenuItems, getMenuCategories, getMenuSubcategories } from '@/lib/firebase/menu';
import { getTables as fetchTablesFromDb, updateTable as updateFirebaseTable } from '@/lib/firebase/tables';
import { createOrder as createFirebaseOrder, updateOrder as updateFirebaseOrder, getOrdersByTable, getOrder } from '@/lib/firebase/orders'; // Added getOrder
import { Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface OrderContextType {
  // Dynamic Data
  menuItems: MenuItem[];
  menuCategories: MenuCategory[];
  menuSubcategories: MenuSubcategory[];
  tables: FirebaseTableType[];
  activeOrders: Map<string, OrderItem[]>; // Local draft orders for tables

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
  updateItemStatus: (tableId: string, menuItemId: string, status: OrderItem['status'], itemUniqueId?: string) => Promise<void>;
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
  isMenuLoading: boolean; // For menu items, categories, subcategories
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
        setMenuCategories(categories);
        setMenuSubcategories(subcategories);
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
        .then(setTables)
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
              instructions: item.instructions || null,
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
        };
        currentOrder[existingItemIndex] = updatedItem;
      } else {
        const newItemUniqueId = `${menuItem.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const newItemData: OrderItem = {
          menuItem,
          quantity,
          status: 'pending',
          createdAt: Date.now(),
          instructions: instructions || null,
          uniqueId: newItemUniqueId,
          groupId: normalizedGroupId,
          unitPrice: menuItem.price,
          totalPrice: menuItem.price * quantity,
          // Ensure optional fields from MenuItem are carried over if needed for display or logic
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
            totalPrice: currentOrder[itemIndex].unitPrice * quantity
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
        currentOrder[itemIndex] = { ...currentOrder[itemIndex], instructions: instructions.trim() || null };
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
        const allItemsServed = firestoreOrder.items.every(item => item.status === 'served');
        if (allItemsServed && firestoreOrder.status !== 'completed' && firestoreOrder.status !== 'payment_pending') {
          await updateFirebaseOrder(orderRestaurantId, orderId, { status: 'payment_pending' });
          toast({ title: "Order Ready for Payment", description: `All items for order #${orderId.substring(0,6)} served. Order status updated.` });
          // If table exists in local state, update its status
          const tableForOrder = tables.find(t => t.id === firestoreOrder.tableId);
          if (tableForOrder) {
             updateTableStatus(tableForOrder.id, 'paying');
          }
        }
      }
    } catch (error) {
      console.error("Error checking/updating overall order status:", error);
      toast({ variant: "destructive", title: "Order Sync Issue", description: "Could not update overall order status." });
    }
  }, [tables, updateTableStatus, toast]);


  const updateItemStatus = useCallback(async (tableId: string, menuItemId: string, status: OrderItem['status'], itemUniqueId?: string) => {
    if (!restaurantId) {
      toast({ variant: "destructive", title: "Error", description: "Restaurant context is missing." });
      return;
    }

    let localItemBeforeUpdate: OrderItem | undefined;
    let orderToUpdateId: string | undefined;

    setActiveOrders(prevOrders => {
      const newOrders = new Map(prevOrders);
      const currentOrder = newOrders.get(tableId) || [];
      const itemIndex = currentOrder.findIndex(item => item.uniqueId === itemUniqueId);
      if (itemIndex > -1) {
        localItemBeforeUpdate = { ...currentOrder[itemIndex] };
        currentOrder[itemIndex] = { ...currentOrder[itemIndex], status };
        newOrders.set(tableId, [...currentOrder]);
      }
      return newOrders;
    });

    if (localItemBeforeUpdate && localItemBeforeUpdate.status !== 'pending') {
      try {
        const activeFirebaseOrders = await getOrdersByTable(restaurantId, tableId, ['pending_kitchen', 'confirmed_by_kitchen', 'preparing', 'ready_for_pickup', 'served', 'payment_pending']);
        const orderContainingItem = activeFirebaseOrders.find(o => o.items.some(i => i.uniqueId === itemUniqueId));
        orderToUpdateId = orderContainingItem?.id;

        if (orderToUpdateId) {
          const updatedFirebaseItems = orderContainingItem.items.map(firebaseItem =>
            firebaseItem.uniqueId === itemUniqueId ? { ...firebaseItem, status } : firebaseItem
          );
          await updateFirebaseOrder(restaurantId, orderToUpdateId, { items: updatedFirebaseItems });
          console.log(`Firestore: Item ${itemUniqueId} in order ${orderToUpdateId} status updated to ${status}`);
          // After successful individual item update in Firestore, check overall order status
          await checkAndUpdateOverallOrderStatus(restaurantId, orderToUpdateId);
        } else {
          console.warn(`OrderContext: No active Firebase order found for table ${tableId} containing item ${itemUniqueId} to update its status.`);
        }
      } catch (error: any) {
        toast({ variant: "destructive", title: "Firestore Sync Error", description: `Could not sync item status: ${error.message}` });
        // Optionally revert local state if Firestore update fails critically
        // This requires storing the original localOrders map or specific item state to revert to.
      }
    }
  }, [restaurantId, toast, checkAndUpdateOverallOrderStatus]);


  const sendOrderToKitchen = useCallback(async (tableId: string) => {
    if (!restaurantId || !user?.uid) {
      toast({ variant: "destructive", title: "Error", description: "Cannot send order without restaurant/user context." });
      return;
    }
    const allLocalItemsForTable = getOrderForTable(tableId);
    if (allLocalItemsForTable.length === 0) {
      toast({ title: "Empty Order", description: "No items to send to the kitchen." });
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const activeFirebaseOrders = await getOrdersByTable(restaurantId, tableId, ['pending_kitchen', 'confirmed_by_kitchen', 'preparing', 'ready_for_pickup', 'served', 'payment_pending']);
      let targetOrderId: string | undefined;

      const itemsToSyncToFirebase = allLocalItemsForTable.map(localItem => ({
        menuItemId: localItem.menuItem.id,
        menuItemName: localItem.menuItem.name,
        quantity: localItem.quantity,
        unitPrice: localItem.unitPrice,
        totalPrice: localItem.totalPrice,
        instructions: localItem.instructions || null,
        groupId: localItem.groupId || null,
        status: localItem.status === 'pending' ? 'sent_to_kitchen' : localItem.status,
        createdAt: localItem.createdAt || Date.now(),
        uniqueId: localItem.uniqueId || `${localItem.menuItem.id}-${Date.now()}`,
        variantChoices: localItem.variantChoices || null,
        imageUrl: (localItem.menuItem as any).imageUrl || null,
        categoryId: (localItem.menuItem as any).categoryId || null,
        taxOverrides: (localItem.menuItem as any).taxOverrides || null,
      }));

      const subtotal = itemsToSyncToFirebase.reduce((sum, item) => sum + item.totalPrice, 0);
      const totalAmount = subtotal; // Tax will be calculated in create/update order functions

      const tableInfo = tables.find(t => t.id === tableId);

      if (activeFirebaseOrders.length > 0) {
        const orderToUpdate = activeFirebaseOrders.find(o => o.status !== 'completed' && o.status !== 'cancelled_by_customer' && o.status !== 'cancelled_by_restaurant') || activeFirebaseOrders[0];
        targetOrderId = orderToUpdate.id;

        const updatedItems = [...orderToUpdate.items];
        itemsToSyncToFirebase.forEach(syncItem => {
            const existingIndex = updatedItems.findIndex(i => i.uniqueId === syncItem.uniqueId);
            if(existingIndex > -1) {
                updatedItems[existingIndex] = { ...updatedItems[existingIndex], ...syncItem}; // Merge, syncItem takes precedence
            } else {
                updatedItems.push(syncItem);
            }
        });

        await updateFirebaseOrder(restaurantId, targetOrderId, {
          items: updatedItems,
          // subtotal, totalAmount are re-calculated by updateOrder based on items
          status: 'pending_kitchen', // Force back to pending_kitchen if resending, or derive based on current item statuses
          kitchenNotes: getTableNote(tableId) || null,
        });
      } else {
        await createFirebaseOrder(restaurantId, {
          userId: user.uid,
          restaurantId,
          tableId,
          tableNumber: tableInfo?.tableNumber || null,
          items: itemsToSyncToFirebase,
          subtotal, // Will be recalculated
          totalAmount, // Will be recalculated
          status: 'pending_kitchen',
          kitchenNotes: getTableNote(tableId) || null,
        });
      }

      setActiveOrders(prevOrders => {
        const newOrders = new Map(prevOrders);
        const currentOrder = newOrders.get(tableId) || [];
        const updatedDraftOrder = currentOrder.map(item =>
          item.status === 'pending' ? { ...item, status: 'sent_to_kitchen' as OrderItem['status'] } : item
        );
        newOrders.set(tableId, updatedDraftOrder);
        return newOrders;
      });

      toast({ title: "Order Sent to Kitchen", description: `${allLocalItemsForTable.length} item(s) processed.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to Send Order", description: error.message });
      console.error("Error sending order to kitchen:", error);
    } finally {
      setIsSubmittingOrder(false);
    }
  }, [restaurantId, user?.uid, getOrderForTable, getTableNote, tables, toast, updateTableStatus]);


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

      // Find active Firebase order for this table and update its status to 'completed'
      const activeFirebaseOrders = await getOrdersByTable(restaurantId, tableId, ['pending_kitchen', 'confirmed_by_kitchen', 'preparing', 'ready_for_pickup', 'served', 'payment_pending']);
      if (activeFirebaseOrders.length > 0) {
        // Assuming one primary active order per table for this flow
        const orderToFinalize = activeFirebaseOrders[0];
        await updateFirebaseOrder(restaurantId, orderToFinalize.id, {
          status: 'completed',
          totalAmount: actualTotalAmount, // Update with final calculated amount
          paymentMethod: paymentMethod || null,
          customerNotes: paymentNote ? `${orderToFinalize.customerNotes || ''} Payment Note: ${paymentNote}`.trim() : (orderToFinalize.customerNotes || null),
          items: orderToFinalize.items.map(item => ({ ...item, status: 'served' })), // Mark all items as served in the final record
        });
      } else {
        // If no active order in Firestore, something is off, or it was purely local. Log warning.
        console.warn(`WaiterContext: No active Firebase order found for table ${tableId} to mark as completed when archiving.`);
      }

      const historicalOrder: HistoricalOrder = {
        id: `hist-${tableId}-${Date.now()}`,
        originalTableId: tableId,
        items: JSON.parse(JSON.stringify(itemsToArchive.map(item => ({ ...item, status: 'served' as OrderItem['status'], instructions: item.instructions || null, groupId: item.groupId || null })))),
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


    