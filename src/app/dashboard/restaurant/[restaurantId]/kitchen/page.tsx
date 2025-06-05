

'use client';
import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { updateOrderItemStatusInFirestore } from '@/lib/firebase/orders';
import { getOrdersCollectionPath, convertFirebaseTimestampToString } from '@/lib/firebase/utils';
import type { OrderStatus as OverallOrderStatus, ClientOrder, OrderItemStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase/config';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNowStrict, parseISO, differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import KitchenOrderTicket from '@/components/kds/KitchenOrderTicket';
import { BellRing, Utensils, ChefHat, CheckCircle } from 'lucide-react'; // Icons for tabs

type KdsTabStatus = 'new' | 'preparing' | 'ready';

const KDS_STATUS_MAP: Record<KdsTabStatus, { label: string; statuses: OverallOrderStatus[], icon: React.ElementType }> = {
  new: { label: 'New Orders', statuses: ['pending_kitchen', 'confirmed_by_kitchen'], icon: BellRing },
  preparing: { label: 'Preparing', statuses: ['preparing'], icon: Utensils },
  ready: { label: 'Ready for Pickup', statuses: ['ready_for_pickup'], icon: ChefHat },
};

// Re-defined here for KDS specific display, might differ from main order status config
const KDS_ITEM_STATUS_CONFIG: Record<OrderItemStatus, { label: string; color: string; nextAction?: OrderItemStatus, nextActionLabel?: string }> = {
  pending: { label: 'Pending', color: 'bg-gray-400 text-gray-800', nextAction: 'sent_to_kitchen', nextActionLabel: "Send to Kitchen" },
  sent_to_kitchen: { label: 'New', color: 'bg-blue-500 text-white', nextAction: 'confirmed_by_kitchen', nextActionLabel: "Confirm" },
  confirmed_by_kitchen: { label: 'Confirmed', color: 'bg-sky-500 text-white', nextAction: 'preparing', nextActionLabel: "Start Preparing" },
  preparing: { label: 'Preparing', color: 'bg-yellow-500 text-yellow-900', nextAction: 'ready_for_pickup', nextActionLabel: "Mark Ready" },
  ready_for_pickup: { label: 'Ready', color: 'bg-green-500 text-white', nextAction: 'served', nextActionLabel: "Mark Served" }, // 'served' is a waiter action usually
  served: { label: 'Served', color: 'bg-teal-500 text-white' },
  cancelled_by_kitchen: { label: 'Cancelled (Kitchen)', color: 'bg-red-500 text-white' },
  cancelled_by_customer: { label: 'Cancelled (Cust)', color: 'bg-red-400 text-white' },
};

const toClientOrder = (docId: string, data: any): ClientOrder => {
  const orderBase: Omit<ClientOrder, 'id' | 'createdAt' | 'updatedAt'> = {
    restaurantId: data.restaurantId, userId: data.userId, tableId: data.tableId || null, tableNumber: data.tableNumber || null,
    items: (data.items || []).map((item: any) => ({
        ...item,
        uniqueId: item.uniqueId || `${item.menuItemId}-${item.createdAt || Date.now()}-${Math.random().toString(36).substring(7)}`,
        status: item.status || 'sent_to_kitchen',
        createdAt: item.createdAt || Date.now(),
        updatedAt: item.updatedAt || Date.now(),
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
  const [activeKdsTab, setActiveKdsTab] = useState<KdsTabStatus>('new');
  const [updatingItems, setUpdatingItems] = useState<Record<string, boolean>>({}); // { itemUniqueId: true/false }

  const newOrderSoundRef = typeof Audio !== "undefined" ? new Audio('/sounds/kds-new-order.mp3') : null;

  useEffect(() => {
    if (!restaurantId || !db) return;
    setLoading(true);
    const ordersColRef = collection(db, getOrdersCollectionPath(restaurantId));
    const relevantStatuses: OverallOrderStatus[] = ['pending_kitchen', 'confirmed_by_kitchen', 'preparing', 'ready_for_pickup'];
    
    const q = query(
      ordersColRef,
      where('status', 'in', relevantStatuses),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const previousOrderCount = allKitchenOrders.length;
      const fetchedOrders = snapshot.docs.map(docSnap => toClientOrder(docSnap.id, docSnap.data()));
      
      if (fetchedOrders.length > previousOrderCount && previousOrderCount > 0 && newOrderSoundRef) {
         newOrderSoundRef.play().catch(e => console.warn("KDS sound play failed:", e));
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

  const handleItemStatusChange = async (orderId: string, itemUniqueId: string, newStatus: OrderItemStatus) => {
    setUpdatingItems(prev => ({ ...prev, [itemUniqueId]: true }));
    try {
      await updateOrderItemStatusInFirestore(restaurantId, orderId, itemUniqueId, newStatus);
      toast({ title: "Item Status Updated", description: `Item marked as ${KDS_ITEM_STATUS_CONFIG[newStatus]?.label || newStatus}.` });
      // Optional: Trigger overall order status check here if KDS should influence it
      // await checkAndUpdateOverallOrderStatus(restaurantId, orderId);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message || "Could not update item status." });
    } finally {
      setUpdatingItems(prev => ({ ...prev, [itemUniqueId]: false }));
    }
  };

  const filteredOrders = useMemo(() => {
    const targetStatuses = KDS_STATUS_MAP[activeKdsTab].statuses;
    return allKitchenOrders.filter(order => targetStatuses.includes(order.status));
  }, [activeKdsTab, allKitchenOrders]);


  return (
    <div className="h-screen flex flex-col bg-muted/40">
      <header className="bg-background border-b shadow-sm p-3 sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary flex items-center">
             <ChefHat className="mr-2 h-6 w-6" /> Kitchen Display System
          </h1>
          <Tabs value={activeKdsTab} onValueChange={(value) => setActiveKdsTab(value as KdsTabStatus)}>
            <TabsList className="grid grid-cols-3 gap-1 h-10">
              {(Object.keys(KDS_STATUS_MAP) as KdsTabStatus[]).map(tabKey => {
                const TabIcon = KDS_STATUS_MAP[tabKey].icon;
                return (
                  <TabsTrigger key={tabKey} value={tabKey} className="text-xs px-2 py-1.5 h-full flex items-center gap-1.5">
                     <TabIcon className="h-4 w-4"/> {KDS_STATUS_MAP[tabKey].label}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </Tabs>
        </div>
      </header>

      <main className="flex-grow overflow-y-auto p-3 md:p-4">
        {loading ? (
          <div className="flex justify-center items-center h-full"><LoadingSpinner className="w-12 h-12 text-primary" /></div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
            <CheckCircle size={64} className="mb-4 text-green-500" />
            <p className="text-xl font-semibold">All caught up!</p>
            <p>No orders currently in the "{KDS_STATUS_MAP[activeKdsTab].label}" queue.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4">
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
    </div>
  );
}


    