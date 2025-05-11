
// src/app/site/[restaurantId]/order-confirmation/page.tsx
'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { getRestaurant } from '@/lib/firebase/firestore';
import { getOrder } from '@/lib/firebase/orders'; // Assuming getOrder fetches a single order
import type { RestaurantProfile, ClientOrder } from '@/types';
import { CheckCircle, ShoppingBag, ArrowLeft } from 'lucide-react';
import TopNavigationBar from '@/components/site/public-homepage/top-navigation-bar';
import SiteFooter from '@/components/site/public-homepage/site-footer';
import { useCart } from '@/components/site/public-homepage/cart-store';

function OrderConfirmationContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantId = params.restaurantId as string;
  const orderId = searchParams.get('orderId');
  const isTableOrder = searchParams.get('tableOrder') === 'true';
  const tableNumber = searchParams.get('tableNumber');

  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [order, setOrder] = useState<ClientOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNavShadow, setShowNavShadow] = useState(false);
  const { cart } = useCart(); // Access cart to display count if needed

  useEffect(() => {
    if (restaurantId && orderId) {
      Promise.all([
        getRestaurant(restaurantId),
        getOrder(restaurantId, orderId),
      ]).then(([restaurantData, orderData]) => {
        if (restaurantData) {
          setRestaurant(restaurantData as RestaurantProfile);
        } else {
          console.error("Restaurant not found for confirmation page");
          // router.push('/'); // Or an error page
        }
        if (orderData) {
          setOrder(orderData);
        } else {
          console.error("Order not found for confirmation page");
           // router.push(`/site/${restaurantId}`); // Or an error page
        }
      }).catch(err => {
        console.error("Failed to fetch restaurant or order details for confirmation", err);
      }).finally(() => setLoading(false));
    } else {
        // router.push('/'); // Missing essential params
        setLoading(false);
    }

    const handleScroll = () => setShowNavShadow(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [restaurantId, orderId, router]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><LoadingSpinner className="h-10 w-10 text-primary" /></div>;
  }

  if (!restaurant || !order) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center text-center p-4 bg-gradient-to-br from-background via-muted/5 to-background">
        <Card className="max-w-md w-full shadow-xl border-destructive/50">
            <CardHeader>
                <CardTitle className="text-2xl text-destructive">Oops! Something went wrong.</CardTitle>
                <CardDescription>We couldn't load your order confirmation. This might be a temporary issue or an invalid link.</CardDescription>
            </CardHeader>
            <CardContent>
                <Image src="https://picsum.photos/seed/ordererror/300/200" alt="Error Illustration" width={300} height={200} className="mx-auto rounded-lg my-4" data-ai-hint="sad empty plate"/>
                <p className="text-muted-foreground mb-6">
                   { !restaurant && "Restaurant details could not be found. " }
                   { !order && "Order details could not be found. " }
                   Please try again later or contact support if the problem persists.
                </p>
                <Button asChild variant="outline" className="w-full">
                    <Link href={restaurantId ? `/site/${restaurantId}` : '/'}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Go to Restaurant Menu
                    </Link>
                </Button>
            </CardContent>
        </Card>
      </div>
    );
  }
  
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);


  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-muted/5 to-background">
      <TopNavigationBar
        restaurantName={isTableOrder && tableNumber ? `${restaurant.name} - Table ${tableNumber}` : restaurant.name}
        restaurantLogoUrl={`https://picsum.photos/seed/${restaurant.id}logo/40/40`}
        cartItemCount={cartItemCount}
        showShadow={showNavShadow}
        restaurantId={restaurant.id}
        tableContext={isTableOrder && tableNumber && order.tableId ? { id: order.tableId, number: tableNumber, docId: order.tableId } : undefined}
      />
      <main className="container mx-auto px-4 py-8 flex-grow flex items-center justify-center">
        <Card className="w-full max-w-lg text-center shadow-xl border-green-500/30">
          <CardHeader>
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <CardTitle className="text-3xl font-bold text-primary">Order Placed Successfully!</CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              Thank you for your order at {restaurant.name}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="font-medium">Your Order ID: <span className="text-accent">{order.id.substring(0, 8)}...</span></p>
            {isTableOrder && tableNumber && (
              <p className="text-md text-foreground">
                Your order for <strong className="text-primary">Table {tableNumber}</strong> has been received.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {isTableOrder 
                ? "Our team will start preparing your items shortly. You can track its progress or add more items from your table."
                : "We've received your order and will begin processing it soon. You'll receive updates via email (if provided)."
              }
            </p>
            <Image 
              src={`https://picsum.photos/seed/orderconfirm${order.id}/300/180`} 
              alt="Order confirmation visual" 
              width={300} height={180} 
              className="mx-auto rounded-lg my-6 shadow-md"
              data-ai-hint="happy food delivery"
            />
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button asChild className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href={`/site/${restaurantId}/orders?highlight=${order.id}`}>
                  <ShoppingBag className="mr-2 h-4 w-4" /> View My Orders
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href={`/site/${restaurantId}`}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Menu
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <SiteFooter restaurantName={restaurant.name} />
    </div>
  );
}


export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><LoadingSpinner className="h-10 w-10 text-primary" /></div>}>
      <OrderConfirmationContent />
    </Suspense>
  );
}
