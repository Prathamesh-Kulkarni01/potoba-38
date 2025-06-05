
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getRestaurant } from '@/lib/firebase/firestore';
import { updateOrderItemStatusInFirestore, getOrder } from '@/lib/firebase/orders'; // Changed from updateOrder
import { getOrdersCollectionPath, convertFirebaseTimestampToString } from '@/lib/firebase/utils';
import type { RestaurantProfile, OrderStatus as OrderStatusType, OrderItem, ClientOrder, OrderItemStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase/config';
import { collection, query, where, orderBy, onSnapshot, Timestamp, QueryConstraint } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, ChevronUp, Clock, Loader2, CheckCircle, PlayCircle, XCircle, Utensils, ArrowRight } from 'lucide-react';
import { formatDistanceToNowStrict, format, addMinutes, differenceInMinutes, parseISO } from 'date-fns';

const kitchenStatuses: OrderStatusType[] = ['pending_kitchen', 'confirmed_by_kitchen', 'preparing', 'ready_for_pickup'];
const orderStatusConfig: Record<OrderStatusType | OrderItemStatus, { label: string; color?: string; shortLabel?: string }> = {
  pending_customer_confirmation: { label: 'Pending Customer Confirmation', color: 'text-yellow-500' },
  pending_kitchen: { label: 'Pending Kitchen', color: 'text-yellow-600' },
  confirmed_by_kitchen: { label: 'Kitchen Confirmed', color: 'text-orange-500' },
  preparing: { label: 'Preparing', color: 'text-blue-500' },
  ready_for_pickup: { label: 'Ready for Pickup', color: 'text-green-500' },
  served: { label: 'Served', color: 'text-green-700' },
  payment_pending: { label: 'Payment Pending', color: 'text-purple-500' },
  completed: { label: 'Completed', color: 'text-gray-500' },
  cancelled_by_customer: { label: 'Cancelled by Customer', color: 'text-red-500' },
  cancelled_by_restaurant: { label: 'Cancelled by Restaurant', color: 'text-red-700' },
  // Item Specific (can reuse or add more)
  pending: { label: 'Pending Item', color: 'text-yellow-400', shortLabel: 'Pending' },
  sent_to_kitchen: { label: 'Item Sent', color: 'text-orange-400', shortLabel: 'Sent' },
  cancelled_by_kitchen: { label: 'Cancelled (Kitchen)', color: 'text-red-600', shortLabel: 'Cancelled'},
};

const possibleNextItemStatuses: Record<OrderItemStatus, OrderItemStatus[]> = {
    pending: ['sent_to_kitchen', 'cancelled_by_kitchen'],
    sent_to_kitchen: ['confirmed_by_kitchen', 'preparing', 'cancelled_by_kitchen'],
    confirmed_by_kitchen: ['preparing', 'cancelled_by_kitchen'],
    preparing: ['ready_for_pickup', 'cancelled_by_kitchen'],
    ready_for_pickup: ['served', 'cancelled_by_kitchen'], // 'served' might be done by waiter
    served: [], // Typically no next KDS status
    cancelled_by_kitchen: [],
    cancelled_by_customer: [], // Should not be set by KDS
};


const toClientOrder = (docId: string, data: any): ClientOrder => {
  const orderBase: Omit<ClientOrder, 'id' | 'createdAt' | 'updatedAt'> = {
    restaurantId: data.restaurantId, userId: data.userId, tableId: data.tableId || null, tableNumber: data.tableNumber || null,
    items: (data.items || []).map((item: any) => ({
        ...item,
        uniqueId: item.uniqueId || `${item.menuItemId}-${item.createdAt || Date.now()}`,
        status: item.status || 'pending_kitchen', // Default for items if not set
        createdAt: item.createdAt || Date.now(),
        updatedAt: item.updatedAt || Date.now(),
    })) as OrderItem[], 
    subtotal: data.subtotal, totalAmount: data.totalAmount, status: data.status as OrderStatusType,
    taxAmount: typeof data.taxAmount === 'number' ? data.taxAmount : undefined, serviceCharge: typeof data.serviceCharge === 'number' ? data.serviceCharge : undefined,
    discountAmount: typeof data.discountAmount === 'number' ? data.discountAmount : undefined, customerNotes: typeof data.customerNotes === 'string' ? data.customerNotes : undefined,
    kitchenNotes: typeof data.kitchenNotes === 'string' ? data.kitchenNotes : undefined, paymentMethod: typeof data.paymentMethod === 'string' ? data.paymentMethod : undefined,
    transactionId: typeof data.transactionId === 'string' ? data.transactionId : undefined, customerName: typeof data.customerName === 'string' ? data.customerName : undefined,
    customerPhoneNumber: typeof data.customerPhoneNumber === 'string' ? data.customerPhoneNumber : undefined,
  };
  return { id: docId, ...orderBase, createdAt: convertFirebaseTimestampToString(data.createdAt), updatedAt: convertFirebaseTimestampToString(data.updatedAt) };
};

export default function KitchenOrderTicketPage() {
  const params = useParams();
  const restaurantId = params.restaurantId as string;
  const { toast } = useToast();
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingItem, setUpdatingItem] = useState<{ orderId: string; itemUniqueId: string } | null>(null);

  useEffect(() => {
    if (!restaurantId || !db) return;
    setLoading(true);
    const ordersColRef = collection(db, getOrdersCollectionPath(restaurantId));
    const q = query(
      ordersColRef,
      where('status', 'in', kitchenStatuses),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(docSnap => toClientOrder(docSnap.id, docSnap.data()));
      setOrders(fetchedOrders);
      setLoading(false);
    }, (error) => {
      toast({ variant: "destructive", title: "Error", description: "Could not load kitchen orders." });
      setLoading(false);
    });
    return () => unsubscribe();
  }, [restaurantId, toast]);

  const handleItemStatusChange = async (orderId: string, itemUniqueId: string, newStatus: OrderItemStatus) => {
    setUpdatingItem({ orderId, itemUniqueId });
    try {
      await updateOrderItemStatusInFirestore(restaurantId, orderId, itemUniqueId, newStatus);
      toast({ title: "Item Status Updated", description: `Item marked as ${orderStatusConfig[newStatus].label}.` });
      // After item status change, check if overall order status needs update
      // This logic should be in OrderContext or a shared utility to ensure consistency
      // For now, KDS focuses on item status. Waiter app might handle overall status progression.
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message || "Could not update item status." });
    } finally {
      setUpdatingItem(null);
    }
  };

  function getElapsedInfo(createdAt: string) {
    const created = typeof createdAt === 'string' ? parseISO(createdAt) : new Date(createdAt);
    const now = new Date();
    const mins = differenceInMinutes(now, created);
    let color = 'text-green-600';
    if (mins >= 20) color = 'text-red-600';
    else if (mins >= 10) color = 'text-yellow-600';
    return { mins, color };
  }

  function getEta(createdAt: string) {
    const created = typeof createdAt === 'string' ? parseISO(createdAt) : new Date(createdAt);
    return addMinutes(created, 20);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            Kitchen Order Tickets (KOT)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-40"><LoadingSpinner /></div>
          ) : orders.length === 0 ? (
            <div className="text-center text-muted-foreground py-10">No active kitchen orders at the moment.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {orders.map(order => {
                const { mins: elapsedMins, color: elapsedColor } = getElapsedInfo(order.createdAt);
                const etaTime = getEta(order.createdAt);
                const overallOrderStatusInfo = orderStatusConfig[order.status] || { label: order.status, color: 'text-gray-500'};
                const statusColorBar = overallOrderStatusInfo.color?.replace('text-', 'bg-') || 'bg-gray-500';
                
                return (
                  <div key={order.id} className={`relative bg-card rounded-xl shadow-lg flex flex-col border border-muted min-h-[260px] p-0 overflow-hidden transition-all duration-200`}>
                    <div className={`h-2 w-full ${statusColorBar}`} />
                    <div className="flex flex-col gap-2 p-4 pb-0">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                            <span className="font-mono text-md text-muted-foreground">#{order.id.substring(0, 6)}</span>
                            <span className="ml-2 font-bold text-lg">Table {order.tableNumber || 'N/A'}</span>
                        </div>
                        <Badge className={`${statusColorBar} text-white font-semibold px-2.5 py-1 text-xs`}>
                          {overallOrderStatusInfo.label}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground font-medium mb-1">
                        <span><Clock className="inline h-3.5 w-3.5 mr-0.5" />{format(parseISO(order.createdAt), 'HH:mm')}</span>
                        <span className={elapsedColor + ' font-semibold'}>Elapsed: {elapsedMins} min</span>
                        <span>ETA: {format(etaTime, 'HH:mm')}</span>
                      </div>

                      <div className="mb-1">
                        <div className="font-semibold text-md mb-1.5 text-primary">Items:</div>
                        <ul className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {(order.items || []).map((item) => {
                            const itemStatusInfo = orderStatusConfig[item.status] || { label: item.status, color: 'text-gray-500' };
                            const isItemUpdating = updatingItem?.orderId === order.id && updatingItem?.itemUniqueId === item.uniqueId;
                            const nextItemAction = item.status === 'sent_to_kitchen' ? 'confirmed_by_kitchen' :
                                                   item.status === 'confirmed_by_kitchen' ? 'preparing' :
                                                   item.status === 'preparing' ? 'ready_for_pickup' : null;
                            return (
                              <li key={item.uniqueId} className="bg-muted/50 rounded-lg p-2.5 text-sm flex flex-col gap-1 shadow-sm border border-muted-foreground/10">
                                <div className="flex justify-between items-start">
                                    <div className="flex-grow">
                                        <span className="font-bold text-foreground">{item.menuItemName}</span>
                                        <span className="text-primary font-semibold ml-2">x{item.quantity}</span>
                                        {item.variantChoices && item.variantChoices.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-0.5">
                                            {item.variantChoices.map((v, i) => (
                                            <Badge key={i} variant="outline" className="text-xs px-1.5 py-0.5">{v.variantName}: {v.optionName}</Badge>
                                            ))}
                                        </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0 ml-2">
                                        {isItemUpdating && <Loader2 className="animate-spin h-4 w-4 text-primary" />}
                                        <Badge variant="secondary" className={`${itemStatusInfo.color} text-xs`}>{itemStatusInfo.shortLabel || itemStatusInfo.label}</Badge>
                                    </div>
                                </div>
                                {item.instructions && <div className="text-xs text-blue-700 font-medium mt-0.5 italic">Note: {item.instructions}</div>}
                                
                                {nextItemAction && (
                                    <Button
                                        size="xs"
                                        variant="outline"
                                        className="mt-1.5 w-full text-xs h-7"
                                        disabled={isItemUpdating}
                                        onClick={() => handleItemStatusChange(order.id, item.uniqueId, nextItemAction)}
                                    >
                                        <ArrowRight className="h-3 w-3 mr-1.5"/> Mark as {orderStatusConfig[nextItemAction].label}
                                    </Button>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                      {order.kitchenNotes && <div className="text-xs text-orange-600 font-semibold mb-1 bg-orange-500/10 p-1.5 rounded">Kitchen Notes: {order.kitchenNotes}</div>}
                      {order.customerNotes && <div className="text-xs text-blue-600 font-semibold mb-1 bg-blue-500/10 p-1.5 rounded">Customer Notes: {order.customerNotes}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
