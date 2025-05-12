'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getRestaurant } from '@/lib/firebase/firestore';
import { updateOrder } from '@/lib/firebase/orders';
import { getOrdersCollectionPath, convertFirebaseTimestampToString } from '@/lib/firebase/utils';
import type { RestaurantProfile, OrderStatus as OrderStatusType, OrderItem, ClientOrder } from '@/types';
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

const kitchenStatuses: OrderStatusType[] = ['pending_kitchen', 'confirmed_by_kitchen', 'preparing'];
const orderStatusConfig: Record<OrderStatusType, { label: string; color?: string }> = {
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
};
const possibleNextStatuses: Record<OrderStatusType, OrderStatusType[]> = {
  pending_customer_confirmation: ['pending_kitchen', 'cancelled_by_restaurant', 'cancelled_by_customer'],
  pending_kitchen: ['confirmed_by_kitchen', 'cancelled_by_restaurant'],
  confirmed_by_kitchen: ['preparing', 'cancelled_by_restaurant'],
  preparing: ['ready_for_pickup', 'served', 'cancelled_by_restaurant'],
  ready_for_pickup: ['served', 'completed', 'cancelled_by_restaurant'],
  served: ['payment_pending', 'completed'],
  payment_pending: ['completed', 'cancelled_by_restaurant'],
  completed: [],
  cancelled_by_customer: [],
  cancelled_by_restaurant: [],
};

const toClientOrder = (docId: string, data: any): ClientOrder => {
  const orderBase: Omit<ClientOrder, 'id' | 'createdAt' | 'updatedAt'> = {
    restaurantId: data.restaurantId, userId: data.userId, tableId: data.tableId || null, tableNumber: data.tableNumber || null,
    items: data.items as OrderItem[], subtotal: data.subtotal, totalAmount: data.totalAmount, status: data.status as OrderStatusType,
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
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

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

  const handleStatusChange = async (orderId: string, currentStatus: OrderStatusType, newStatus: OrderStatusType) => {
    setUpdatingOrderId(orderId);
    try {
      await updateOrder(restaurantId, orderId, { status: newStatus });
      toast({ title: "Order Status Updated", description: `Order moved to ${orderStatusConfig[newStatus].label}.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message || "Could not update order status." });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Helper to get elapsed time and color
  function getElapsedInfo(createdAt: string) {
    const created = typeof createdAt === 'string' ? parseISO(createdAt) : new Date(createdAt);
    const now = new Date();
    const mins = differenceInMinutes(now, created);
    let color = 'text-green-600';
    if (mins >= 20) color = 'text-red-600';
    else if (mins >= 10) color = 'text-yellow-600';
    return { mins, color };
  }

  // Helper for ETA (20min after createdAt for demo)
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
            <div className="text-center text-muted-foreground py-10">No kitchen orders at the moment.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
              {orders.map(order => {
                const { mins, color } = getElapsedInfo(order.createdAt);
                const eta = getEta(order.createdAt);
                const isUpdating = updatingOrderId === order.id;
                // Status color bar
                const statusColor = orderStatusConfig[order.status].color?.replace('text-', 'bg-') || 'bg-gray-500';
                return (
                  <div key={order.id} className={`relative bg-card rounded-2xl shadow-2xl flex flex-col border border-muted min-h-[260px] p-0 overflow-hidden transition-all duration-200 ${isUpdating ? 'opacity-70' : ''}`}
                    style={{ boxShadow: '0 4px 24px 0 rgba(0,0,0,0.08)' }}>
                    {/* Status color bar */}
                    <div className={`h-2 w-full ${statusColor}`} />
                    {/* Overlay spinner when updating */}
                    {isUpdating && (
                      <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded-2xl">
                        <Loader2 className="animate-spin h-10 w-10 text-primary" />
                      </div>
                    )}
                    <div className="flex flex-col gap-2 p-5 pb-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-lg text-muted-foreground">#{order.id.substring(0, 6)}...</span>
                        <span className="ml-2 font-bold text-xl">Table {order.tableNumber || 'N/A'}</span>
                        <Badge className={statusColor + ' text-white font-bold px-3 py-1 text-base'}>
                          {orderStatusConfig[order.status].label}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-base text-muted-foreground font-medium mb-2">
                        <span><Clock className="inline h-5 w-5 mr-1" />{format(parseISO(order.createdAt), 'HH:mm')}</span>
                        <span className={color + ' font-bold'}>Elapsed: {mins} min</span>
                        <span>ETA: {format(eta, 'HH:mm')}</span>
                      </div>
                      <div className="mb-2">
                        <div className="font-bold text-lg mb-2 text-primary">Items:</div>
                        <ul className="space-y-3">
                          {(order.items || []).map((item, idx) => (
                            <li key={idx} className="bg-muted rounded-xl px-4 py-3 text-xl font-extrabold flex flex-col gap-1 shadow-sm border border-muted-foreground/10">
                              <div className="flex items-center gap-4 flex-wrap">
                                <Utensils className="h-6 w-6 text-primary" />
                                <span className="text-2xl font-black text-foreground">{item.menuItemName}</span>
                                <span className="text-primary text-2xl font-black ml-2">x{item.quantity}</span>
                              </div>
                              {/* Customizations/Variants */}
                              {item.variantChoices && item.variantChoices.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {item.variantChoices.map((v, i) => (
                                    <span key={i} className="bg-accent text-accent-foreground rounded-full px-3 py-1 text-base font-semibold border border-accent-foreground/20">
                                      {v.variantName}: <span className="font-bold">{v.optionName}</span>{v.optionPrice ? ` (+$${v.optionPrice})` : ''}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {/* Notes */}
                              {item.notes && <div className="ml-1 text-blue-700 text-base font-normal mt-1">Note: {item.notes}</div>}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {order.kitchenNotes && <div className="text-base text-orange-700 font-semibold mb-1">Kitchen Notes: {order.kitchenNotes}</div>}
                      {order.customerNotes && <div className="text-base text-blue-700 font-semibold mb-1">Customer Notes: {order.customerNotes}</div>}
                    </div>
                    {/* Actions */}
                    <div className="flex flex-col gap-3 p-5 pt-0 mt-auto">
                      {possibleNextStatuses[order.status]?.map(nextStatus => {
                        let btnColor: 'default' | 'destructive' | 'secondary' | 'outline' | 'ghost' | 'link' | undefined = 'default';
                        let btnIcon = <ArrowRight className="h-6 w-6 mr-2" />;
                        if (nextStatus === 'confirmed_by_kitchen') { btnColor = 'secondary'; btnIcon = <CheckCircle className="h-6 w-6 mr-2" />; }
                        if (nextStatus === 'preparing') { btnColor = 'secondary'; btnIcon = <PlayCircle className="h-6 w-6 mr-2" />; }
                        if (nextStatus === 'ready_for_pickup') { btnColor = 'secondary'; btnIcon = <CheckCircle className="h-6 w-6 mr-2" />; }
                        if (nextStatus === 'served') { btnColor = 'default'; btnIcon = <CheckCircle className="h-6 w-6 mr-2" />; }
                        if (nextStatus === 'cancelled_by_restaurant') { btnColor = 'destructive'; btnIcon = <XCircle className="h-6 w-6 mr-2" />; }
                        return (
                          <Button
                            key={nextStatus}
                            size="lg"
                            variant={btnColor}
                            className={`w-full text-lg font-bold px-6 py-4 rounded-xl shadow flex items-center justify-center ${isUpdating ? 'opacity-60' : ''}`}
                            disabled={isUpdating}
                            onClick={() => handleStatusChange(order.id, order.status, nextStatus)}
                          >
                            {btnIcon}
                            {orderStatusConfig[nextStatus].label}
                          </Button>
                        );
                      })}
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