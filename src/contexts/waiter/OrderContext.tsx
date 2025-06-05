
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
  getOrder,
  updateOrderItemStatusInFirestore,
  deriveOverallOrderStatus,
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
  updateItemStatus: (tableId: string, itemUniqueId: string, status: OrderItemStatus) => Promise<void>;
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

const safeString = (value: any): string | null => typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

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

  // Helper to sanitize an OrderItem (local to this context)
  const sanitizeOrderItem = useCallback((item: Partial<OrderItem>): OrderItem => {
    const now = Date.now();
    const menuItemId = item.menuItemId || 'unknown-item';

    // Robust uniqueId generation
    let uniqueIdFromItem = item.uniqueId;
    if (!uniqueIdFromItem) {
      // Ensure createdAt is a number (epoch ms) before using in ID
      const timestampPartForId = (item.createdAt && typeof item.createdAt === 'object' && typeof (item.createdAt as any).toDate === 'function')
          ? (item.createdAt as Timestamp).toDate().getTime()
          : (typeof item.createdAt === 'number' ? item.createdAt : now);
      uniqueIdFromItem = menuItemId + '-' + timestampPartForId;
    }

    const idParts = uniqueIdFromItem.split('-');
    // Check if a random suffix is needed:
    // - if less than 3 parts (e.g., just "itemId-timestamp")
    // - or if the last part doesn't look like a 7+ char alphanumeric random string
    const needsSuffix = idParts.length < 3 || !/^[a-z0-9]{7,}$/i.test(idParts[idParts.length - 1]);

    const finalUniqueId = needsSuffix
      ? uniqueIdFromItem + '-' + Math.random().toString(36).substring(2, 9)
      : uniqueIdFromItem;

    // Consistent timestamp handling (convert to number - epoch ms)
    const finalCreatedAt = (item.createdAt && typeof item.createdAt === 'object' && typeof (item.createdAt as any).toDate === 'function')
      ? (item.createdAt as Timestamp).toDate().getTime()
      : (typeof item.createdAt === 'number' ? item.createdAt : now);

    const finalUpdatedAt = (item.updatedAt && typeof item.updatedAt === 'object' && typeof (item.updatedAt as any).toDate === 'function')
      ? (item.updatedAt as Timestamp).toDate().getTime()
      : (typeof item.updatedAt === 'number' ? item.updatedAt : finalCreatedAt);


    return {
      uniqueId: finalUniqueId,
      menuItemId: menuItemId,
      menuItemName: item.menuItemName || 'Unknown Item',
      quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
      unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
      totalPrice: (typeof item.unitPrice === 'number' ? item.unitPrice : 0) * (typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1),
      status: item.status || 'pending',
      variantChoices: item.variantChoices || null,
      instructions: safeString(item.instructions),
      notes: safeString(item.notes),
      createdAt: finalCreatedAt,
      updatedAt: finalUpdatedAt,
      groupId: safeString(item.groupId),
      imageUrl: safeString(item.imageUrl),
      categoryId: safeString(item.categoryId),
      taxOverrides: item.taxOverrides || null,
      menuItem: item.menuItem, // This is for local context, won't be saved to Firestore if it's the full MenuItem object
    };
  }, []);


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
  }, [restaurantId, sanitizeOrderItem]); // Added sanitizeOrderItem as dependency

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
    return items.reduce((total, item) => total + (item.unitPrice || 0) * item.quantity, 0);
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
        const newItemData = sanitizeOrderItem({
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
          menuItem: menuItem,
        });
        currentOrder = [...currentOrder, newItemData];
      }
      newOrders.set(tableId, currentOrder);
      return newOrders;
    });
    const currentStatus = getTableStatus(tableId);
    if (currentStatus === 'available' || currentStatus === 'reserved') {
      updateTableStatus(tableId, 'occupied');
    }
  }, [getTableStatus, updateTableStatus, sanitizeOrderItem]);

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
      const firestoreOrder = await getOrder(orderRestaurantId, orderId);
      if (firestoreOrder && firestoreOrder.items && firestoreOrder.items.length > 0) {
        const newOverallStatus = deriveOverallOrderStatus(firestoreOrder.items);

        if (newOverallStatus !== firestoreOrder.status) {
          await updateFirebaseOrder(orderRestaurantId, orderId, { status: newOverallStatus });
          toast({ title: "Overall Order Status Updated", description: `Order #${orderId.substring(0,6)} status is now ${newOverallStatus}.` });
        }

        const tableForOrder = tables.find(t => t.id === firestoreOrder.tableId);
        if (tableForOrder) {
            if (newOverallStatus === 'payment_pending' && tableForOrder.status !== 'paying') {
                updateTableStatus(tableForOrder.id, 'paying');
            } else if ((newOverallStatus === 'completed' || newOverallStatus === 'cancelled_by_restaurant' || newOverallStatus === 'cancelled_by_customer')) {
                const otherActiveFirestoreOrders = await getOrdersByTable(orderRestaurantId, tableForOrder.id, ['pending_kitchen', 'confirmed_by_kitchen', 'preparing', 'ready_for_pickup', 'served', 'payment_pending']);
                if (otherActiveFirestoreOrders.filter(o => o.id !== orderId).length === 0 && tableForOrder.status !== 'reserved') {
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
      let firestoreOrderId = activeFirestoreOrderIds.get(tableId);
      const itemsToSyncToFirebase = pendingItems.map(localItem => sanitizeOrderItem({
        // Map only fields relevant for Firestore OrderItem, excluding nested menuItem object
        uniqueId: localItem.uniqueId,
        menuItemId: localItem.menuItem.id,
        menuItemName: localItem.menuItem.name,
        quantity: localItem.quantity,
        unitPrice: localItem.menuItem.price,
        totalPrice: localItem.menuItem.price * localItem.quantity,
        status: 'sent_to_kitchen', // Explicitly set
        variantChoices: localItem.variantChoices || null,
        instructions: localItem.instructions || null,
        notes: localItem.notes || null,
        createdAt: localItem.createdAt, // Already a number
        updatedAt: Date.now(), // Update timestamp
        groupId: localItem.groupId || null,
        imageUrl: localItem.menuItem.imageUrl || null,
        categoryId: localItem.menuItem.categoryId,
        taxOverrides: localItem.menuItem.taxOverrides || null,
      }));


      if (!firestoreOrderId) {
        const tableInfo = tables.find(t => t.id === tableId);
        const newOrderData = {
          userId: user.uid,
          tableId,
          tableNumber: tableInfo?.tableNumber || null,
          items: itemsToSyncToFirebase,
          kitchenNotes: getTableNote(tableId) || null,
        };
        const createdOrder = await createFirebaseOrder(restaurantId, newOrderData);
        firestoreOrderId = createdOrder.id;
        setActiveFirestoreOrderIds(prev => new Map(prev).set(tableId, firestoreOrderId!));
      } else {
        const firestoreOrder = await getOrder(restaurantId, firestoreOrderId);
        if (!firestoreOrder) throw new Error("Active Firestore order not found for update.");

        let existingFirestoreItems = firestoreOrder.items.map(item => sanitizeOrderItem(item));
        itemsToSyncToFirebase.forEach(newItem => {
            const existingIndex = existingFirestoreItems.findIndex(exItem => exItem.uniqueId === newItem.uniqueId);
            if (existingIndex > -1) {
                existingFirestoreItems[existingIndex] = newItem; // Update if somehow it was pending in FS
            } else {
                existingFirestoreItems.push(newItem);
            }
        });
        await updateFirebaseOrder(restaurantId, firestoreOrderId, { items: existingFirestoreItems });
      }

      setActiveOrders(prevOrders => {
        const newOrders = new Map(prevOrders);
        const currentOrder = newOrders.get(tableId) || [];
        const updatedOrder = currentOrder.map(item =>
          item.status === 'pending' ? { ...item, status: 'sent_to_kitchen' as OrderItemStatus, updatedAt: Date.now() } : item
        );
        newOrders.set(tableId, updatedOrder);
        return newOrders;
      });

      if (firestoreOrderId) {
        await checkAndUpdateOverallOrderStatusAndTable(restaurantId, firestoreOrderId);
      }
      toast({ title: "Order Sent to Kitchen", description: `${pendingItems.length} item(s) have been sent.` });

    } catch (error: any) {
      toast({ variant: "destructive", title: "Send Failed", description: `Could not send items to kitchen: ${error.message}` });
    } finally {
      setIsSubmittingOrder(false);
    }
  }, [restaurantId, user?.uid, getOrderForTable, activeFirestoreOrderIds, tables, getTableNote, toast, checkAndUpdateOverallOrderStatusAndTable, sanitizeOrderItem]);

  const updateItemStatus = useCallback(async (tableId: string, itemUniqueId: string, newStatus: OrderItemStatus) => {
    if (!restaurantId || !user?.uid) {
      toast({ variant: "destructive", title: "Auth Error", description: "Cannot update item status." });
      return;
    }
    let localItemToUpdate: OrderItem | undefined;
    let firestoreOrderId = activeFirestoreOrderIds.get(tableId);

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
    setIsSubmittingOrder(true);
    try {
      if (!firestoreOrderId && newStatus === 'sent_to_kitchen') {
        // If no FS order and we are trying to send, trigger sendOrderToKitchen which handles creation.
        // It will eventually call updateItemStatus again, but that's fine.
        await sendOrderToKitchen(tableId);
      } else if (firestoreOrderId) {
        await updateOrderItemStatusInFirestore(restaurantId, firestoreOrderId, itemUniqueId, newStatus);
        await checkAndUpdateOverallOrderStatusAndTable(restaurantId, firestoreOrderId);
      } else {
         console.warn(`No active Firestore order for table ${tableId}. Local status for ${itemUniqueId} changed to ${newStatus}. Send to kitchen to persist.`);
      }
      toast({ title: "Item Status Synced", description: `${localItemToUpdate.menuItemName} status updated to ${newStatus}.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sync Error", description: `Failed to sync item status: ${error.message}` });
    } finally {
      setIsSubmittingOrder(false);
    }
  }, [restaurantId, user?.uid, activeFirestoreOrderIds, toast, checkAndUpdateOverallOrderStatusAndTable, sendOrderToKitchen]);


  const clearOrder = useCallback((tableId: string) => {
    const currentFirestoreOrderId = activeFirestoreOrderIds.get(tableId);
    if (currentFirestoreOrderId) {
      console.warn(`Clearing local order for table ${tableId} which has an active Firestore order ${currentFirestoreOrderId}. Consider cancelling the Firestore order.`);
      // Ideally, we might want to update the Firestore order to 'cancelled' or remove items if all were pending.
      // For now, this action is purely local for draft items.
    }
    setActiveOrders(prevOrders => {
      const newOrders = new Map(prevOrders);
      newOrders.delete(tableId);
      return newOrders;
    });
    setActiveFirestoreOrderIds(prev => {
      const newMap = new Map(prev);
      newMap.delete(tableId); // Clear the association
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

            await updateFirebaseOrder(restaurantId, firestoreOrderId, {
              status: 'completed',
              totalAmount: actualTotalAmount,
              paymentMethod: paymentMethod || null,
              customerNotes: paymentNote ? `${currentFirestoreOrder.customerNotes || ''} Payment Note: ${paymentNote}`.trim() : (currentFirestoreOrder.customerNotes || null),
              items: updatedFirestoreItems,
              updatedAt: serverTimestamp() as Timestamp,
            });
        }
      } else {
        console.warn(`WaiterContext: No active Firestore order found for table ${tableId} to mark as completed when archiving. Creating historical record locally only.`);
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
        newHistory.set(tableId, [historicalOrder, ...tableHistory].slice(0, 10)); // Keep last 10 for example
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
  }, [restaurantId, getOrderForTable, clearOrder, updateTableStatus, calculateTotal, toast, activeFirestoreOrderIds, sanitizeOrderItem]);


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

    
  