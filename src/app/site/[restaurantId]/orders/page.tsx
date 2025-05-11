
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
import type { RestaurantProfile, ClientOrder, OrderItem, OrderStatus as OrderStatusType } from '@/types';
import TopNavigationBar from '@/components/site/public-homepage/top-navigation-bar';
import SiteFooter from '@/components/site/public-homepage/site-footer';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/components/site/public-homepage/cart-store';
import { ShoppingBag, ArrowLeft, RefreshCw, Clock, Utensils, CheckCircle, XCircle, Hourglass } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { getOrdersCollectionPath, convertFirebaseTimestampToString } from '@/lib/firebase/utils';
import { format, parseISO } from 'date-fns';
import { generateOrderEta } from '@/ai/flows/generate-order-eta-flow'; // Assuming this will be created

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
  const { toast } = useToast();
  const { cart } = useCart();

  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNavShadow, setShowNavShadow] = useState(false);
  const [etas, setEtas] = useState<Record<string, string>>({}); // { orderId: etaString }

  const cartItemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  useEffect(() => {
    if (!restaurantId) {
      router.push('/'); // Or an error page
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

  useEffect(() => {
    if (!restaurantId || !db) return;

    setLoading(true);
    // For now, fetching all orders. In a real app, this should be user-specific.
    // This demo fetches orders for the restaurant, not filtered by current user.
    const ordersColRef = collection(db, getOrdersCollectionPath(restaurantId));
    // Fetching recent orders, e.g., last 10 or last 24 hours.
    const q = query(ordersColRef, orderBy('createdAt', 'desc'), where('createdAt', '>', Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000)))); 

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: convertFirebaseTimestampToString(docSnap.data().createdAt),
        updatedAt: convertFirebaseTimestampToString(docSnap.data().updatedAt),
      } as ClientOrder));
      setOrders(fetchedOrders);
      setLoading(false);

      // Fetch ETAs for relevant orders
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
  }, [restaurantId, toast]);


  const fetchEta = async (order: ClientOrder) => {
    try {
      // Basic restaurant load for now
      const load = orders.length > 5 ? 'high' : orders.length > 2 ? 'medium' : 'low';
      const etaResult = await generateOrderEta({ 
        orderId: order.id, 
        items: order.items, 
        currentRestaurantLoad: load 
      });
      setEtas(prev => ({ ...prev, [order.id]: etaResult.eta }));
    } catch (error) {
      console.error(`Failed to fetch ETA for order ${order.id}:`, error);
      setEtas(prev => ({ ...prev, [order.id]: "Soon" })); // Fallback ETA
    }
  };

  if (loading && !restaurant) { // Show full page loader only on initial load
    return <div className="flex h-screen items-center justify-center"><LoadingSpinner className="h-10 w-10 text-primary" /></div>;
  }

  if (!restaurant) {
    return <div className="flex h-screen items-center justify-center text-destructive p-8 text-center">Restaurant data could not be loaded.</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-muted/5 to-background">
      <TopNavigationBar
        restaurantName={restaurant.name}
        restaurantLogoUrl={`https://picsum.photos/seed/${restaurant.id}logo/40/40`}
        cartItemCount={cartItemCount}
        showShadow={showNavShadow}
        restaurantId={restaurant.id}
      />
      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center">
                <ShoppingBag className="mr-3 h-7 w-7" /> My Orders
            </h1>
            <Button variant="outline" size="sm" onClick={() => router.push(`/site/${restaurantId}`)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> New Order
            </Button>
        </div>

        {loading && orders.length === 0 ? (
            <div className="text-center py-10"><LoadingSpinner className="h-8 w-8 text-primary" /> <p className="mt-2 text-muted-foreground">Loading your orders...</p></div>
        ) : orders.length === 0 ? (
          <Card className="text-center py-12 shadow-lg border-primary/20">
            <CardHeader>
                <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground opacity-50 mb-4" />
                <CardTitle className="text-2xl">No Orders Yet</CardTitle>
                <CardDescription>You haven&apos;t placed any orders with {restaurant.name} recently.</CardDescription>
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
                    <Link href={`/site/${restaurantId}`}>Start Your Order</Link>
                </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {orders.map(order => {
              const statusInfo = orderStatusConfig[order.status];
              const IconComponent = statusInfo.icon;
              return (
                <Card key={order.id} className={`shadow-lg border-l-4 ${highlightedOrderId === order.id ? 'border-accent ring-2 ring-accent' : statusInfo.color.replace('text-','border-') }`}>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                      <div>
                        <CardTitle className="text-lg md:text-xl">Order ID: <span className="font-mono text-primary">{order.id.substring(0, 8)}...</span></CardTitle>
                        <CardDescription>
                          Placed on: {format(parseISO(order.createdAt), 'MMM d, yyyy, h:mm a')}
                          {order.tableNumber && <span className="ml-2 font-medium text-foreground">(Table: {order.tableNumber})</span>}
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
                        <li key={item.menuItemId} className="flex justify-between">
                          <span>{item.menuItemName} <span className="text-muted-foreground">x{item.quantity}</span></span>
                          <span>${item.totalPrice.toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-semibold text-md">
                        <span>Total:</span>
                        <span>${order.totalAmount.toFixed(2)}</span>
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
                    <Button variant="outline" size="sm">View Details (Soon)</Button>
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
