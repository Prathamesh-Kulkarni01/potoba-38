
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
import { WAITERS_DATA } from '@/data/waiter/waiters'; // Static data for now
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'; // For real-time updates
import { db } from '@/lib/firebase/config';
import { getOrdersCollectionPath } from '@/lib/firebase/utils';


interface OrderContextType {
  // Dynamic Data
  menuItems: MenuItem[];
  menuCategories: MenuCategory[];
  menuSubcategories: MenuSubcategory[];
  tables: FirebaseTableType[];
  activeOrders: Map<string, OrderItem[]>; 
  activeFirestoreOrderIds: Map<string, string | null>; 
  allActiveFirestoreOrders: Map<string, ClientOrder>; // For real-time KDS/other updates

  // Local Waiter App State
  tableNotes: Map<string, string>;
  tips: TipEntry[];
  orderHistory: Map<string, HistoricalOrder[]>;

  // Core Order Functions
  getOrderForTable: (tableId: string) => OrderItem[];
  addItemToOrder: (tableId: string, menuItem: MenuItem, quantity?: number, instructions?: string, groupId?: string | null) => void;
  updateItemQuantity: (tableId: string, menuItemId: string, quantity: number, itemInstructions?: string, itemUniqueId?: string) => void;
  updateItemInstructions: (tableId: string, menuItemId: string, instructions: string, itemUniqueId?: string) => void;
  removeItemFromOrder: (tableId: string, menuItemId: string, itemUniqueId?: string) => void;
  removeItemsByGroupId: (tableId: string, groupId: string) => void;
  updateItemStatus: (tableId: string, itemUniqueId: string, status: OrderItemStatus) => Promise<void>;
  clearOrder: (tableId: string, groupId?: string | null) => void;
  sendOrderToKitchen: (tableId: string, groupId?: string | null) => Promise<void>;


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
  archiveOrder: (tableId: string, finalBillAmount?: number, paymentMethod?: HistoricalOrder['paymentMethod'], paymentNote?: string, groupId?: string | null) => Promise<void>;
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
  const [allActiveFirestoreOrders, setAllActiveFirestoreOrders] = useState<Map<string, ClientOrder>>(() => new Map());

  const [orderHistory, setOrderHistory] = useState<Map<string, HistoricalOrder[]>>(() => new Map());
  const [tableNotes, setTableNotes] = useState<Map<string, string>>(() => new Map());
  const [tips, setTips] = useState<TipEntry[]>(() => []);

  const [isMenuLoading, setIsMenuLoading] = useState(true);
  const [isTablesLoading, setIsTablesLoading] = useState(true);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  
  const sanitizeOrderItemLocal = useCallback((item: Partial<OrderItem>, existingMenuItemData?: MenuItem): OrderItem => {
    const now = Date.now();
    const menuItemId = item.menuItemId || existingMenuItemData?.id || 'unknown-item';
    const basePrice = item.unitPrice || existingMenuItemData?.price || 0;
    const quantity = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
  
    let uniqueIdFromItem = item.uniqueId;
    if (!uniqueIdFromItem) {
      const timestampPartForId = (item.createdAt && typeof item.createdAt === 'object' && typeof (item.createdAt as any).toDate === 'function')
          ? (item.createdAt as Timestamp).toDate().getTime()
          : (typeof item.createdAt === 'number' ? item.createdAt : now);
      uniqueIdFromItem = menuItemId + '-' + timestampPartForId;
    }
    
    const idParts = uniqueIdFromItem.split('-');
    const needsSuffix = idParts.length < 3 || !/^[a-z0-9]{7,}$/i.test(idParts[idParts.length - 1]);
    const finalUniqueId = needsSuffix
      ? uniqueIdFromItem + '-' + Math.random().toString(36).substring(2, 9)
      : uniqueIdFromItem;
  
    const finalCreatedAt = (item.createdAt && typeof item.createdAt === 'object' && typeof (item.createdAt as any).toDate === 'function')
      ? (item.createdAt as Timestamp).toDate().getTime()
      : (typeof item.createdAt === 'number' ? item.createdAt : now);
  
    const finalUpdatedAt = (item.updatedAt && typeof item.updatedAt === 'object' && typeof (item.updatedAt as any).toDate === 'function')
      ? (item.updatedAt as Timestamp).toDate().getTime()
      : (typeof item.updatedAt === 'number' ? item.updatedAt : finalCreatedAt);
  
    return {
      uniqueId: finalUniqueId,
      menuItemId: menuItemId,
      menuItemName: item.menuItemName || existingMenuItemData?.name || 'Unknown Item',
      quantity: quantity,
      unitPrice: basePrice,
      totalPrice: basePrice * quantity,
      status: item.status || 'pending',
      variantChoices: item.variantChoices || null,
      instructions: safeString(item.instructions),
      notes: safeString(item.notes),
      createdAt: finalCreatedAt,
      updatedAt: finalUpdatedAt,
      groupId: safeString(item.groupId),
      imageUrl: safeString(item.imageUrl || existingMenuItemData?.imageUrl),
      categoryId: safeString(item.categoryId || existingMenuItemData?.categoryId),
      taxOverrides: item.taxOverrides || existingMenuItemData?.taxOverrides || null,
      menuItem: item.menuItem || existingMenuItemData, 
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
  
  // Listener for all active orders in the restaurant (KDS/Dashboard relevant)
  useEffect(() => {
    if (!restaurantId || !db) return;
    const ordersColPath = getOrdersCollectionPath(restaurantId);
    const q = query(
      collection(db, ordersColPath),
      where('status', 'in', ['pending_kitchen', 'confirmed_by_kitchen', 'preparing', 'ready_for_pickup', 'served', 'payment_pending']),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders = new Map<string, ClientOrder>();
      snapshot.forEach(doc => {
        fetchedOrders.set(doc.id, { 
            id: doc.id, 
            ...doc.data(), 
            createdAt: convertFirebaseTimestampToString(doc.data().createdAt),
            updatedAt: convertFirebaseTimestampToString(doc.data().updatedAt),
        } as ClientOrder);
      });
      setAllActiveFirestoreOrders(fetchedOrders);
    }, (error) => {
      console.error("Error listening to all active Firestore orders:", error);
      toast({ variant: "destructive", title: "Live Order Sync Error" });
    });
    return () => unsubscribe();
  }, [restaurantId, toast]);


  // Load from localStorage on mount
  useEffect(() => {
    if (restaurantId) {
      const storedActiveOrders = localStorage.getItem(`waiterActiveOrders_${restaurantId}`);
        if (storedActiveOrders) { try {
          const parsedOrdersArray: [string, any[]][] = JSON.parse(storedActiveOrders);
          const newOrdersMap = new Map<string, OrderItem[]>();
          parsedOrdersArray.forEach(([tableId, items]) => {
            newOrdersMap.set(tableId, items.map((itemData) => sanitizeOrderItemLocal(itemData as Partial<OrderItem>, menuItems.find(mi => mi.id === itemData.menuItemId))));
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
  }, [restaurantId, sanitizeOrderItemLocal, menuItems]); // Added menuItems

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

  const addItemToOrder = useCallback((tableId: string, menuItem: MenuItem, quantity: number = 1, instructions?: string, groupId?: string | null) => {
    setActiveOrders(prevOrders => {
      const newOrders = new Map(prevOrders);
      let currentOrder = newOrders.get(tableId) || [];
      const normalizedGroupId = safeString(groupId);
      const now = Date.now();
  
      const existingItemIndex = currentOrder.findIndex(item =>
        item.menuItem?.id === menuItem.id && // Check if menuItem exists before accessing id
        (item.instructions || null) === (instructions || null) &&
        item.status === 'pending' &&
        (item.groupId || null) === normalizedGroupId
      );
  
      if (existingItemIndex > -1) {
        const updatedItem = {
          ...currentOrder[existingItemIndex],
          quantity: currentOrder[existingItemIndex].quantity + quantity,
          totalPrice: (currentOrder[existingItemIndex].quantity + quantity) * (currentOrder[existingItemIndex].menuItem?.price || 0),
          updatedAt: now,
        };
        currentOrder[existingItemIndex] = updatedItem;
      } else {
        const newItemData = sanitizeOrderItemLocal({
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
        }, menuItem); // Pass full menuItem for context
        currentOrder = [...currentOrder, newItemData];
      }
      newOrders.set(tableId, currentOrder);
      return newOrders;
    });
    const currentStatus = getTableStatus(tableId);
    if (currentStatus === 'available' || currentStatus === 'reserved') {
      updateTableStatus(tableId, 'occupied');
    }
  }, [getTableStatus, updateTableStatus, sanitizeOrderItemLocal]);

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
            totalPrice: (currentOrder[itemIndex].menuItem?.price || 0) * quantity,
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
        // If other groups still have items or main order has items, keep occupied
        updateTableStatus(tableId, 'occupied');
      }
      return newOrders;
    });
  }, [getTableStatus, updateTableStatus]);

  const checkAndUpdateOverallOrderStatusAndTable = useCallback(async (orderRestaurantId: string, orderId: string) => {
    if (!orderRestaurantId || !orderId) return;
    try {
      const firestoreOrder = await getOrder(orderRestaurantId, orderId); // This fetches the ClientOrder
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


  const sendOrderToKitchen = useCallback(async (tableId: string, groupId?: string | null) => {
    if (!restaurantId || !user?.uid) {
        toast({ variant: "destructive", title: "Error", description: "Cannot send order. User or restaurant context missing." });
        return;
    }
    const localItemsForTable = getOrderForTable(tableId);
    const normalizedGroupId = safeString(groupId);

    const pendingItemsForScope = localItemsForTable.filter(item => 
        item.status === 'pending' && 
        (normalizedGroupId === null ? !item.groupId : item.groupId === normalizedGroupId)
    );

    if (pendingItemsForScope.length === 0) {
        toast({ title: "No New Items", description: `No pending items to send for ${normalizedGroupId ? 'group ' + normalizedGroupId : 'this table'}.` });
        return;
    }
    
    setIsSubmittingOrder(true);
    try {
        const sessionKey = `${tableId}_${normalizedGroupId || '_main'}`;
        let firestoreOrderId = activeFirestoreOrderIds.get(sessionKey);

        const itemsToPersistInFirebase: OrderItem[] = pendingItemsForScope.map(localItem => {
            const fullMenuItem = menuItems.find(mi => mi.id === localItem.menuItem.id);
            return sanitizeOrderItemLocal({
                ...localItem,
                status: 'sent_to_kitchen',
                updatedAt: Date.now(),
            }, fullMenuItem);
        });

        if (!firestoreOrderId) {
            // Create a new Firestore order for this table/group session
            const tableInfo = tables.find(t => t.id === tableId);
            const newOrderData = {
                userId: user.uid,
                tableId,
                tableNumber: tableInfo?.tableNumber || null,
                items: itemsToPersistInFirebase,
                kitchenNotes: getTableNote(tableId) || null,
                groupId: normalizedGroupId,
            };
            const createdOrder = await createFirebaseOrder(restaurantId, newOrderData);
            firestoreOrderId = createdOrder.id;
            setActiveFirestoreOrderIds(prev => new Map(prev).set(sessionKey, firestoreOrderId!));
        } else {
            // Add these items to an existing Firestore order
            const existingFirestoreOrder = await getOrder(restaurantId, firestoreOrderId);
            if (!existingFirestoreOrder) throw new Error(`Firestore order ${firestoreOrderId} not found for update.`);
            
            const existingItems = existingFirestoreOrder.items.map(item => sanitizeOrderItemLocal(item));
            const mergedItems = [...existingItems];

            itemsToPersistInFirebase.forEach(newItem => {
                const idx = mergedItems.findIndex(ex => ex.uniqueId === newItem.uniqueId);
                if (idx > -1) {
                    mergedItems[idx] = newItem; // Update existing (e.g. if it was re-sent)
                } else {
                    mergedItems.push(newItem);
                }
            });
            await updateFirebaseOrder(restaurantId, firestoreOrderId, { items: mergedItems });
        }
        
        // Update local state for the items that were just sent
        setActiveOrders(prevOrders => {
            const newOrders = new Map(prevOrders);
            const currentOrderForTable = newOrders.get(tableId) || [];
            const updatedOrderForTable = currentOrderForTable.map(localItem => {
                const matchesScope = (normalizedGroupId === null ? !localItem.groupId : localItem.groupId === normalizedGroupId);
                if (localItem.status === 'pending' && matchesScope) {
                    return { ...localItem, status: 'sent_to_kitchen' as OrderItemStatus, updatedAt: Date.now() };
                }
                return localItem;
            });
            newOrders.set(tableId, updatedOrderForTable);
            return newOrders;
        });

        if (firestoreOrderId) {
          await checkAndUpdateOverallOrderStatusAndTable(restaurantId, firestoreOrderId);
        }
        toast({ title: "Order Sent", description: `${pendingItemsForScope.length} item(s) sent to kitchen for ${normalizedGroupId ? 'group ' + normalizedGroupId : `Table ${tableId.replace('t','')}`}.` });

    } catch (error: any) {
        toast({ variant: "destructive", title: "Send to Kitchen Failed", description: error.message || "Could not send items." });
    } finally {
        setIsSubmittingOrder(false);
    }
  }, [restaurantId, user?.uid, getOrderForTable, activeFirestoreOrderIds, menuItems, tables, getTableNote, toast, checkAndUpdateOverallOrderStatusAndTable, sanitizeOrderItemLocal]);
  
  const updateItemStatus = useCallback(async (tableId: string, itemUniqueId: string, newStatus: OrderItemStatus) => {
    if (!restaurantId || !user?.uid) {
      toast({ variant: "destructive", title: "Auth Error", description: "Cannot update item status." });
      return;
    }
    let localItemToUpdate: OrderItem | undefined;
    
    // Find the item in local state to get its groupId
    setActiveOrders(prev => {
      const newMap = new Map(prev);
      const items = newMap.get(tableId) || [];
      const itemIndex = items.findIndex(i => i.uniqueId === itemUniqueId);
      if (itemIndex > -1) {
        localItemToUpdate = { ...items[itemIndex], status: newStatus, updatedAt: Date.now() };
        items[itemIndex] = localItemToUpdate;
        newMap.set(tableId, [...items]);
      } else {
         console.warn(`Local item ${itemUniqueId} not found in table ${tableId} for status update.`);
      }
      return newMap;
    });

    if (!localItemToUpdate) {
      // Attempt to find it in existing Firestore orders if not in local draft (e.g. KDS update)
      let foundInFirestore = false;
      for (const [_, order] of allActiveFirestoreOrders) {
        if (order.tableId === tableId) {
            const item = order.items.find(i => i.uniqueId === itemUniqueId);
            if(item) {
                localItemToUpdate = item; // Use this item's groupId for sessionKey
                foundInFirestore = true;
                break;
            }
        }
      }
      if (!localItemToUpdate && !foundInFirestore) {
        toast({ variant: "destructive", title: "Item Not Found", description: `Could not find item ${itemUniqueId} to update its status.` });
        return;
      }
    }
    
    const sessionKey = `${tableId}_${localItemToUpdate?.groupId || '_main'}`;
    const firestoreOrderId = activeFirestoreOrderIds.get(sessionKey);

    setIsSubmittingOrder(true);
    try {
      if (!firestoreOrderId && newStatus === 'sent_to_kitchen') {
        // This item is the first for this table/group session being sent.
        // Call sendOrderToKitchen which will handle creation.
        await sendOrderToKitchen(tableId, localItemToUpdate?.groupId || null);
      } else if (firestoreOrderId) {
        // An order for this table/group already exists in Firestore. Update the item within it.
        await updateOrderItemStatusInFirestore(restaurantId, firestoreOrderId, itemUniqueId, newStatus);
        await checkAndUpdateOverallOrderStatusAndTable(restaurantId, firestoreOrderId); // Re-check overall status
      } else {
         // Item status changed locally (e.g. pending->pending instructions update) but not sent yet. No FS action.
         console.log(`Local status update for ${itemUniqueId} to ${newStatus}. No Firestore action as order not yet created for this session.`);
      }
      toast({ title: "Item Status Updated", description: `${localItemToUpdate?.menuItemName || 'Item'} status is now ${newStatus}.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Status Update Failed", description: `Could not update item status: ${error.message}` });
       // Revert local state if Firestore update failed (optional, for consistency)
       setActiveOrders(prev => {
        const newMap = new Map(prev);
        const items = newMap.get(tableId) || [];
        const itemIndex = items.findIndex(i => i.uniqueId === itemUniqueId);
        if (itemIndex > -1 && localItemToUpdate) {
            items[itemIndex] = {...localItemToUpdate, status: localItemToUpdate.status, updatedAt: localItemToUpdate.updatedAt}; // Revert to original before trying to update
            newMap.set(tableId, [...items]);
        }
        return newMap;
      });
    } finally {
      setIsSubmittingOrder(false);
    }
  }, [restaurantId, user?.uid, activeFirestoreOrderIds, toast, checkAndUpdateOverallOrderStatusAndTable, sendOrderToKitchen, allActiveFirestoreOrders]);


  const clearOrder = useCallback((tableId: string, groupId?: string | null) => {
    const normalizedGroupId = safeString(groupId);
    const sessionKey = `${tableId}_${normalizedGroupId || '_main'}`;
    const currentFirestoreOrderId = activeFirestoreOrderIds.get(sessionKey);

    if (currentFirestoreOrderId) {
      console.warn(`Clearing local order for ${sessionKey} which has an active Firestore order ${currentFirestoreOrderId}. This typically happens after archiving.`);
      // This is usually called after archiving, so the Firestore order is already handled.
    }
    setActiveOrders(prevOrders => {
      const newOrders = new Map(prevOrders);
      if (normalizedGroupId) {
        const tableItems = newOrders.get(tableId) || [];
        newOrders.set(tableId, tableItems.filter(item => (item.groupId || null) !== normalizedGroupId));
      } else {
        // Clear non-grouped items or entire table if no groupId specified and it implies clearing all groups for that table.
        // Current logic is more specific with removeItemsByGroupId for group clearing.
        // This clearOrder usually implies clearing items not associated with a specific group ID.
        const tableItems = newOrders.get(tableId) || [];
        newOrders.set(tableId, tableItems.filter(item => !!item.groupId)); // Keep only grouped items if any
      }
      
      if ((newOrders.get(tableId) || []).length === 0 && !activeFirestoreOrderIds.has(`${tableId}__main`) && ![...activeFirestoreOrderIds.keys()].some(k => k.startsWith(tableId + "_") && k !== sessionKey)) {
          if (getTableStatus(tableId) !== 'reserved' && getTableStatus(tableId) !== 'paying') {
            updateTableStatus(tableId, 'available');
          }
      }
      return newOrders;
    });
    setActiveFirestoreOrderIds(prev => {
      const newMap = new Map(prev);
      newMap.delete(sessionKey);
      return newMap;
    });
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

  const archiveOrder = useCallback(async (tableId: string, finalBillAmount?: number, paymentMethod?: HistoricalOrder['paymentMethod'], paymentNote?: string, groupId?: string | null) => {
    if (!restaurantId) return;
    
    const normalizedGroupId = safeString(groupId);
    const sessionKey = `${tableId}_${normalizedGroupId || '_main'}`;
    const firestoreOrderId = activeFirestoreOrderIds.get(sessionKey);

    const itemsForThisScope = getOrderForTable(tableId).filter(item => (item.groupId || null) === normalizedGroupId);

    if (itemsForThisScope.length === 0 && !firestoreOrderId) {
      toast({title: "Nothing to Archive", description: `No items found for ${normalizedGroupId ? `group ${normalizedGroupId}` : `table ${tableId}`}.`});
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const actualTotalAmount = finalBillAmount ?? calculateTotal(tableId, itemsForThisScope);
      
      if (firestoreOrderId) {
        const currentFirestoreOrder = await getOrder(restaurantId, firestoreOrderId);
        if (currentFirestoreOrder) {
            const updatedFirestoreItems = currentFirestoreOrder.items.map(item =>
              sanitizeOrderItemLocal({ ...item, status: 'served' }, menuItems.find(mi => mi.id === item.menuItemId)) // Mark as served
            );
            await updateFirebaseOrder(restaurantId, firestoreOrderId, {
              status: 'completed', 
              totalAmount: actualTotalAmount, 
              paymentMethod: paymentMethod || null,
              customerNotes: paymentNote ? `${currentFirestoreOrder.customerNotes || ''} Payment Note: ${paymentNote}`.trim() : (currentFirestoreOrder.customerNotes || null),
              items: updatedFirestoreItems, // Ensure all items in this FS order are marked served
              updatedAt: serverTimestamp() as Timestamp,
            });
            await checkAndUpdateOverallOrderStatusAndTable(restaurantId, firestoreOrderId);
        }
      } else if (itemsForThisScope.length > 0) {
        // If there are local items but no Firestore order, it means they were never sent.
        // We create a historical record but no corresponding Firestore order update is needed.
        console.warn(`Archiving local-only items for ${sessionKey}. These items were never sent to the kitchen.`);
      }
      
      const historicalOrder: HistoricalOrder = {
        id: firestoreOrderId || `local-hist-${sessionKey}-${Date.now()}`,
        originalTableId: tableId,
        items: itemsForThisScope.map(item => sanitizeOrderItemLocal({ ...item, status: 'served', menuItem: undefined }, menuItems.find(mi => mi.id === item.menuItem.id))), // Store without full menuItem
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

      clearOrder(tableId, normalizedGroupId); 

      // Check if entire table is now clear
      const remainingItemsOnTable = getOrderForTable(tableId);
      const remainingActiveFSOrderForTable = [...activeFirestoreOrderIds.entries()].some(([key,val]) => key.startsWith(tableId+"_") && val);
      
      if (remainingItemsOnTable.length === 0 && !remainingActiveFSOrderForTable) {
         if (getTableStatus(tableId) !== 'reserved') {
           await updateTableStatus(tableId, 'available');
         }
      }
      
      toast({ title: "Order Archived & Cleared", description: `Order for ${normalizedGroupId ? `group ${normalizedGroupId}` : `table ${tableId}`} has been archived.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Archival Failed", description: `Could not archive order: ${error.message}` });
      console.error("Error archiving order:", error);
    } finally {
      setIsSubmittingOrder(false);
    }
  }, [restaurantId, getOrderForTable, calculateTotal, toast, activeFirestoreOrderIds, clearOrder, menuItems, sanitizeOrderItemLocal, checkAndUpdateOverallOrderStatusAndTable, updateTableStatus, getTableStatus]);


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
    menuItems, menuCategories, menuSubcategories, tables, activeOrders, activeFirestoreOrderIds, allActiveFirestoreOrders, orderHistory, tableNotes, tips,
    getOrderForTable, addItemToOrder, updateItemQuantity, updateItemInstructions, removeItemFromOrder, removeItemsByGroupId,
    updateItemStatus, clearOrder, sendOrderToKitchen,
    getTableStatus, updateTableStatus,
    assignWaiterToTable, clearWaiterAssignment, getAssignedWaiterInfo,
    calculateTotal, getTotalItemsForTable, getFirstItemAddedTime,
    archiveOrder, getHistoricalOrdersForTable, getHistoricalOrderById, repeatOrder,
    getTableNote, updateTableNote, addTip,
    isMenuLoading, isTablesLoading, isSubmittingOrder,
  }), [
    menuItems, menuCategories, menuSubcategories, tables, activeOrders, activeFirestoreOrderIds, allActiveFirestoreOrders, orderHistory, tableNotes, tips,
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
