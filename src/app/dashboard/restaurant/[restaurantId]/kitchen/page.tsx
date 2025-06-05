
'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { updateOrderItemStatusInFirestore, deriveOverallOrderStatus } from '@/lib/firebase/orders';
import { getOrdersCollectionPath, convertFirebaseTimestampToString } from '@/lib/firebase/utils';
import type { OrderStatus as OverallOrderStatus, ClientOrder, OrderItemStatus, OrderItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase/config';
import { collection, query, where, orderBy, onSnapshot, Timestamp, doc, runTransaction } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNowStrict, parseISO, differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import KitchenOrderTicket from '@/components/kds/KitchenOrderTicket';
import { BellRing, Utensils, ChefHat, CheckCircle, Settings2, Users as GroupIcon } from 'lucide-react'; 
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { KDS_ITEM_STATUS_CONFIG, KDS_OVERALL_STATUS_TABS_CONFIG } from '@/config/kdsConfig'; // Corrected import path

const toClientOrder = (docId: string, data: any): ClientOrder => {
  const orderBase: Omit<ClientOrder, 'id' | 'createdAt' | 'updatedAt'> = {
    restaurantId: data.restaurantId, userId: data.userId, tableId: data.tableId || null, tableNumber: data.tableNumber || null,
    items: (data.items || []).map((item: any) => ({
        ...item,
        uniqueId: item.uniqueId || `${item.menuItemId}-${item.createdAt || Date.now()}-${Math.random().toString(36).substring(7)}`,
        status: item.status || 'sent_to_kitchen', 
        createdAt: typeof item.createdAt === 'number' ? item.createdAt : (item.createdAt?.toDate?.().getTime() || Date.now()),
        updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : (item.updatedAt?.toDate?.().getTime() || Date.now()),
        groupId: typeof item.groupId === 'string' ? item.groupId : null,
    })),
    subtotal: data.subtotal, totalAmount: data.totalAmount, status: data.status as OverallOrderStatus,
    taxAmount: typeof data.taxAmount === 'number' ? data.taxAmount : undefined, serviceCharge: typeof data.serviceCharge === 'number' ? data.serviceCharge : undefined,
    discountAmount: typeof data.discountAmount === 'number' ? data.discountAmount : undefined, customerNotes: typeof data.customerNotes === 'string' ? data.customerNotes : undefined,
    kitchenNotes: typeof data.kitchenNotes === 'string' ? data.kitchenNotes : undefined, paymentMethod: typeof data.paymentMethod === 'string' ? data.paymentMethod : undefined,
    transactionId: typeof data.transactionId === 'string' ? data.transactionId : undefined, customerName: typeof data.customerName === 'string' ? data.customerName : undefined,
    customerPhoneNumber: typeof data.customerPhoneNumber === 'string' ? data.customerPhoneNumber : undefined,
    groupId: typeof data.groupId === 'string' ? data.groupId : null, 
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
  const itemReadySoundRef = typeof Audio !== "undefined" ? new Audio('/sounds/kds-item-ready.mp3') : null; 

  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);


  useEffect(() => {
    if (!restaurantId || !db) return;
    setLoading(true);
    const ordersColRef = collection(db, getOrdersCollectionPath(restaurantId));
    
    const relevantOverallStatuses: OverallOrderStatus[] = [
      'pending_kitchen', 'confirmed_by_kitchen', 'preparing', 'ready_for_pickup'
    ];
    
    const q = query(
      ordersColRef,
      where('status', 'in', relevantOverallStatuses),
      orderBy('createdAt', 'asc') 
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const previousOrderMap = new Map(allKitchenOrders.map(o => [o.id, o]));
      const fetchedOrders = snapshot.docs.map(docSnap => toClientOrder(docSnap.id, docSnap.data()));
      
      let newOrderSoundPlayed = false;
      fetchedOrders.forEach(newOrder => {
        const oldOrder = previousOrderMap.get(newOrder.id);
        if (!oldOrder && (newOrder.status === 'pending_kitchen' || newOrder.status === 'confirmed_by_kitchen')) {
           if (audioEnabled && newOrderSoundRef && !newOrderSoundPlayed) {
                try {
                newOrderSoundRef.play().catch(e => console.warn("KDS new order sound play failed (non-critical):", e));
                newOrderSoundPlayed = true; // Play sound only once per batch of new orders
                } catch (e) { console.warn("Error attempting to play new order sound:", e); }
            }
        }
      });
      setAllKitchenOrders(fetchedOrders);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching KDS orders:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load kitchen orders." });
      setLoading(false);
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, toast, audioEnabled]); // Removed allKitchenOrders from deps to prevent sound on every item update

  const handleItemStatusChange = useCallback(async (orderId: string, itemUniqueId: string, newStatus: OrderItemStatus) => {
    setUpdatingItems(prev => ({ ...prev, [itemUniqueId]: true }));
    try {
      await updateOrderItemStatusInFirestore(restaurantId, orderId, itemUniqueId, newStatus); 
      // Firestore listener will update the local state (allKitchenOrders), re-deriving overall status.
      // The `updateOrderItemStatusInFirestore` now handles deriving and updating the overall order status too.
      toast({ title: "Item Status Updated", description: `Item marked as ${KDS_ITEM_STATUS_CONFIG[newStatus]?.label || newStatus}.` });
       if (newStatus === 'ready_for_pickup' && audioEnabled && itemReadySoundRef) {
        try {
            itemReadySoundRef.play().catch(e => console.warn("KDS item ready sound play failed (non-critical):", e));
        } catch (e) { console.warn("Error attempting to play item ready sound:", e); }
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
        if (!tabConfig.statuses.includes(order.status)) {
            return false;
        }
        // For specific tabs, we might need to ensure items are actually in the relevant state
        if (activeKdsTabKey === 'new') {
            // Show if overall order status is pending/confirmed OR if any item is sent_to_kitchen or confirmed_by_kitchen
            return tabConfig.statuses.includes(order.status) || 
                   order.items.some(item => item.status === 'sent_to_kitchen' || item.status === 'confirmed_by_kitchen');
        }
        if (activeKdsTabKey === 'preparing') {
            return tabConfig.statuses.includes(order.status) && order.items.some(item => item.status === 'preparing');
        }
        if (activeKdsTabKey === 'ready') {
            // Show if overall is ready_for_pickup OR if any item is ready_for_pickup and not all served/cancelled
            return tabConfig.statuses.includes(order.status) || 
                  (order.items.some(item => item.status === 'ready_for_pickup') && 
                   !order.items.every(item => item.status === 'served' || item.status === 'cancelled_by_customer' || item.status === 'cancelled_by_kitchen'));
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
