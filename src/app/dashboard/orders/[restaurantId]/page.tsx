// src/app/dashboard/orders/[restaurantId]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth/context';
import { getRestaurant } from '@/lib/firebase/firestore';
import { getOrdersByRestaurant, updateOrderStatus } from '@/lib/firebase/orders';
import type { RestaurantProfile, Order, OrderStatus as OrderStatusType, OrderItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Eye, MoreHorizontal, Clock, Utensils, CheckCircle, XCircle, Send } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const orderStatusConfig: Record<OrderStatusType, { label: string; color: string; icon?: React.ElementType, shortLabel?: string }> = {
  pending_customer_confirmation: { label: 'Pending Customer Confirmation', shortLabel: 'Pending Cust.', color: 'bg-gray-500 text-gray-50', icon: Clock },
  pending_kitchen: { label: 'Pending Kitchen Acceptance', shortLabel: 'Pending Kitchen', color: 'bg-yellow-500 text-yellow-50', icon: Clock },
  confirmed_by_kitchen: { label: 'Kitchen Confirmed', shortLabel: 'Kitchen Confirmed', color: 'bg-orange-500 text-orange-50', icon: Utensils },
  preparing: { label: 'Preparing', shortLabel: 'Preparing', color: 'bg-blue-500 text-blue-50', icon: Utensils },
  ready_for_pickup: { label: 'Ready for Pickup', shortLabel: 'Ready Pickup', color: 'bg-purple-500 text-purple-50', icon: ShoppingCart },
  served: { label: 'Served', shortLabel: 'Served', color: 'bg-teal-500 text-teal-50', icon: CheckCircle },
  payment_pending: { label: 'Payment Pending', shortLabel: 'Payment Pend.', color: 'bg-indigo-500 text-indigo-50', icon: DollarSign },
  completed: { label: 'Completed', shortLabel: 'Completed', color: 'bg-green-500 text-green-50', icon: CheckCircle },
  cancelled_by_customer: { label: 'Cancelled by Customer', shortLabel: 'Cancelled (Cust)', color: 'bg-red-600 text-red-50', icon: XCircle },
  cancelled_by_restaurant: { label: 'Cancelled by Restaurant', shortLabel: 'Cancelled (Rest)', color: 'bg-red-700 text-red-50', icon: XCircle },
};

// Define possible next statuses for each current status
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

interface ClientOrder extends Omit<Order, 'createdAt' | 'updatedAt'> {
  createdAt: string; // Changed from Date to string (ISO format)
  updatedAt: string; // Changed from Date to string (ISO format)
}

function DollarSign(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}


export default function OrderManagementPage() {
  const params = useParams();
  const restaurantId = params.restaurantId as string;
  const searchParams = useSearchParams();
  const filterTableId = searchParams.get('tableId');

  const { user, role, initialLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<OrderStatusType | 'all'>('all');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const fetchRestaurantAndOrders = useCallback(async () => {
    if (!restaurantId || !user) return;
    setPageLoading(true);
    try {
      const restaurantData = await getRestaurant(restaurantId);
      if (restaurantData && (restaurantData.ownerId === user.uid || (role === 'staff' && user.restaurantId === restaurantId))) {
        setRestaurant(restaurantData);
        const statusFilter = activeTab === 'all' ? undefined : [activeTab];
        let fetchedOrdersRaw = await getOrdersByRestaurant(restaurantId, statusFilter);
        
        if (filterTableId) {
          fetchedOrdersRaw = fetchedOrdersRaw.filter(order => order.tableId === filterTableId);
        }

        const convertTimestampToString = (ts: any): string => {
          if (ts instanceof Timestamp) {
            return ts.toDate().toISOString();
          }
          if (ts instanceof Date) { // Should ideally not happen if source is Firestore Timestamp
            return ts.toISOString();
          }
           if (typeof ts === 'string') { // If it's already a string, assume it's valid ISO
             try {
               new Date(ts); // Check if it's a valid date string
               return ts;
             } catch (e) {
               console.warn("Invalid date string encountered during conversion:", ts);
               return new Date().toISOString(); // Fallback
             }
           }
          // Fallback for Firestore Timestamp structure if not instance of Timestamp (e.g. after serialization)
          if (ts && typeof ts.seconds === 'number' && typeof ts.nanoseconds === 'number') {
            return new Date(ts.seconds * 1000 + ts.nanoseconds / 1000000).toISOString();
          }
          console.warn("Unexpected timestamp format during conversion:", ts, "Returning current date as ISO string.");
          return new Date().toISOString(); 
        };
        
        const fetchedOrdersClient: ClientOrder[] = fetchedOrdersRaw.map(o => ({
          ...o,
          createdAt: convertTimestampToString(o.createdAt),
          updatedAt: convertTimestampToString(o.updatedAt),
        })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); 

        setOrders(fetchedOrdersClient);
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
  }, [restaurantId, user, role, router, toast, activeTab, filterTableId]);

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

  const handleStatusChange = async (orderId: string, newStatus: OrderStatusType) => {
    setUpdatingOrderId(orderId);
    try {
      await updateOrderStatus(restaurantId, orderId, newStatus);
      toast({ title: "Order Status Updated", description: `Order marked as ${orderStatusConfig[newStatus].label}.` });
      fetchRestaurantAndOrders(); 
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message || "Could not update order status." });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleViewDetails = (order: ClientOrder) => {
    toast({ title: "Feature Coming Soon", description: `Details for Order #${order.id.substring(0,6)} will be shown here.`});
  };


  if (authLoading || pageLoading) {
    return <div className="flex h-full items-center justify-center"><LoadingSpinner className="h-10 w-10 text-primary" /></div>;
  }
  if (!restaurant) {
    return <Card><CardHeader><CardTitle>Error</CardTitle></CardHeader><CardContent><p>Restaurant not found or no permission.</p></CardContent></Card>;
  }

  const getItemsSummary = (items: OrderItem[]) => {
    if (!items || items.length === 0) return "No items";
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    return `${totalQuantity} item${totalQuantity > 1 ? 's' : ''}`;
  };
  
  const statusTabs: { value: OrderStatusType | 'all'; label: string }[] = [
    { value: 'all', label: 'All Active' },
    ...Object.entries(orderStatusConfig)
     .filter(([statusKey]) => !['completed', 'cancelled_by_customer', 'cancelled_by_restaurant'].includes(statusKey)) // Exclude completed/cancelled from main tabs
     .map(([statusKey, { shortLabel, label }]) => ({
        value: statusKey as OrderStatusType,
        label: shortLabel || label,
    })),
    { value: 'completed', label: orderStatusConfig.completed.shortLabel || orderStatusConfig.completed.label },
    { value: 'cancelled_by_restaurant', label: orderStatusConfig.cancelled_by_restaurant.shortLabel || orderStatusConfig.cancelled_by_restaurant.label }
  ];


  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-4 md:mb-0">
              <CardTitle className="text-2xl md:text-3xl flex items-center">
                <ShoppingCart className="mr-3 h-7 w-7 text-primary" /> Order Management
              </CardTitle>
              <CardDescription>
                View and manage orders for {restaurant.name}. {filterTableId ? `(Filtered for Table ${orders.find(o => o.tableId === filterTableId)?.tableNumber || filterTableId})` : ''}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as OrderStatusType | 'all')} className="w-full">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:flex lg:flex-wrap lg:w-auto mb-4">
              {statusTabs.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value} className="text-xs px-2 py-1.5 h-auto lg:flex-initial">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeTab} className="mt-0"> {/* Remove mt-6 if TabsList has mb-4 */}
              {orders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Order ID</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right w-[180px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map(order => {
                      const StatusIcon = orderStatusConfig[order.status]?.icon;
                      return (
                        <TableRow key={order.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium text-xs">#{order.id.substring(0, 6)}...</TableCell>
                          <TableCell>{order.tableNumber || 'N/A'}</TableCell>
                          <TableCell className="text-xs">{format(new Date(order.createdAt), 'MMM d, p')}</TableCell>
                          <TableCell className="text-xs">{getItemsSummary(order.items)}</TableCell>
                          <TableCell className="text-right font-medium">${order.totalAmount.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={`${orderStatusConfig[order.status].color} text-xs whitespace-nowrap`}>
                              {StatusIcon && <StatusIcon className="h-3 w-3 mr-1.5" />}
                              {orderStatusConfig[order.status].label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Select 
                                value={order.status}
                                onValueChange={(newStatus) => handleStatusChange(order.id, newStatus as OrderStatusType)}
                                disabled={updatingOrderId === order.id || (possibleNextStatuses[order.status]?.length === 0 && order.status !== 'completed')}
                              >
                                <SelectTrigger id={`status-${order.id}`} className="h-8 text-xs w-[130px] bg-card">
                                  <SelectValue placeholder="Update..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={order.status} disabled>{orderStatusConfig[order.status].label} (Current)</SelectItem>
                                  {possibleNextStatuses[order.status]?.map(nextStatus => (
                                    <SelectItem key={nextStatus} value={nextStatus} className="text-xs">{orderStatusConfig[nextStatus].label}</SelectItem>
                                  ))}
                                  {!['completed', 'cancelled_by_customer', 'cancelled_by_restaurant'].includes(order.status) && (
                                    <SelectItem value="completed" className="text-xs">{orderStatusConfig.completed.label}</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={updatingOrderId === order.id}>
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Order Actions</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewDetails(order)}>
                                    <Eye className="mr-2 h-4 w-4" /> View Details
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-10 border-2 border-dashed rounded-lg bg-muted/30">
                  <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Orders Found</h3>
                  <p className="text-muted-foreground">
                    {activeTab === 'all' ? 'There are no active or recent orders currently.' : `No orders match the status: ${orderStatusConfig[activeTab as OrderStatusType]?.label || activeTab}.`}
                  </p>
                  <Image src="https://picsum.photos/seed/noorders/300/200" alt="No orders illustration" width={300} height={200} className="mt-6 mx-auto rounded-md opacity-70" data-ai-hint="empty list food" />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
