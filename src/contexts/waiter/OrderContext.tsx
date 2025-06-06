
"use client";

import type { OrderItem, TableStatus, MenuItem, Waiter, HistoricalOrder, TipEntry, Order, OrderStatus } from '@/lib/types';
// Using OrderItem from @/lib/types for FbOrderItemStructure for now, will adjust if specific structure needed by firebase
import type { OrderItem as FbOrderItemStructure, ClientOrder } from '@/lib/types'; // Added ClientOrder
import type React from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { createOrder, updateOrder, listenToRestaurantOrders } from '@/lib/firebase/orders'; // Added listenToRestaurantOrders
import { toast } from 'react-hot-toast'; // Assuming toast is used for notifications

// It's good practice to define this if local OrderItem status needs to be broader
// than just what's initially set. This should align with statuses from Firestore's OrderStatus
// that we want to reflect on individual items locally.
type LocalOrderItemStatus = OrderItem['status'] | 'preparing' | 'ready_for_pickup' | 'cancelled' | 'confirmed_by_kitchen' | 'payment_pending' | 'completed';


interface OrderContextType {
  orders: Map<string, OrderItem[]>;
  tableStatuses: Map<string, TableStatus>;
  waiterAssignments: Map<string, string>; // tableId -> waiterId
  orderHistory: Map<string, HistoricalOrder[]>; // tableId -> array of historical orders
  tableNotes: Map<string, string>; // tableId -> note string
  tips: TipEntry[];

  getOrderForTable: (tableId: string) => OrderItem[];
  addItemToOrder: (tableId: string, menuItem: MenuItem, quantity?: number, instructions?: string, groupId?: string) => void;
  updateItemQuantity: (tableId: string, menuItemId: string, quantity: number, itemInstructions?: string, itemUniqueId?: string) => void;
  updateItemInstructions: (tableId: string, menuItemId: string, instructions: string, itemUniqueId?: string) => void;
  removeItemFromOrder: (tableId: string, menuItemId: string, itemUniqueId?: string) => void;
  removeItemsByGroupId: (tableId: string, groupId: string) => void;
  updateItemStatus: (tableId: string, menuItemId: string, status: OrderItem['status'], itemUniqueId?: string) => void;
  clearOrder: (tableId: string) => void; // Clears active order
  sendOrderToKitchen: (tableId: string) => void;


  getTableStatus: (tableId: string) => TableStatus;
  updateTableStatus: (tableId: string, status: TableStatus) => void;

  calculateTotal: (tableId: string, itemsToCalculate?: OrderItem[]) => number; // Updated to accept optional items
  getTotalItemsForTable: (tableId: string, itemsToCount?: OrderItem[]) => number; // Updated
  getFirstItemAddedTime: (tableId: string) => number | null;

  assignWaiterToTable: (tableId: string, waiterId: string) => void;
  clearWaiterAssignment: (tableId: string) => void;
  getAssignedWaiterId: (tableId: string) => string | undefined;

  archiveOrder: (tableId: string, finalBillAmount?: number, paymentMethod?: HistoricalOrder['paymentMethod'], paymentNote?: string) => void;
  getHistoricalOrdersForTable: (tableId: string) => HistoricalOrder[];
  getHistoricalOrderById: (orderId: string) => HistoricalOrder | undefined;
  repeatOrder: (tableId: string, historicalOrderItems: OrderItem[]) => void;

  getTableNote: (tableId: string) => string | undefined;
  updateTableNote: (tableId: string, note: string) => void;

  addTip: (amount: number, tableId?: string, notes?: string) => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Map<string, OrderItem[]>>(() => new Map());
  const [tableStatuses, setTableStatuses] = useState<Map<string, TableStatus>>(() => new Map());
  const [waiterAssignments, setWaiterAssignments] = useState<Map<string, string>>(() => new Map());
  const [orderHistory, setOrderHistory] = useState<Map<string, HistoricalOrder[]>>(() => new Map());
  const [tableNotes, setTableNotes] = useState<Map<string, string>>(() => new Map());
  const [tips, setTips] = useState<TipEntry[]>(() => []);
  const [activeFirestoreOrders, setActiveFirestoreOrders] = useState<Map<string, string>>(() => new Map());
  const { currentUser } = useAuth(); // Moved useAuth here to use in useEffect for listener


  // Load initial state from localStorage
  useEffect(() => {
    // Auto Save Draft Orders
    const storedOrders = localStorage.getItem('orders');
    if (storedOrders) {
      try {
        const parsedOrdersArray: [string, any[]][] = JSON.parse(storedOrders);
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
        setOrders(newOrdersMap);
      } catch (e) {
        console.error("Failed to parse orders from localStorage", e);
        setOrders(new Map());
      }
    }

    const storedTableStatuses = localStorage.getItem('tableStatuses');
    if (storedTableStatuses) {
      try {
        const parsedStatuses = JSON.parse(storedTableStatuses);
         if (Array.isArray(parsedStatuses)) {
           setTableStatuses(new Map(parsedStatuses));
        } else {
           setTableStatuses(new Map(Object.entries(parsedStatuses) as [string, TableStatus][]));
        }
      } catch (e) {
        console.error("Failed to parse table statuses from localStorage", e);
        setTableStatuses(new Map());
      }
    }

    const storedWaiterAssignments = localStorage.getItem('waiterAssignments');
    if (storedWaiterAssignments) {
        try {
            const parsedAssignments = JSON.parse(storedWaiterAssignments);
            if (Array.isArray(parsedAssignments)) {
                setWaiterAssignments(new Map(parsedAssignments));
            } else {
                 setWaiterAssignments(new Map(Object.entries(parsedAssignments) as [string, string][]));
            }
        } catch (e) {
            console.error("Failed to parse waiter assignments from localStorage", e);
            setWaiterAssignments(new Map());
        }
    }
    const storedOrderHistory = localStorage.getItem('orderHistory');
    if (storedOrderHistory) {
        try {
            const parsedHistoryArray: [string, HistoricalOrder[]][] = JSON.parse(storedOrderHistory);
            const newHistoryMap = new Map<string, HistoricalOrder[]>();
            parsedHistoryArray.forEach(([tableId, historyItems]) => {
                newHistoryMap.set(tableId, historyItems.map(histOrder => ({
                    ...histOrder,
                    items: histOrder.items.map((item) => ({
                        ...item,
                        uniqueId: item.uniqueId || `${item.menuItem.id}-${item.createdAt || Date.now()}-${Math.random().toString(36).substring(7)}`,
                        status: item.status || 'pending', // Should be 'served' in historical but keep for structure
                        createdAt: item.createdAt || Date.now(),
                        instructions: item.instructions || undefined,
                        groupId: item.groupId || undefined,
                    })),
                    paymentMethod: histOrder.paymentMethod || undefined,
                    paymentNote: histOrder.paymentNote || undefined,
                })));
            });
            setOrderHistory(newHistoryMap);
        } catch (e) {
            console.error("Failed to parse order history from localStorage", e);
            setOrderHistory(new Map());
        }
    }
    const storedTableNotes = localStorage.getItem('tableNotes');
    if (storedTableNotes) {
        try {
            const parsedNotes = JSON.parse(storedTableNotes);
            if (Array.isArray(parsedNotes)) {
                setTableNotes(new Map(parsedNotes));
            } else {
                setTableNotes(new Map(Object.entries(parsedNotes) as [string, string][]));
            }
        } catch (e) {
            console.error("Failed to parse table notes from localStorage", e);
            setTableNotes(new Map());
        }
    }
    const storedTips = localStorage.getItem('tips');
    if (storedTips) {
        try {
            setTips(JSON.parse(storedTips));
        } catch (e) {
            console.error("Failed to parse tips from localStorage", e);
            setTips([]);
        }
    }

    const storedActiveFirestoreOrders = localStorage.getItem('activeFirestoreOrders');
    if (storedActiveFirestoreOrders) {
      try {
        const parsedOrders = JSON.parse(storedActiveFirestoreOrders);
        if (Array.isArray(parsedOrders)) {
          setActiveFirestoreOrders(new Map(parsedOrders));
        } else {
          // Handle cases where it might be stored as an object
          setActiveFirestoreOrders(new Map(Object.entries(parsedOrders) as [string, string][]));
        }
      } catch (e) {
        console.error("Failed to parse activeFirestoreOrders from localStorage", e);
        setActiveFirestoreOrders(new Map());
      }
    }
  }, []);

  // Auto Save Draft Orders
  useEffect(() => {
    localStorage.setItem('orders', JSON.stringify(Array.from(orders.entries())));
  }, [orders]);

  // Auto Save Table Statuses
  useEffect(() => {
    localStorage.setItem('tableStatuses', JSON.stringify(Array.from(tableStatuses.entries())));
  }, [tableStatuses]);

  // Auto Save Waiter Assignments
  useEffect(() => {
    localStorage.setItem('waiterAssignments', JSON.stringify(Array.from(waiterAssignments.entries())));
  }, [waiterAssignments]);

  // Auto Save Order History
  useEffect(() => {
    localStorage.setItem('orderHistory', JSON.stringify(Array.from(orderHistory.entries())));
  }, [orderHistory]);

  // Auto Save Table Notes
  useEffect(() => {
    localStorage.setItem('tableNotes', JSON.stringify(Array.from(tableNotes.entries())));
  }, [tableNotes]);

  // Auto Save Tips
  useEffect(() => {
    localStorage.setItem('tips', JSON.stringify(tips));
  }, [tips]);

  useEffect(() => {
    localStorage.setItem('activeFirestoreOrders', JSON.stringify(Array.from(activeFirestoreOrders.entries())));
  }, [activeFirestoreOrders]);

  // Firestore Order Listener Effect
  useEffect(() => {
    if (!currentUser?.restaurantId) {
      return;
    }

    const unsubscribe = listenToRestaurantOrders(
      currentUser.restaurantId,
      (firestoreOrders: ClientOrder[]) => {
        if (!firestoreOrders) return;

        const updatedOrders = new Map(orders);
        let anyOrderChanged = false;

        const firestoreIdToTableIdMap = new Map<string, string>();
        activeFirestoreOrders.forEach((fid, tid) => firestoreIdToTableIdMap.set(fid, tid));

        for (const fsOrder of firestoreOrders) {
          const tableId = firestoreIdToTableIdMap.get(fsOrder.id);

          if (tableId) {
            const localItems = updatedOrders.get(tableId);
            if (localItems && localItems.length > 0) {
              let itemsChangedInThisOrder = false;
              const newLocalItems = localItems.map(item => {
                let newStatus = item.status as LocalOrderItemStatus;
                const currentFsOrderStatus = fsOrder.status as OrderStatus; // fsOrder.status is Firestore OrderStatus

                // Avoid reverting from a final local state like 'served' unless specifically cancelled
                if (item.status === 'served' &&
                    currentFsOrderStatus !== 'cancelled_by_customer' &&
                    currentFsOrderStatus !== 'cancelled_by_restaurant') {
                  return item;
                }

                let statusUpdated = false;
                switch (currentFsOrderStatus) {
                  case 'confirmed_by_kitchen':
                  case 'preparing':
                  case 'ready_for_pickup':
                  case 'payment_pending': // these can map directly if LocalOrderItemStatus includes them
                  case 'completed': // maps to 'served' or 'completed' locally
                    newStatus = currentFsOrderStatus === 'completed' ? 'served' : currentFsOrderStatus;
                    statusUpdated = true;
                    break;
                  case 'served': // Firestore 'served' confirms local 'served'
                    newStatus = 'served';
                    statusUpdated = true;
                    break;
                  case 'cancelled_by_customer':
                  case 'cancelled_by_restaurant':
                    newStatus = 'cancelled';
                    statusUpdated = true;
                    break;
                  // 'pending_kitchen' is usually set by the waiter app, KDS might not revert to this.
                  // 'pending_customer_confirmation' is usually for online orders.
                  default:
                    // No change for other statuses unless explicitly handled
                    break;
                }

                if (item.status !== newStatus && statusUpdated) {
                  itemsChangedInThisOrder = true;
                  return { ...item, status: newStatus };
                }
                return item;
              });

              if (itemsChangedInThisOrder) {
                updatedOrders.set(tableId, newLocalItems);
                anyOrderChanged = true;
              }
            }
          }
          // Ignoring orders not in activeFirestoreOrders (i.e., not known to this waiter session or table)
        }

        if (anyOrderChanged) {
          setOrders(updatedOrders);
        }
      },
      7 // Listen for orders updated in the last 7 days
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser?.restaurantId, activeFirestoreOrders, orders, setOrders]);


  const getOrderForTable = useCallback((tableId: string): OrderItem[] => {
    return orders.get(tableId) || [];
  }, [orders]);

  const getTableStatus = useCallback((tableId: string): TableStatus => {
    return tableStatuses.get(tableId) || 'available';
  }, [tableStatuses]);

  const updateTableStatus = useCallback((tableId: string, status: TableStatus) => {
    setTableStatuses(prevStatuses => {
      const newStatuses = new Map(prevStatuses);
      newStatuses.set(tableId, status);
      return newStatuses;
    });
  }, []);

  const addItemToOrder = useCallback((tableId: string, menuItem: MenuItem, quantity: number = 1, instructions?: string, groupId?: string) => {
    setOrders(prevOrders => {
      const newOrders = new Map(prevOrders);
      let currentOrder = newOrders.get(tableId) || [];
      const normalizedGroupId = groupId?.trim() || undefined;

      const existingItemIndex = currentOrder.findIndex(item =>
        item.menuItem.id === menuItem.id &&
        (item.instructions || '') === (instructions || '') &&
        item.status === 'pending' && // Only merge with pending items
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
        };
        currentOrder = [...currentOrder, newItemData];
      }
      newOrders.set(tableId, currentOrder);
      return newOrders;
    });
    // Update table status if it was 'available' or 'reserved'
    const currentStatus = getTableStatus(tableId);
    if (currentStatus === 'available' || currentStatus === 'reserved') {
        updateTableStatus(tableId, 'occupied');
    }
  }, [getTableStatus, updateTableStatus]);

  const updateItemQuantity = useCallback((tableId: string, menuItemId: string, quantity: number, itemInstructions?: string, itemUniqueId?: string) => {
    setOrders(prevOrders => {
      const newOrders = new Map(prevOrders);
      const currentOrder = newOrders.get(tableId) || [];

      const itemIndex = currentOrder.findIndex(item =>
        item.uniqueId === itemUniqueId ||
        (item.menuItem.id === menuItemId && (item.instructions || '') === (itemInstructions || '')) // Fallback if uniqueId not available
      );

      if (itemIndex > -1) {
        if (quantity <= 0) {
          // Remove item if quantity is zero or less
          currentOrder.splice(itemIndex, 1);
        } else {
          const updatedItem = { ...currentOrder[itemIndex], quantity };
          currentOrder.splice(itemIndex, 1, updatedItem); // Replace item with updated one
        }
        newOrders.set(tableId, [...currentOrder]); // Ensure a new array is set for reactivity

        // Update table status if order becomes empty and not 'paying' or 'reserved'
        if (currentOrder.length === 0 && getTableStatus(tableId) !== 'paying' && getTableStatus(tableId) !== 'reserved') {
          updateTableStatus(tableId, 'available');
        }
      }
      return newOrders;
    });
  }, [getTableStatus, updateTableStatus]);

  const updateItemInstructions = useCallback((tableId: string, menuItemId: string, instructions: string, itemUniqueId?: string) => {
    setOrders(prevOrders => {
      const newOrders = new Map(prevOrders);
      const currentOrder = newOrders.get(tableId) || [];

      // Prefer uniqueId for matching if available
      const itemIndex = itemUniqueId
        ? currentOrder.findIndex(item => item.uniqueId === itemUniqueId)
        : currentOrder.findIndex(item => item.menuItem.id === menuItemId); // Fallback if uniqueId is not used

      if (itemIndex > -1) {
        const updatedItem = { ...currentOrder[itemIndex], instructions: instructions.trim() || undefined };
        const updatedOrder = [...currentOrder]; // Create a new array
        updatedOrder[itemIndex] = updatedItem;
        newOrders.set(tableId, updatedOrder);
      }
      return newOrders;
    });
  }, []);

  const removeItemFromOrder = useCallback((tableId: string, menuItemId: string, itemUniqueId?: string) => {
    setOrders(prevOrders => {
      const newOrders = new Map(prevOrders);
      let currentOrder = newOrders.get(tableId) || [];
      let updatedOrder;

      if (itemUniqueId) {
         updatedOrder = currentOrder.filter(item => item.uniqueId !== itemUniqueId);
      } else {
        // Fallback: remove the first item matching menuItemId if uniqueId isn't provided
        const firstMatchIndex = currentOrder.findIndex(item => item.menuItem.id === menuItemId);
        updatedOrder = firstMatchIndex > -1 ? currentOrder.filter((_, idx) => idx !== firstMatchIndex) : [...currentOrder];
      }

      newOrders.set(tableId, updatedOrder);

      // Update table status if order becomes empty and not 'paying' or 'reserved'
      if (updatedOrder.length === 0 && getTableStatus(tableId) !== 'paying' && getTableStatus(tableId) !== 'reserved') {
        updateTableStatus(tableId, 'available');
      }
      return newOrders;
    });
  }, [getTableStatus, updateTableStatus]);


  const removeItemsByGroupId = useCallback((tableId: string, groupId: string) => {
    setOrders(prevOrders => {
      const newOrders = new Map(prevOrders);
      let currentOrder = newOrders.get(tableId) || [];
      const normalizedGroupId = groupId?.trim() || undefined; // Treat empty string groupId as undefined for comparison

      const updatedOrder = currentOrder.filter(item => (item.groupId || undefined) !== normalizedGroupId);
      newOrders.set(tableId, updatedOrder);

      const currentTableStatus = getTableStatus(tableId);
      if (updatedOrder.length === 0 && currentTableStatus !== 'reserved') {
        updateTableStatus(tableId, 'available');
      } else if (updatedOrder.length > 0 && currentTableStatus === 'paying') {
        // If there are still items left from other groups, keep table occupied.
        updateTableStatus(tableId, 'occupied');
      }
      return newOrders;
    });
  }, [getTableStatus, updateTableStatus]);


  const updateItemStatus = useCallback((tableId: string, menuItemId: string, status: OrderItem['status'], itemUniqueId?: string) => {
    setOrders(prevOrders => {
      const newOrders = new Map(prevOrders);
      const currentOrder = newOrders.get(tableId) || [];

      // Prefer uniqueId for matching
      const itemIndex = itemUniqueId
        ? currentOrder.findIndex(item => item.uniqueId === itemUniqueId)
        : currentOrder.findIndex(item => item.menuItem.id === menuItemId); // Fallback

      if (itemIndex > -1) {
        const updatedItem = { ...currentOrder[itemIndex], status };
        const updatedOrder = [...currentOrder];
        updatedOrder[itemIndex] = updatedItem;
        newOrders.set(tableId, updatedOrder);
      }
      return newOrders;
    });
  }, []);

  const sendOrderToKitchen = useCallback(async (tableId: string) => {
    // Get currentUser using useAuth() inside the callback
    // eslint-disable-next-line react-hooks/rules-of-hooks
  // const { currentUser } = useAuth(); // Moved to top of OrderProvider
  // useAuth() is already called at the top of OrderProvider scope

    if (!currentUser?.restaurantId || !currentUser?.uid) {
      toast.error('User not properly authenticated. Cannot send order.');
      console.error('sendOrderToKitchen: Missing restaurantId or uid from currentUser.', currentUser);
      return;
    }

    const restaurantId = currentUser.restaurantId;
    const waiterId = currentUser.uid;

    const localOrderItems = getOrderForTable(tableId);
    const itemsToSync = localOrderItems.filter(item => item.status === 'pending' || item.status === 'sent_to_kitchen');

    if (itemsToSync.length === 0) {
      toast.success('No new items to send to kitchen.');
      return;
    }

    try {
      toast.loading('Sending order to kitchen...');

      const fbOrderItems: FbOrderItemStructure[] = itemsToSync.map(item => ({
        // Ensure this structure matches what Firebase expects.
        // Assuming FbOrderItemStructure is compatible with OrderItem from @/lib/types
        // and we map fields as required.
        menuItemId: item.menuItem.id,
        menuItemName: item.menuItem.name,
        quantity: item.quantity,
        unitPrice: item.menuItem.price, // Assuming menuItem.price is the unit price
        totalPrice: item.menuItem.price * item.quantity,
        status: 'pending_kitchen', // Default status for new/updated items in FB
        // Include other fields from OrderItem if they are part of FbOrderItemStructure
        // and expected by Firebase functions (e.g., instructions, uniqueId if needed)
        uniqueId: item.uniqueId,
        instructions: item.instructions,
        groupId: item.groupId,
        createdAt: item.createdAt, // Keep original creation time for reference
        menuItem: item.menuItem, // Keep full menuItem if FbOrderItemStructure includes it
      }));

      const subtotal = fbOrderItems.reduce((acc, item) => acc + item.totalPrice, 0);
      // For now, totalAmount is same as subtotal. Taxes/fees might be handled backend.
      const totalAmount = subtotal;
      const orderStatus: OrderStatus = 'pending_kitchen';

      const firestoreOrderId = activeFirestoreOrders.get(tableId);

      let successMessage = '';

      if (firestoreOrderId) {
        // Update existing order
        const updatePayload: Partial<Omit<Order, 'id' | 'restaurantId' | 'createdAt' | 'updatedAt'>> = {
          items: fbOrderItems,
          status: orderStatus,
          subtotal,
          totalAmount,
          // userId: waiterId, // Should not update userId
          // tableId: tableId, // Should not update tableId
          updatedAt: Date.now(), // Manually set updatedAt, or let backend handle
        };
        await updateOrder(restaurantId, firestoreOrderId, updatePayload);
        successMessage = 'Order updated successfully!';
      } else {
        // Create new order
        const newOrderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> = {
          restaurantId,
          userId: waiterId,
          tableId,
          tableNumber: null, // Pass null for tableNumber as it's not managed here
          items: fbOrderItems,
          status: orderStatus,
          subtotal,
          totalAmount,
          orderNumber: `ord-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, // Example order number
          // customerNotes: "", // Optional: if there's a way to add customer notes
          // paymentDetails: null, // Optional
          // serviceStaffId: waiterId, // Optional, if different from userId creating order
        };
        const createdOrder = await createOrder(restaurantId, newOrderData);
        if (createdOrder?.id) {
          setActiveFirestoreOrders(prev => new Map(prev).set(tableId, createdOrder.id));
          successMessage = 'Order sent to kitchen successfully!';
        } else {
          throw new Error('Failed to create order in Firebase, no ID returned.');
        }
      }

      // Update local status for synced items after successful Firebase operation
      setOrders(prevOrders => {
        const newOrders = new Map(prevOrders);
        const currentOrder = newOrders.get(tableId) || [];
        const itemsToSyncIds = new Set(itemsToSync.map(item => item.uniqueId));

        const updatedOrder = currentOrder.map(item =>
          itemsToSyncIds.has(item.uniqueId)
            ? { ...item, status: 'sent_to_kitchen' as OrderItem['status'] } // Or 'confirmed_by_kitchen'
            : item
        );
        newOrders.set(tableId, updatedOrder);
        return newOrders;
      });

      toast.dismiss();
      toast.success(successMessage);

    } catch (error) {
      toast.dismiss();
      // It's good practice to check the error type if possible
      if (error instanceof Error) {
        toast.error(`Error: ${error.message}`);
        console.error('Error sending order to kitchen:', error.message, error.stack);
      } else {
        toast.error('An unexpected error occurred while sending the order.');
        console.error('Error sending order to kitchen (unknown type):', error);
      }
    }
  }, [currentUser, getOrderForTable, setOrders, activeFirestoreOrders, setActiveFirestoreOrders]); // Replaced useAuth with currentUser


  const clearOrder = useCallback((tableId: string) => {
    setOrders(prevOrders => {
      const newOrders = new Map(prevOrders);
      newOrders.delete(tableId);
      return newOrders;
    });
    // Reset table status to available if not reserved
     if (getTableStatus(tableId) !== 'reserved') {
      updateTableStatus(tableId, 'available');
    }
  }, [getTableStatus, updateTableStatus]);


  const getAssignedWaiterId = useCallback((tableId: string): string | undefined => {
    return waiterAssignments.get(tableId);
  }, [waiterAssignments]);

  const assignWaiterToTable = useCallback((tableId: string, waiterId: string) => {
    setWaiterAssignments(prevAssignments => {
        const newAssignments = new Map(prevAssignments);
        newAssignments.set(tableId, waiterId);
        return newAssignments;
    });
  }, []);

  const clearWaiterAssignment = useCallback((tableId: string) => {
    setWaiterAssignments(prevAssignments => {
        const newAssignments = new Map(prevAssignments);
        newAssignments.delete(tableId);
        return newAssignments;
    });
  }, []);

  const archiveOrder = useCallback((tableId: string, finalBillAmount?: number, paymentMethod?: HistoricalOrder['paymentMethod'], paymentNote?: string) => {
    const itemsToArchive = orders.get(tableId);
    if (!itemsToArchive || itemsToArchive.length === 0) return; // Don't archive empty orders

    const actualTotalAmount = finalBillAmount !== undefined ? finalBillAmount :
      itemsToArchive.reduce((sum, item) => sum + (item.menuItem?.price || 0) * item.quantity, 0);

    const historicalOrder: HistoricalOrder = {
      id: `hist-${tableId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, // More unique ID
      originalTableId: tableId,
      items: JSON.parse(JSON.stringify(itemsToArchive.map(item => ({...item, status: 'served' as OrderItem['status']})))) , // Ensure items are deep copied
      completedAt: Date.now(),
      totalAmount: actualTotalAmount,
      paymentMethod: paymentMethod,
      paymentNote: paymentNote || undefined,
    };

    setOrderHistory(prevHistory => {
      const newHistory = new Map(prevHistory);
      const tableHistory = newHistory.get(tableId) || [];
      newHistory.set(tableId, [historicalOrder, ...tableHistory].slice(0, 10)); // Keep last 10 historical orders per table
      return newHistory;
    });
  }, [orders]);

  const getHistoricalOrdersForTable = useCallback((tableId: string): HistoricalOrder[] => {
    return (orderHistory.get(tableId) || []).sort((a, b) => b.completedAt - a.completedAt);
  }, [orderHistory]);

  const getHistoricalOrderById = useCallback((orderId: string): HistoricalOrder | undefined => {
    for (const tableHistory of orderHistory.values()) {
        const foundOrder = tableHistory.find(order => order.id === orderId);
        if (foundOrder) {
            return foundOrder;
        }
    }
    return undefined;
  }, [orderHistory]);


  const repeatOrder = useCallback((tableId: string, historicalOrderItems: OrderItem[]) => {
    historicalOrderItems.forEach(histItem => {
        // Use the addItemToOrder function to add items one by one
        // This ensures quantities are merged if an identical pending item exists
        addItemToOrder(tableId, histItem.menuItem, histItem.quantity, histItem.instructions, histItem.groupId);
    });

    // Update table status if it was 'available' or 'reserved'
    const currentStatus = getTableStatus(tableId);
    if (currentStatus === 'available' || currentStatus === 'reserved') {
        updateTableStatus(tableId, 'occupied');
    }
  }, [addItemToOrder, getTableStatus, updateTableStatus]);

  const getTableNote = useCallback((tableId: string): string | undefined => {
    return tableNotes.get(tableId);
  }, [tableNotes]);

  const updateTableNote = useCallback((tableId: string, note: string) => {
    setTableNotes(prevNotes => {
      const newNotes = new Map(prevNotes);
      if (note.trim()) {
        newNotes.set(tableId, note.trim());
      } else {
        newNotes.delete(tableId); // Remove note if it's empty or just whitespace
      }
      return newNotes;
    });
  }, []);

  const addTip = useCallback((amount: number, tableId?: string, notes?: string) => {
    setTips(prevTips => {
      const newTip: TipEntry = {
        id: `tip-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        amount,
        timestamp: Date.now(),
        tableId: tableId?.trim() || undefined,
        notes: notes?.trim() || undefined,
      };
      return [...prevTips, newTip];
    });
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
    if (currentOrder.length === 0) {
      return null;
    }
    // Filter out any items that might not have a valid createdAt timestamp
    const validTimestamps = currentOrder.map(item => item.createdAt).filter(ts => typeof ts === 'number' && !isNaN(ts));
    if (validTimestamps.length === 0) return null; // No valid timestamps found
    return Math.min(...validTimestamps);
  }, [getOrderForTable]);


  const contextValue = useMemo(() => ({
    orders,
    tableStatuses,
    waiterAssignments,
    orderHistory,
    tableNotes,
    tips,
    getOrderForTable,
    addItemToOrder,
    updateItemQuantity,
    updateItemInstructions,
    removeItemFromOrder,
    removeItemsByGroupId,
    updateItemStatus,
    clearOrder,
    sendOrderToKitchen,
    getTableStatus,
    updateTableStatus,
    calculateTotal,
    getTotalItemsForTable,
    getFirstItemAddedTime,
    assignWaiterToTable,
    clearWaiterAssignment,
    getAssignedWaiterId,
    archiveOrder,
    getHistoricalOrdersForTable,
    getHistoricalOrderById,
    repeatOrder,
    getTableNote,
    updateTableNote,
    addTip,
  }), [
        orders, tableStatuses, waiterAssignments, orderHistory, tableNotes, tips,
        getOrderForTable, addItemToOrder, updateItemQuantity, updateItemInstructions, removeItemFromOrder, removeItemsByGroupId,
        updateItemStatus, clearOrder, sendOrderToKitchen, getTableStatus, updateTableStatus,
        calculateTotal, getTotalItemsForTable, getFirstItemAddedTime,
        assignWaiterToTable, clearWaiterAssignment, getAssignedWaiterId,
        archiveOrder, getHistoricalOrdersForTable, getHistoricalOrderById, repeatOrder,
        getTableNote, updateTableNote, addTip,
    ]);

  return <OrderContext.Provider value={contextValue}>{children}</OrderContext.Provider>;
};

export const useOrders = (): OrderContextType => {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};
