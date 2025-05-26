
// src/contexts/waiter/OrderContext.tsx
"use client";

import type { OrderItem, TableStatus, MenuItem, Waiter, HistoricalOrder, TipEntry, Table as FirebaseTableType } from '@/lib/types';
import type React from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { getMenuItems } from '@/lib/firebase/menu';
import { getTables as fetchTablesFromDb, updateTable as updateFirebaseTable } from '@/lib/firebase/tables';
import { createOrder as createFirebaseOrder, updateOrder as updateFirebaseOrder, getOrdersByTable } from '@/lib/firebase/orders';
import { Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface OrderContextType {
  // Dynamic Data
  menuItems: MenuItem[];
  tables: FirebaseTableType[];
  activeOrders: Map<string, OrderItem[]>; // tableId -> current draft/active items for that table for waiter
  
  // Local Waiter App State (persisted to localStorage for now)
  tableNotes: Map<string, string>; // tableId -> note string
  tips: TipEntry[];
  orderHistory: Map<string, HistoricalOrder[]>; // tableId -> array of historical orders for that table

  // Core Order Functions (will interact with Firebase)
  getOrderForTable: (tableId: string) => OrderItem[]; // Gets items from `activeOrders` map
  addItemToOrder: (tableId: string, menuItem: MenuItem, quantity?: number, instructions?: string, groupId?: string) => void;
  updateItemQuantity: (tableId: string, menuItemId: string, quantity: number, itemInstructions?: string, itemUniqueId?: string) => void;
  updateItemInstructions: (tableId: string, menuItemId: string, instructions: string, itemUniqueId?: string) => void;
  removeItemFromOrder: (tableId: string, menuItemId: string, itemUniqueId?: string) => void;
  removeItemsByGroupId: (tableId: string, groupId: string) => void; // For group payments
  updateItemStatus: (tableId: string, menuItemId: string, status: OrderItem['status'], itemUniqueId?: string) => void;
  clearOrder: (tableId: string) => void; // Clears items from `activeOrders` for a table
  sendOrderToKitchen: (tableId: string) => Promise<void>; // Creates/updates order in Firestore

  // Table Status & Assignment (reads from `tables` state, updates Firebase)
  getTableStatus: (tableId: string) => TableStatus;
  updateTableStatus: (tableId: string, status: TableStatus) => Promise<void>;
  assignWaiterToTable: (tableId: string, waiterId: string, waiterName: string) => Promise<void>;
  clearWaiterAssignment: (tableId: string) => Promise<void>;
  getAssignedWaiterInfo: (tableId: string) => { waiterId?: string | null; waiterName?: string | null } | undefined;
  
  // Calculations
  calculateTotal: (tableId: string, itemsToCalculate?: OrderItem[]) => number;
  getTotalItemsForTable: (tableId: string, itemsToCount?: OrderItem[]) => number;
  getFirstItemAddedTime: (tableId: string) => number | null;

  // Order Archival & History (interacts with Firebase for creating historical, reads from local for display)
  archiveOrder: (tableId: string, finalBillAmount?: number, paymentMethod?: HistoricalOrder['paymentMethod'], paymentNote?: string) => Promise<void>;
  getHistoricalOrdersForTable: (tableId: string) => HistoricalOrder[];
  getHistoricalOrderById: (orderId: string) => HistoricalOrder | undefined;
  repeatOrder: (tableId: string, historicalOrderItems: OrderItem[]) => void;

  // Table Notes (local state for now)
  getTableNote: (tableId: string) => string | undefined;
  updateTableNote: (tableId: string, note: string) => void;

  // Tips (local state for now)
  addTip: (amount: number, tableId?: string, notes?: string) => void;

  // Loading states
  isMenuLoading: boolean;
  isTablesLoading: boolean;
  isSubmittingOrder: boolean; // For sendOrderToKitchen, archiveOrder
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId;
  const { toast } = useToast();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<FirebaseTableType[]>([]);
  const [activeOrders, setActiveOrders] = useState<Map<string, OrderItem[]>>(() => new Map());
  
  const [orderHistory, setOrderHistory] = useState<Map<string, HistoricalOrder[]>>(() => new Map());
  const [tableNotes, setTableNotes] = useState<Map<string, string>>(() => new Map());
  const [tips, setTips] = useState<TipEntry[]>(() => []);

  const [isMenuLoading, setIsMenuLoading] = useState(true);
  const [isTablesLoading, setIsTablesLoading] = useState(true);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Define tableNotes related functions early
  const getTableNote = useCallback((tableId: string): string | undefined => tableNotes.get(tableId), [tableNotes]);
  const updateTableNote = useCallback((tableId: string, note: string) => {
    setTableNotes(prev => new Map(prev).set(tableId, note.trim()));
  }, []);

  // Fetch Menu Items
  useEffect(() => {
    if (restaurantId) {
      setIsMenuLoading(true);
      getMenuItems(restaurantId)
        .then(setMenuItems)
        .catch(err => toast({ variant: "destructive", title: "Error", description: "Could not load menu items." }))
        .finally(() => setIsMenuLoading(false));
    }
  }, [restaurantId, toast]);

  // Fetch Tables
  useEffect(() => {
    if (restaurantId) {
      setIsTablesLoading(true);
      fetchTablesFromDb(restaurantId)
        .then(setTables)
        .catch(err => toast({ variant: "destructive", title: "Error", description: "Could not load tables." }))
        .finally(() => setIsTablesLoading(false));
    }
  }, [restaurantId, toast]);

  // Load local state from localStorage
  useEffect(() => {
    const storedActiveOrders = localStorage.getItem(`waiterActiveOrders_${restaurantId}`);
    if (storedActiveOrders) {
      try {
        const parsedOrdersArray: [string, any[]][] = JSON.parse(storedActiveOrders);
        const newOrdersMap = new Map<string, OrderItem[]>();
        parsedOrdersArray.forEach(([tableId, items]) => {
          newOrdersMap.set(tableId, items.map((item) => ({
            ...item,
            uniqueId: item.uniqueId || `${item.menuItem.id}-${item.createdAt || Date.now()}-${Math.random().toString(36).substring(7)}`,
            status: item.status || 'pending',
            createdAt: item.createdAt || Date.now(),
            instructions: item.instructions || undefined,
            groupId: item.groupId || undefined,
          })));
        });
        setActiveOrders(newOrdersMap);
      } catch (e) { console.error("Failed to parse active orders from localStorage", e); }
    }
    const storedOrderHistory = localStorage.getItem(`waiterOrderHistory_${restaurantId}`);
    if (storedOrderHistory) {
      try {
        setOrderHistory(new Map(JSON.parse(storedOrderHistory)));
      } catch (e) { console.error("Failed to parse order history from localStorage", e); }
    }
    const storedTableNotes = localStorage.getItem(`waiterTableNotes_${restaurantId}`);
    if (storedTableNotes) {
      try {
        setTableNotes(new Map(JSON.parse(storedTableNotes)));
      } catch (e) { console.error("Failed to parse table notes from localStorage", e); }
    }
    const storedTips = localStorage.getItem(`waiterTips_${restaurantId}`);
    if (storedTips) {
      try {
        setTips(JSON.parse(storedTips));
      } catch (e) { console.error("Failed to parse tips from localStorage", e); }
    }
  }, [restaurantId]);

  // Persist local state to localStorage
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

  const getOrderForTable = useCallback((tableId: string): OrderItem[] => {
    return activeOrders.get(tableId) || [];
  }, [activeOrders]);

  const getTableStatus = useCallback((tableId: string): TableStatus => {
    return tables.find(t => t.id === tableId)?.status || 'available';
  }, [tables]);

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
      const normalizedGroupId = groupId?.trim() || undefined;

      const existingItemIndex = currentOrder.findIndex(item =>
        item.menuItem.id === menuItem.id &&
        (item.instructions || '') === (instructions || '') &&
        item.status === 'pending' && 
        (item.groupId || undefined) === normalizedGroupId
      );

      if (existingItemIndex > -1) {
        const updatedItem = {
          ...currentOrder[existingItemIndex],
          quantity: currentOrder[existingItemIndex].quantity + quantity
        };
        currentOrder[existingItemIndex] = updatedItem;
      } else {
        const newItemUniqueId = `${menuItem.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const newItemData: OrderItem = {
            menuItem,
            quantity,
            status: 'pending',
            createdAt: Date.now(),
            instructions: instructions || undefined,
            uniqueId: newItemUniqueId,
            groupId: normalizedGroupId,
            unitPrice: menuItem.price, 
            totalPrice: menuItem.price * quantity,
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
          const updatedItem = { ...currentOrder[itemIndex], quantity, totalPrice: currentOrder[itemIndex].unitPrice * quantity };
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
        currentOrder[itemIndex] = { ...currentOrder[itemIndex], instructions: instructions.trim() || undefined };
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
        const normalizedGroupId = groupId?.trim() || undefined;
        const updatedOrder = currentOrder.filter(item => (item.groupId || undefined) !== normalizedGroupId);
        newOrders.set(tableId, updatedOrder);
        if (updatedOrder.length === 0 && getTableStatus(tableId) !== 'paying' && getTableStatus(tableId) !== 'reserved') {
            updateTableStatus(tableId, 'available');
        } else if (updatedOrder.length > 0 && getTableStatus(tableId) === 'paying') {
            updateTableStatus(tableId, 'occupied');
        }
        return newOrders;
    });
  }, [getTableStatus, updateTableStatus]);

  const updateItemStatus = useCallback((tableId: string, menuItemId: string, status: OrderItem['status'], itemUniqueId?: string) => {
    setActiveOrders(prevOrders => {
      const newOrders = new Map(prevOrders);
      const currentOrder = newOrders.get(tableId) || [];
      const itemIndex = currentOrder.findIndex(item => item.uniqueId === itemUniqueId);
      if (itemIndex > -1) {
        currentOrder[itemIndex] = { ...currentOrder[itemIndex], status };
        newOrders.set(tableId, [...currentOrder]);
      }
      return newOrders;
    });
  }, []);
  
  const clearOrder = useCallback((tableId: string) => {
    setActiveOrders(prevOrders => {
      const newOrders = new Map(prevOrders);
      newOrders.delete(tableId);
      return newOrders;
    });
    if (getTableStatus(tableId) !== 'reserved') {
      updateTableStatus(tableId, 'available');
    }
  }, [getTableStatus, updateTableStatus]);

  const sendOrderToKitchen = useCallback(async (tableId: string) => {
    if (!restaurantId || !user?.uid) {
      toast({ variant: "destructive", title: "Error", description: "Cannot send order without restaurant/user context." });
      return;
    }
    const itemsToSend = getOrderForTable(tableId).filter(item => item.status === 'pending');
    if (itemsToSend.length === 0) {
      toast({ title: "No Pending Items", description: "No new items to send to the kitchen." });
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const existingFirebaseOrders = await getOrdersByTable(restaurantId, tableId, ['pending_kitchen', 'confirmed_by_kitchen', 'preparing', 'ready_for_pickup', 'served']);
      let targetOrderId: string | undefined;
      let existingOrderItems: OrderItem[] = [];

      if (existingFirebaseOrders.length > 0) {
        const notYetServedOrder = existingFirebaseOrders.find(o => o.status !== 'served');
        const orderToUpdate = notYetServedOrder || existingFirebaseOrders[0];
        targetOrderId = orderToUpdate.id;
        existingOrderItems = orderToUpdate.items;
      }
      
      const updatedItemsForFirebase = [...existingOrderItems];
      itemsToSend.forEach(draftItem => {
          const existingDbItemIndex = updatedItemsForFirebase.findIndex(dbItem => 
            dbItem.menuItemId === draftItem.menuItem.id &&
            (dbItem.instructions || '') === (draftItem.instructions || '') &&
            (dbItem.groupId || undefined) === (draftItem.groupId || undefined)
          );
          if (existingDbItemIndex > -1) {
            updatedItemsForFirebase[existingDbItemIndex].quantity += draftItem.quantity;
            updatedItemsForFirebase[existingDbItemIndex].totalPrice = updatedItemsForFirebase[existingDbItemIndex].quantity * updatedItemsForFirebase[existingDbItemIndex].unitPrice;
          } else {
            updatedItemsForFirebase.push({
                menuItemId: draftItem.menuItem.id,
                menuItemName: draftItem.menuItem.name,
                quantity: draftItem.quantity,
                unitPrice: draftItem.menuItem.price,
                totalPrice: draftItem.menuItem.price * draftItem.quantity,
                instructions: draftItem.instructions,
                groupId: draftItem.groupId,
            });
          }
      });

      const subtotal = updatedItemsForFirebase.reduce((sum, item) => sum + item.totalPrice, 0);
      const totalAmount = subtotal; 

      if (targetOrderId) {
        await updateFirebaseOrder(restaurantId, targetOrderId, {
          items: updatedItemsForFirebase,
          subtotal,
          totalAmount,
          status: 'pending_kitchen', 
          kitchenNotes: getTableNote(tableId) || undefined,
        });
      } else {
        const tableInfo = tables.find(t => t.id === tableId);
        await createFirebaseOrder(restaurantId, {
          userId: user.uid,
          restaurantId,
          tableId,
          tableNumber: tableInfo?.tableNumber || null,
          items: updatedItemsForFirebase,
          subtotal,
          totalAmount,
          status: 'pending_kitchen',
          kitchenNotes: getTableNote(tableId) || undefined,
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

      toast({ title: "Order Sent to Kitchen", description: `${itemsToSend.length} item(s) sent.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to Send Order", description: error.message });
      console.error("Error sending order to kitchen:", error);
    } finally {
      setIsSubmittingOrder(false);
    }
  }, [restaurantId, user?.uid, getOrderForTable, getTableNote, tables, toast]);


  const assignWaiterToTable = useCallback(async (tableId: string, waiterId: string, waiterName: string) => {
    if (!restaurantId) return;
    try {
      await updateFirebaseTable(restaurantId, tableId, { assignedWaiterId: waiterId, assignedWaiterName: waiterName });
      setTables(prev => prev.map(t => t.id === tableId ? {...t, assignedWaiterId: waiterId, assignedWaiterName: waiterName, updatedAt: new Date().toISOString()} : t));
      toast({ title: "Waiter Assigned", description: `${waiterName} assigned to table.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to assign waiter." });
    }
  }, [restaurantId, toast]);

  const clearWaiterAssignment = useCallback(async (tableId: string) => {
    if (!restaurantId) return;
    try {
      await updateFirebaseTable(restaurantId, tableId, { assignedWaiterId: null, assignedWaiterName: null });
      setTables(prev => prev.map(t => t.id === tableId ? {...t, assignedWaiterId: null, assignedWaiterName: null, updatedAt: new Date().toISOString()} : t));
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
          const orderToUpdate = activeFirebaseOrders[0]; 
          await updateFirebaseOrder(restaurantId, orderToUpdate.id, {
              status: 'completed',
              totalAmount: actualTotalAmount, 
              paymentMethod: paymentMethod || undefined,
              customerNotes: paymentNote ? `${orderToUpdate.customerNotes || ''} Payment Note: ${paymentNote}`.trim() : orderToUpdate.customerNotes,
          });
      } else {
          console.warn(`No active Firebase order found for table ${tableId} to mark as completed.`);
      }

      const historicalOrder: HistoricalOrder = {
        id: `hist-${tableId}-${Date.now()}`,
        originalTableId: tableId,
        items: JSON.parse(JSON.stringify(itemsToArchive.map(item => ({...item, status: 'served' as OrderItem['status']})))) ,
        completedAt: Date.now(),
        totalAmount: actualTotalAmount,
        paymentMethod: paymentMethod,
        paymentNote: paymentNote,
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
    } catch(error) {
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
        addItemToOrder(tableId, histItem.menuItem, histItem.quantity, histItem.instructions, histItem.groupId);
    });
    const currentStatus = getTableStatus(tableId);
    if (currentStatus === 'available' || currentStatus === 'reserved') {
        updateTableStatus(tableId, 'occupied');
    }
  }, [addItemToOrder, getTableStatus, updateTableStatus]);

  const addTip = useCallback((amount: number, tableId?: string, notes?: string) => {
    setTips(prev => [...prev, { id: `tip-${Date.now()}`, amount, timestamp: Date.now(), tableId, notes }]);
  }, []);

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

  const contextValue = useMemo(() => ({
    menuItems, tables, activeOrders, orderHistory, tableNotes, tips,
    getOrderForTable, addItemToOrder, updateItemQuantity, updateItemInstructions, removeItemFromOrder, removeItemsByGroupId,
    updateItemStatus, clearOrder, sendOrderToKitchen,
    getTableStatus, updateTableStatus,
    assignWaiterToTable, clearWaiterAssignment, getAssignedWaiterInfo,
    calculateTotal, getTotalItemsForTable, getFirstItemAddedTime,
    archiveOrder, getHistoricalOrdersForTable, getHistoricalOrderById, repeatOrder,
    getTableNote, updateTableNote, addTip,
    isMenuLoading, isTablesLoading, isSubmittingOrder,
  }), [
    menuItems, tables, activeOrders, orderHistory, tableNotes, tips,
    getOrderForTable, addItemToOrder, updateItemQuantity, updateItemInstructions, removeItemFromOrder, removeItemsByGroupId,
    updateItemStatus, clearOrder, sendOrderToKitchen,
    getTableStatus, updateTableStatus,
    assignWaiterToTable, clearWaiterAssignment, getAssignedWaiterInfo,
    calculateTotal, getTotalItemsForTable, getFirstItemAddedTime,
    archiveOrder, getHistoricalOrdersForTable, getHistoricalOrderById, repeatOrder,
    getTableNote, updateTableNote, addTip, // Ensure these are correctly referenced
    isMenuLoading, isTablesLoading, isSubmittingOrder,
  ]);

  return <OrderContext.Provider value={contextValue}>{children}</OrderContext.Provider>;
};

export const useOrders = (): OrderContextType => {
  const context = useContext(OrderContext);
  if (context === undefined) throw new Error('useOrders must be used within an OrderProvider');
  return context;
};
