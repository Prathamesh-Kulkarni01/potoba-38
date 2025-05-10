
// src/app/site/[restaurantId]/checkout/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { useCart } from '@/components/site/public-homepage/cart-store';
import { getRestaurant } from '@/lib/firebase/firestore';
import type { RestaurantProfile } from '@/types';
import TopNavigationBar from '@/components/site/public-homepage/top-navigation-bar';
import SiteFooter from '@/components/site/public-homepage/site-footer';
import { AlertCircle, CreditCard, ShoppingBag, Truck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


export default function CheckoutPage() {
  const params = useParams();
  const restaurantId = params.restaurantId as string;
  const { cart, clearCart } = useCart();
  const { toast } = useToast();
  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNavShadow, setShowNavShadow] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'card'>('card');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (restaurantId) {
      getRestaurant(restaurantId)
        .then(setRestaurant)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
     const handleScroll = () => setShowNavShadow(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [restaurantId]);

  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxRate = restaurant?.taxRate || 0.08;
  const tax = subtotal * taxRate;
  const deliveryFee = 5.00; // Example delivery fee
  const total = subtotal + tax + deliveryFee;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    // Simulate order placement
    await new Promise(resolve => setTimeout(resolve, 2000));

    // In a real app, you would call createOrder here and handle payment processing.
    // For example:
    // try {
    //   const orderData = { /* ... */ };
    //   await createOrder(restaurantId, orderData);
    //   // If card payment, integrate with Stripe/etc.
    //   clearCart();
    //   toast({ title: "Order Placed Successfully!", description: "Thank you for your order."});
    //   // Redirect to an order confirmation page
    // } catch (error) {
    //   toast({ variant: "destructive", title: "Order Failed", description: "Could not place your order."});
    // }

    toast({ title: "Order Placed Successfully! (Demo)", description: "Thank you for your order. This is a demo."});
    clearCart();
    setIsProcessing(false);
    // router.push(`/site/${restaurantId}/order-confirmation/SOME_ORDER_ID`); // Example redirect
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><LoadingSpinner className="h-10 w-10 text-primary" /></div>;
  }

  if (!restaurant) {
    return <div className="flex h-screen items-center justify-center text-destructive">Restaurant not found.</div>;
  }
  
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);


  return (
     <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-muted/10 to-background">
        <TopNavigationBar
            restaurantName={restaurant.name}
            restaurantLogoUrl={`https://picsum.photos/seed/${restaurant.id}logo/40/40`}
            cartItemCount={cartItemCount}
            showShadow={showNavShadow}
        />
        <main className="container mx-auto px-4 py-8 flex-grow">
            <Card className="max-w-4xl mx-auto shadow-xl">
            <CardHeader className="text-center">
                <ShoppingBag className="mx-auto h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-3xl font-bold">Checkout</CardTitle>
                <CardDescription>Finalize your order from {restaurant.name}.</CardDescription>
            </CardHeader>
            <CardContent>
                {cart.length === 0 && !isProcessing ? (
                    <div className="text-center py-10">
                        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg text-muted-foreground">Your cart is empty.</p>
                        <Button asChild variant="link" className="mt-2">
                            <Link href={`/site/${restaurantId}`}>Return to Menu</Link>
                        </Button>
                    </div>
                ) : (
                <form onSubmit={handlePlaceOrder} className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader><CardTitle className="text-lg">Delivery Information</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div><Label htmlFor="name">Full Name</Label><Input id="name" value={name} onChange={e => setName(e.target.value)} required /></div>
                                <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
                                <div><Label htmlFor="phone">Phone Number</Label><Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} required /></div>
                                <div><Label htmlFor="address">Delivery Address</Label><Input id="address" value={address} onChange={e => setAddress(e.target.value)} required /></div>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader><CardTitle className="text-lg">Payment Method</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                <Button type="button" variant={paymentMethod === 'card' ? 'default' : 'outline'} onClick={() => setPaymentMethod('card')} className="w-full justify-start text-left">
                                    <CreditCard className="mr-3 h-5 w-5"/> Pay with Card (Demo)
                                </Button>
                                <Button type="button" variant={paymentMethod === 'cod' ? 'default' : 'outline'} onClick={() => setPaymentMethod('cod')} className="w-full justify-start text-left">
                                    <Truck className="mr-3 h-5 w-5"/> Cash on Delivery (Demo)
                                </Button>
                                {paymentMethod === 'card' && (
                                    <div className="space-y-2 pt-2 border-t mt-3">
                                        <p className="text-sm text-muted-foreground">Card payment details would go here.</p>
                                        <Input placeholder="Card Number (Demo)" disabled/>
                                        <div className="flex gap-2">
                                            <Input placeholder="MM/YY (Demo)" className="flex-1" disabled/>
                                            <Input placeholder="CVC (Demo)" className="flex-1" disabled/>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                    <div className="space-y-6">
                        <Card>
                            <CardHeader><CardTitle className="text-lg">Order Summary</CardTitle></CardHeader>
                            <CardContent className="space-y-2">
                                {cart.map(item => (
                                <div key={item.menuItemId} className="flex justify-between text-sm">
                                    <span>{item.menuItemName} x {item.quantity}</span>
                                    <span>${item.totalPrice.toFixed(2)}</span>
                                </div>
                                ))}
                                <Separator />
                                <div className="flex justify-between text-sm"><p>Subtotal</p><p>${subtotal.toFixed(2)}</p></div>
                                <div className="flex justify-between text-sm text-muted-foreground"><p>Tax ({(taxRate * 100).toFixed(0)}%)</p><p>${tax.toFixed(2)}</p></div>
                                <div className="flex justify-between text-sm text-muted-foreground"><p>Delivery Fee</p><p>${deliveryFee.toFixed(2)}</p></div>
                                <Separator />
                                <div className="flex justify-between text-lg font-bold text-primary"><p>Total</p><p>${total.toFixed(2)}</p></div>
                            </CardContent>
                            <CardFooter>
                               <Button type="submit" className="w-full bg-primary hover:bg-primary/80 text-primary-foreground text-lg py-3" disabled={isProcessing || cart.length === 0}>
                                 {isProcessing ? <LoadingSpinner className="mr-2 h-5 w-5" /> : <CreditCard className="mr-2 h-5 w-5" />}
                                 {isProcessing ? 'Processing...' : 'Place Order'}
                               </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </form>
                )}
            </CardContent>
            </Card>
        </main>
        <SiteFooter restaurantName={restaurant.name} />
    </div>
  );
}

