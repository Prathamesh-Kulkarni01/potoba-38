// src/app/dashboard/orders/[restaurantId]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { getRestaurant } from '@/lib/firebase/firestore';
import { getOrdersByRestaurant, updateOrderStatus } from '@/lib/firebase/orders';
import type { RestaurantProfile, Order, OrderStatus, OrderItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Edit, CheckCircle, XCircle, Clock, Utensils, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns'; // For formatting timestamps

const orderStatusColors: Record<OrderStatus, string> = {
  pending_customer_confirmation: 'bg-gray-500',
  pending_kitchen: 'bg-yellow-500',
  confirmed_by_kitchen: 'bg-orange-500',
  preparing: 'bg-blue-500',
  ready_for_pickup: 'bg-purple-500',
  served: 'bg-teal-500',
  payment_pending: 'bg-indigo-500',
  completed: 'bg-green-500',
  cancelled_by_customer: 'bg-red-600',
  cancelled_by_restaurant: 'bg-red-700',
};

const orderStatusLabels: Record<OrderStatus, string> = {
  pending_customer_confirmation: 'Pending Customer',
  pending_kitchen: 'Pending Kitchen',
  confirmed_by_kitchen: 'Kitchen Confirmed',
  preparing: 'Preparing',
  ready_for_pickup: 'Ready for Pickup',
  served: 'Served',
  payment_pending: 'Payment Pending',
  completed: 'Completed',
  cancelled_by_customer: 'Cancelled (Customer)',
  cancelled_by_restaurant: 'Cancelled (Restaurant)',
};

// Define possible next statuses for each current status
const possibleNextStatuses: Record<OrderStatus, OrderStatus[]> = {
  pending_customer_confirmation: ['pending_kitchen', 'cancelled_by_restaurant'],
  pending_kitchen: ['confirmed_by_kitchen', 'cancelled_by_restaurant'],
  confirmed_by_kitchen: ['preparing', 'cancelled_by_restaurant'],
  preparing: ['ready_for_pickup', 'served', 'cancelled_by_restaurant'], // 'served' if no pickup step
  ready_for_pickup: ['served', 'completed', 'cancelled_by_restaurant'], // 'completed' if payment at pickup
  served: ['payment_pending', 'completed'], // 'completed' if paid at table right away
  payment_pending: ['completed', 'cancelled_by_restaurant'], // e.g. dine and dash
  completed: [],
  cancelled_by_customer: [],
  cancelled_by_restaurant: [],
};


export default function OrderManagementPage() {
  const params = useParams();
  const restaurantId = params.restaurantId as string;
  const searchParams = useSearchParams();
  const filterTableId = searchParams.get('tableId');

  const { user, role, initialLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [selectedFilterStatus, setSelectedFilterStatus] = useState<OrderStatus | 'all'>('all');

  const fetchRestaurantAndOrders = useCallback(async () => {
    if (!restaurantId || !user) return;
    setPageLoading(true);
    try {
      const restaurantData = await getRestaurant(restaurantId);
      if (restaurantData && (restaurantData.ownerId === user.uid || (role === 'staff' && user.restaurantId === restaurantId))) {
        setRestaurant(restaurantData);
        const statusFilter = selectedFilterStatus === 'all' ? undefined : [selectedFilterStatus];
        let fetchedOrders = await getOrdersByRestaurant(restaurantId, statusFilter);
        if (filterTableId) {
          fetchedOrders = fetchedOrders.filter(order => order.tableId === filterTableId);
        }
        setOrders(fetchedOrders);
      } else {
        toast({ variant: "destructive", title: "Access Denied", description: "Restaurant not found or you don't have permission." });
        router.replace('/dashboard');
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load order data." });
    } finally {
      setPageLoading(false);
    }
  }, [restaurantId, user, role, router, toast, selectedFilterStatus, filterTableId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || (role !== 'owner' && role !== 'staff')) {
      router.replace('/dashboard');
      return;
    }
    if (role === 'staff' && user.restaurantId !== restaurantId) {
        router.replace('/dashboard');
        return;
    }
    if (restaurantId) {
      fetchRestaurantAndOrders();
    } else {
      router.replace('/dashboard');
    }
  }, [restaurantId, user, role, authLoading, router, fetchRestaurantAndOrders]);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrderStatus(restaurantId, orderId, newStatus);
      toast({ title: "Order Status Updated", description: `Order marked as ${orderStatusLabels[newStatus]}.` });
      fetchRestaurantAndOrders(); // Refresh orders
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message || "Could not update order status." });
    }
  };

  const OrderCard = ({ order }: { order: Order }) => (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Order #{order.id.substring(0, 6)} (Table {order.tableNumber})</CardTitle>
          <Badge className={`${orderStatusColors[order.status]} text-white text-xs px-2 py-1`}>{orderStatusLabels[order.status]}</Badge>
        </div>
        <CardDescription>
          Created: {format(order.createdAt.toDate(), 'PPpp')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1 text-sm mb-3 max-h-32 overflow-y-auto">
          {order.items.map((item, index) => (
            <li key={index} className="flex justify-between">
              <span>{item.quantity}x {item.menuItemName}</span>
              <span>${item.totalPrice.toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <p className="font-semibold text-right">Total: ${order.totalAmount.toFixed(2)}</p>
        {order.customerNotes && <p className="text-xs text-muted-foreground mt-1">Notes: {order.customerNotes}</p>}
      </CardContent>
      <CardFooter className="flex-col items-start space-y-2">
         <Label htmlFor={`status-${order.id}`} className="text-xs">Update Status:</Label>
         <div className="flex w-full gap-2">
            <Select 
              defaultValue={order.status}
              onValueChange={(newStatus) => handleStatusChange(order.id, newStatus as OrderStatus)}
              disabled={possibleNextStatuses[order.status]?.length === 0 && order.status !== 'completed'}
            >
              <SelectTrigger id={`status-${order.id}`} className="flex-grow">
                <SelectValue placeholder="Change status" />
              </SelectTrigger>
              <SelectContent>
                {/* Current status always selectable */}
                <SelectItem value={order.status} disabled>{orderStatusLabels[order.status]} (Current)</SelectItem>
                {/* Possible next statuses */}
                {possibleNextStatuses[order.status]?.map(nextStatus => (
                  <SelectItem key={nextStatus} value={nextStatus}>{orderStatusLabels[nextStatus]}</SelectItem>
                ))}
                 {/* Allow setting to completed if not already, and not cancelled */}
                {!['completed', 'cancelled_by_customer', 'cancelled_by_restaurant'].includes(order.status) && (
                  <SelectItem value="completed">{orderStatusLabels.completed}</SelectItem>
                )}
              </SelectContent>
            </Select>
            {/* <Button size="sm" variant="outline"><Edit className="h-3 w-3 mr-1"/> Details</Button> */}
         </div>
      </CardFooter>
    </Card>
  );

  if (authLoading || pageLoading) {
    return <div className="flex h-full items-center justify-center"><LoadingSpinner className="h-10 w-10 text-primary" /></div>;
  }
  if (!restaurant) {
    return <Card><CardHeader><CardTitle>Error</CardTitle></CardHeader><CardContent><p>Restaurant not found or no permission.</p></CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-4 md:mb-0">
              <CardTitle className="text-2xl md:text-3xl flex items-center">
                <ShoppingCart className="mr-3 h-7 w-7 text-primary" /> Order Management for {restaurant.name}
              </CardTitle>
              <CardDescription>
                View and manage incoming customer orders. {filterTableId ? `(Filtered for Table ${orders.find(o => o.tableId === filterTableId)?.tableNumber || filterTableId})` : ''}
              </CardDescription>
            </div>
            <div className="w-full md:w-auto md:min-w-[200px]">
                <Select value={selectedFilterStatus} onValueChange={(value) => setSelectedFilterStatus(value as OrderStatus | 'all')}>
                    <SelectTrigger><SelectValue placeholder="Filter by status..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Active Orders</SelectItem>
                        {Object.entries(orderStatusLabels)
                            .filter(([statusKey]) => !['completed', 'cancelled_by_customer', 'cancelled_by_restaurant'].includes(statusKey))
                            .map(([statusKey, statusLabel]) => (
                                <SelectItem key={statusKey} value={statusKey}>{statusLabel}</SelectItem>
                        ))}
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled_by_customer">Cancelled (Customer)</SelectItem>
                        <SelectItem value="cancelled_by_restaurant">Cancelled (Restaurant)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {orders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {orders.map(order => <OrderCard key={order.id} order={order} />)}
            </div>
          ) : (
            <div className="text-center py-10 border-2 border-dashed rounded-lg bg-muted/30">
              <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Orders Found</h3>
              <p className="text-muted-foreground">
                {selectedFilterStatus === 'all' ? 'There are no active orders currently.' : `No orders match the status: ${orderStatusLabels[selectedFilterStatus as OrderStatus]}.`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
