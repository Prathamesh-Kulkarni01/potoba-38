// src/app/site/[restaurantId]/orders/page.tsx
'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { getRestaurant } from '@/lib/firebase/firestore';
import type { RestaurantProfile, ClientOrder, OrderItem, OrderStatus as OrderStatusType, ClientTableGroup, TableGroup } from '@/types';
import TopNavigationBar from '@/components/site/public-homepage/top-navigation-bar';
import SiteFooter from '@/components/site/public-homepage/site-footer';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/components/site/public-homepage/cart-store';
import { ShoppingBag, ArrowLeft, RefreshCw, Clock, Utensils, CheckCircle, XCircle, Hourglass, Users } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, Timestamp, QueryConstraint, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { getOrdersCollectionPath, convertFirebaseTimestampToString } from '@/lib/firebase/utils';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { generateOrderEta } from '@/ai/flows/generate-order-eta-flow';
import { useAuth } from '@/lib/auth/context'; 

const orderStatusConfig: Record<OrderStatusType, { label: string; icon: React.ElementType; color: string; progress?: number }> = {
  pending_customer_confirmation: { label: 'Pending Your OK', icon: Hourglass, color: 'text-gray-500', progress: 10 },
  pending_kitchen: { label: 'Awaiting Kitchen', icon: Hourglass, color: 'text-yellow-500', progress: 25 },
  confirmed_by_kitchen: { label: 'Kitchen Confirmed', icon: Utensils, color: 'text-orange-500', progress: 40 },
  preparing: { label: 'Preparing', icon: Utensils, color: 'text-blue-500', progress: 60 },
  ready_for_pickup: { label: 'Ready for Pickup', icon: ShoppingBag, color: 'text-purple-500', progress: 85 },
  served: { label: 'Served', icon: CheckCircle, color: 'text-teal-500', progress: 90 },
  payment_pending: { label: 'Payment Pending', icon: Clock, color: 'text-indigo-500', progress: 95 },
  completed: { label: 'Completed', icon: CheckCircle, color: 'text-green-500', progress: 100 },
  cancelled_by_customer: { label: 'Cancelled by You', icon: XCircle, color: 'text-red-500', progress: 0 },
  cancelled_by_restaurant: { label: 'Cancelled by Restaurant', icon: XCircle, color: 'text-red-600', progress: 0 },
};


function MyOrdersContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantId = params.restaurantId as string;
  const highlightedOrderId = searchParams.get('highlight');
  const tableContextId = searchParams.get('tableId'); 
  const groupIdFromUrl = searchParams.get('groupId'); // Get groupId from URL

  const { toast } = useToast();
  const { cart } = useCart();
  const { user, loading: authLoading } = useAuth(); 

  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNavShadow, setShowNavShadow] = useState(false);
  const [etas, setEtas] = useState<Record<string, string>>({});
  const [activeGroup, setActiveGroup] = useState<ClientTableGroup | null>(null); // State for active group

  const cartItemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  useEffect(() => {
    if (!restaurantId) {
      router.push('/'); 
      return;
    }
    getRestaurant(restaurantId)
      .then(data => {
        if (data) setRestaurant(data as RestaurantProfile);
        else router.push('/');
      })
      .catch(err => {
        console.error("Failed to fetch restaurant for orders page", err);
        router.push('/');
      });

    const handleScroll = () => setShowNavShadow(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [restaurantId, router]);

  // Listener for active group if groupIdFromUrl is present
  useEffect(() => {
    if (groupIdFromUrl && restaurantId && db) {
      const groupRef = doc(db, `restaurants/${restaurantId}/tableGroups`, groupIdFromUrl);
      const unsubscribe = onSnapshot(groupRef, (docSnap) => {
        if (docSnap.exists()) {
          const groupData = docSnap.data() as TableGroup;
          setActiveGroup({
             id: docSnap.id,
             ...groupData,
             createdAt: convertFirebaseTimestampToString(groupData.createdAt),
             updatedAt: convertFirebaseTimestampToString(groupData.updatedAt),
          });
        } else {
          setActiveGroup(null);
          // toast({variant: 'destructive', title: 'Group Ended', description: 'The group order session is no longer active.'});
        }
      });
      return () => unsubscribe();
    } else {
        setActiveGroup(null);
    }
  }, [groupIdFromUrl, restaurantId]);

  useEffect(() => {
    if (!restaurantId || !db || authLoading) return; 

    setLoading(true);
    const ordersColRef = collection(db, getOrdersCollectionPath(restaurantId));
    const queryConstraints: QueryConstraint[] = [];

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    queryConstraints.push(where('createdAt', '>=', Timestamp.fromDate(todayStart)));
    queryConstraints.push(where('createdAt', '<=', Timestamp.fromDate(todayEnd)));

    if (groupIdFromUrl) { // If it's a group order context, fetch all orders for that group
        queryConstraints.push(where('groupId', '==', groupIdFromUrl));
    } else if (user?.uid) { // Otherwise, filter by user ID
      queryConstraints.push(where('userId', '==', user.uid));
    } else {
      console.warn("MyOrdersPage: No user UID or groupId available to filter orders.");
      setOrders([]);
      setLoading(false);
      return;
    }
    
    // If tableContextId is present AND it's NOT a group order view (groupIdFromUrl is null), then filter by tableId.
    // This allows viewing individual orders for a table if not in a specific group context.
    if (tableContextId && !groupIdFromUrl) {
      queryConstraints.push(where('tableId', '==', tableContextId));
    }
    
    queryConstraints.push(orderBy('createdAt', 'desc')); 

    const unsubscribe = onSnapshot(query(ordersColRef, ...queryConstraints), (snapshot) => {
      const fetchedOrders = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: convertFirebaseTimestampToString(docSnap.data().createdAt),
        updatedAt: convertFirebaseTimestampToString(docSnap.data().updatedAt),
      } as ClientOrder));
      setOrders(fetchedOrders);
      setLoading(false);

      fetchedOrders.forEach(order => {
        if ((order.status === 'preparing' || order.status === 'confirmed_by_kitchen') && !etas[order.id]) {
          fetchEta(order);
        }
      });

    }, (error) => {
      console.error("Error listening to orders:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load live order data." });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [restaurantId, tableContextId, groupIdFromUrl, toast, user, authLoading]);


  const fetchEta = async (order: ClientOrder) => {
    try {
      const load = orders.length > 5 ? 'high' : orders.length > 2 ? 'medium' : 'low';
      const etaResult = await generateOrderEta({ 
        orderId: order.id, 
        items: order.items, 
        currentRestaurantLoad: load 
      });
      setEtas(prev => ({ ...prev, [order.id]: etaResult.eta }));
    } catch (error) {
      console.error(`Failed to fetch ETA for order ${order.id}:`, error);
      setEtas(prev => ({ ...prev, [order.id]: "Soon" })); 
    }
  };

  if ((loading && !restaurant) || authLoading) { 
    return <div className="flex h-screen items-center justify-center"><LoadingSpinner className="h-10 w-10 text-primary" /></div>;
  }

  if (!restaurant) {
    return <div className="flex h-screen items-center justify-center text-destructive p-8 text-center">Restaurant data could not be loaded.</div>;
  }
  
  const tableNumberForHeader = orders.find(o => o.tableId === tableContextId)?.tableNumber;


  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-muted/5 to-background">
      <TopNavigationBar
        restaurantName={tableContextId && tableNumberForHeader ? `${restaurant.name} - Table ${tableNumberForHeader}` : restaurant.name}
        restaurantLogoUrl={`https://picsum.photos/seed/${restaurant.id}logo/40/40`}
        cartItemCount={cartItemCount}
        showShadow={showNavShadow}
        restaurantId={restaurant.id}
        tableContext={tableContextId && tableNumberForHeader ? { id: tableContextId, number: tableNumberForHeader, docId: tableContextId } : undefined}
        isUserAnonymous={user?.isAnonymous}
        userDisplayName={user?.displayName || user?.email || (user?.isAnonymous ? "Guest" : "")}
        activeGroup={activeGroup || undefined}
      />
      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center">
                <ShoppingBag className="mr-3 h-7 w-7" /> 
                {groupIdFromUrl && activeGroup ? `Group Order: ${activeGroup.id}` : (tableContextId ? `Today's Orders for Table ${tableNumberForHeader || tableContextId.substring(0,4)}` : (user ? "My Recent Orders" : "Today's Orders"))}
            </h1>
            <Button variant="outline" size="sm" onClick={() => router.push(tableContextId ? `/menu/table/${tableContextId}${activeGroup ? `?joinGroup=${activeGroup.id}`:''}` : `/site/${restaurantId}`)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> New Order
            </Button>
        </div>

        {loading && orders.length === 0 ? (
            <div className="text-center py-10"><LoadingSpinner className="h-8 w-8 text-primary" /> <p className="mt-2 text-muted-foreground">Loading your orders...</p></div>
        ) : orders.length === 0 ? (
          <Card className="text-center py-12 shadow-lg border-primary/20">
            <CardHeader>
                <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground opacity-50 mb-4" />
                <CardTitle className="text-2xl">No Orders Yet Today</CardTitle>
                <CardDescription>No orders found for {groupIdFromUrl && activeGroup ? `group ${activeGroup.id}` : (tableContextId ? `table ${tableNumberForHeader || tableContextId.substring(0,4)}` : (user ? "you at this restaurant" : restaurant.name))} today.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Image 
                    src={`https://picsum.photos/seed/noorders${restaurant.id}/300/180`} 
                    alt="No orders illustration" 
                    width={300} height={180} 
                    className="mx-auto rounded-lg my-6 shadow-md opacity-80"
                    data-ai-hint="empty shopping bag"
                 />
                <Button asChild className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Link href={tableContextId ? `/menu/table/${tableContextId}${activeGroup ? `?joinGroup=${activeGroup.id}`:''}` : `/site/${restaurantId}`}>Start Your Order</Link>
                </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {orders.map(order => {
              const statusInfo = orderStatusConfig[order.status];
              const IconComponent = statusInfo.icon;
              const orderPlacedBy = (groupIdFromUrl && activeGroup && activeGroup.members.find(m => m.uid === order.userId)?.name) || order.customerName || (user?.uid === order.userId ? (user.displayName || 'You') : 'A customer');

              return (
                <Card key={order.id} className={`shadow-lg border-l-4 ${highlightedOrderId === order.id ? 'border-accent ring-2 ring-accent' : statusInfo.color.replace('text-','border-') }`}>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                      <div>
                        <CardTitle className="text-lg md:text-xl">Order ID: <span className="font-mono text-primary">{order.id.substring(0, 8)}...</span></CardTitle>
                        <CardDescription>
                          Placed: {format(parseISO(order.createdAt), 'MMM d, h:mm a')}
                          {order.tableNumber && <span className="ml-2 font-medium text-foreground">(Table: {order.tableNumber})</span>}
                          {orderPlacedBy && <span className="ml-2 font-medium text-foreground">(By: {orderPlacedBy})</span>}
                        </CardDescription>
                      </div>
                      <div className={`mt-2 sm:mt-0 text-sm font-semibold flex items-center px-3 py-1 rounded-full bg-muted ${statusInfo.color}`}>
                        <IconComponent className="mr-2 h-4 w-4" />
                        {statusInfo.label}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm mb-3">
                      {order.items.map(item => (
                        <li key={item.menuItemId + (item.variantChoices ? JSON.stringify(item.variantChoices) : '')} className="flex justify-between">
                          <span>{item.menuItemName} <span className="text-muted-foreground">x{item.quantity}</span></span>
                          <span>₹{item.totalPrice.toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-semibold text-md">
                        <span>Total:</span>
                        <span>₹{order.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                    {(order.status === 'preparing' || order.status === 'confirmed_by_kitchen') && (
                       <div className="mt-3 text-sm text-accent font-medium flex items-center">
                         <Hourglass className="mr-2 h-4 w-4 animate-spin"/>
                         Estimated Arrival: {etas[order.id] || 'Calculating...'}
                       </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button variant="outline" size="sm" disabled>View Details (Soon)</Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter restaurantName={restaurant.name} />
    </div>
  );
}

export default function MyOrdersPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><LoadingSpinner className="h-10 w-10 text-primary" /></div>}>
      <MyOrdersContent />
    </Suspense>
  );
}

