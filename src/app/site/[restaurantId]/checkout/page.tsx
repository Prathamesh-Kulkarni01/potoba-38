
// src/app/site/[restaurantId]/checkout/page.tsx
'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation'; // Added useSearchParams
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button'; 
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator'; 
import LoadingSpinner from '@/components/shared/loading-spinner';
import { useCart } from '@/components/site/public-homepage/cart-store';
import { getRestaurant } from '@/lib/firebase/firestore';
import type { RestaurantProfile, OrderItem, Order, OrderStatus } from '@/types';
import { createOrder } from '@/lib/firebase/orders';
import TopNavigationBar from '@/components/site/public-homepage/top-navigation-bar';
import SiteFooter from '@/components/site/public-homepage/site-footer';
import { AlertCircle, CreditCard, ShoppingBag, Truck, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantId = params.restaurantId as string;
  const { cart, clearCart, removeFromCart, updateQuantity } = useCart();
  const { toast } = useToast();
  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNavShadow, setShowNavShadow] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'card'>('card');
  const [isProcessing, setIsProcessing] = useState(false);

  // Table context from query params
  const tableId = useMemo(() => searchParams.get('tableId'), [searchParams]);
  const tableNumber = useMemo(() => searchParams.get('tableNumber'), [searchParams]);

  useEffect(() => {
    if (restaurantId) {
      getRestaurant(restaurantId)
        .then(data => {
            if (data) {
                setRestaurant(data as RestaurantProfile); 
            } else {
                toast({variant: "destructive", title: "Error", description: "Restaurant not found."});
                router.push('/');
            }
        })
        .catch(err => {
            console.error("Failed to fetch restaurant", err);
            toast({variant: "destructive", title: "Error", description: "Could not load restaurant details."});
            router.push('/');
        })
        .finally(() => setLoading(false));
    }
     const handleScroll = () => setShowNavShadow(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [restaurantId, toast, router]);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.totalPrice, 0), [cart]);
  const taxRate = useMemo(() => restaurant?.taxRate || 0.08, [restaurant]); 
  const tax = useMemo(() => subtotal * taxRate, [subtotal, taxRate]);
  const deliveryFee = tableId ? 0 : 5.00; // No delivery fee for table orders
  const total = useMemo(() => subtotal + tax + deliveryFee, [subtotal, tax, deliveryFee]);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) {
        toast({ variant: "destructive", title: "Error", description: "Restaurant data is not loaded." });
        return;
    }
    if (cart.length === 0) {
        toast({ variant: "destructive", title: "Empty Cart", description: "Please add items to your cart before placing an order." });
        return;
    }
    setIsProcessing(true);
    
    const orderItems: OrderItem[] = cart.map(ci => ({
        menuItemId: ci.menuItemId,
        menuItemName: ci.menuItemName,
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        totalPrice: ci.totalPrice,
        variantChoices: ci.variantChoices, 
    }));

    const orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> = {
        restaurantId: restaurant.id,
        tableId: tableId || null, // Include tableId if present
        tableNumber: tableNumber || null, // Include tableNumber if present
        items: orderItems,
        subtotal,
        taxAmount: tax,
        totalAmount: total,
        status: 'pending_kitchen' as OrderStatus, // Default status
        customerNotes: customerNotes || undefined,
        paymentMethod: paymentMethod,
        // Include delivery address if it's not a table order and fields are filled
        // deliveryAddress: !tableId && name && email && phone && address ? { name, email, phone, address } : undefined,
    };

    try {
      const newOrder = await createOrder(restaurant.id, orderData);
      toast({ title: "Order Placed Successfully!", description: "Thank you for your order. We'll process it shortly."});
      clearCart();
      
      if (tableId) {
        router.push(`/site/${restaurantId}/order-confirmation?orderId=${newOrder.id}&tableOrder=true&tableNumber=${encodeURIComponent(tableNumber || '')}`); 
      } else {
        router.push(`/site/${restaurantId}/order-confirmation?orderId=${newOrder.id}`); 
      }
    } catch (error: any) {
      console.error("Order placement error:", error);
      toast({ variant: "destructive", title: "Order Failed", description: error.message || "Could not place your order. Please try again."});
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><LoadingSpinner className="h-10 w-10 text-primary" /></div>;
  }

  if (!restaurant) {
    return <div className="flex h-screen items-center justify-center text-destructive p-8 text-center">Restaurant data could not be loaded. Please try returning to the homepage.</div>;
  }
  
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
     <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-muted/5 to-background">
        <TopNavigationBar
            restaurantName={tableNumber ? `${restaurant.name} - Table ${tableNumber}` : restaurant.name}
            restaurantLogoUrl={`https://picsum.photos/seed/${restaurant.id}logo/40/40`}
            cartItemCount={cartItemCount}
            showShadow={showNavShadow}
            restaurantId={restaurant.id}
            tableContext={tableId && tableNumber ? { id: tableId, number: tableNumber, docId: tableId } : undefined}
        />
        <main className="container mx-auto px-4 py-8 flex-grow">
            <Card className="max-w-4xl mx-auto shadow-xl border-primary/20">
            <CardHeader className="text-center">
                <ShoppingBag className="mx-auto h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-3xl font-bold">Checkout</CardTitle>
                <CardDescription>Finalize your order from {restaurant.name} {tableNumber ? `for Table ${tableNumber}` : ''}.</CardDescription>
            </CardHeader>
            <CardContent>
                {cart.length === 0 && !isProcessing ? (
                    <div className="text-center py-10">
                        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg text-muted-foreground">Your cart is empty.</p>
                        <Button asChild variant="link" className="mt-2 text-primary">
                            <Link href={tableId ? `/menu/table/${tableId}` : `/site/${restaurantId}`}>Return to Menu</Link>
                        </Button>
                    </div>
                ) : (
                <form onSubmit={handlePlaceOrder} className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <Card className="border-border/70">
                            <CardHeader><CardTitle className="text-lg">{tableId ? 'Table Order Notes' : 'Your Details'}</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                {!tableId && (
                                  <>
                                    <div><Label htmlFor="name">Full Name</Label><Input id="name" value={name} onChange={e => setName(e.target.value)} required placeholder="John Doe" /></div>
                                    <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"/></div>
                                    <div><Label htmlFor="phone">Phone Number</Label><Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="123-456-7890"/></div>
                                    <div><Label htmlFor="address">Delivery Address</Label><Input id="address" value={address} onChange={e => setAddress(e.target.value)} required placeholder="123 Main St, Anytown"/></div>
                                  </>
                                )}
                                <div><Label htmlFor="customerNotes">Order Notes (Optional)</Label><Textarea id="customerNotes" value={customerNotes} onChange={e => setCustomerNotes(e.target.value)} placeholder="Any special instructions for your order?"/></div>
                            </CardContent>
                        </Card>
                         <Card className="border-border/70">
                            <CardHeader><CardTitle className="text-lg">Payment Method</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                <Button type="button" variant={paymentMethod === 'card' ? 'default' : 'outline'} onClick={() => setPaymentMethod('card')} className="w-full justify-start text-left h-12">
                                    <CreditCard className="mr-3 h-5 w-5"/> Pay with Card (Demo)
                                </Button>
                                <Button type="button" variant={paymentMethod === 'cod' ? 'default' : 'outline'} onClick={() => setPaymentMethod('cod')} className="w-full justify-start text-left h-12">
                                    <Truck className="mr-3 h-5 w-5"/> {tableId ? 'Pay at Table (Demo)' : 'Cash on Delivery (Demo)'}
                                </Button>
                                {paymentMethod === 'card' && (
                                    <div className="space-y-2 pt-3 border-t mt-4">
                                        <p className="text-sm text-muted-foreground">Card payment details would go here. This is a demo.</p>
                                        <Input placeholder="Card Number (1234 ...)" disabled/>
                                        <div className="flex gap-2">
                                            <Input placeholder="MM/YY" className="flex-1" disabled/>
                                            <Input placeholder="CVC" className="flex-1" disabled/>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                    <div className="space-y-6">
                        <Card className="border-border/70">
                            <CardHeader><CardTitle className="text-lg">Order Summary</CardTitle></CardHeader>
                            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                                {cart.map(item => (
                                <div key={item.menuItemId + JSON.stringify(item.variantChoices)} className="flex justify-between items-center text-sm py-2 border-b last:border-b-0">
                                    <div className="flex items-center">
                                        {item.imageUrl && <Image src={item.imageUrl} alt={item.menuItemName} width={40} height={40} className="rounded mr-3 object-cover" data-ai-hint="cart item image"/>}
                                        <div>
                                            <p className="font-medium">{item.menuItemName}</p>
                                            <p className="text-xs text-muted-foreground">Qty: {item.quantity} &times; ${item.unitPrice.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">${item.totalPrice.toFixed(2)}</span>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => updateQuantity(item.menuItemId, 0)}><Trash2 className="h-4 w-4"/></Button>
                                    </div>
                                </div>
                                ))}
                            </CardContent>
                             <CardFooter className="flex-col space-y-2 border-t pt-4">
                                <div className="w-full flex justify-between text-sm"><p>Subtotal</p><p>${subtotal.toFixed(2)}</p></div>
                                <div className="w-full flex justify-between text-sm text-muted-foreground"><p>Tax ({(taxRate * 100).toFixed(0)}%)</p><p>${tax.toFixed(2)}</p></div>
                                {!tableId && <div className="w-full flex justify-between text-sm text-muted-foreground"><p>Delivery Fee</p><p>${deliveryFee.toFixed(2)}</p></div>}
                                <Separator className="my-2"/>
                                <div className="w-full flex justify-between text-lg font-bold text-primary"><p>Total</p><p>${total.toFixed(2)}</p></div>
                               
                               <Button type="submit" className="w-full bg-primary hover:bg-primary/80 text-primary-foreground text-lg py-3 mt-4" disabled={isProcessing || cart.length === 0}>
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

