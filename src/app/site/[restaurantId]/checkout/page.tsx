// src/app/site/[restaurantId]/checkout/page.tsx
'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation'; 
import React, { useEffect, useState, useMemo, useRef } from 'react'; // Added React
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
import type { RestaurantProfile, OrderItem, Order, OrderStatus, TableGroup, GroupCartItem } from '@/types';
import { createOrder } from '@/lib/firebase/orders';
import TopNavigationBar from '@/components/site/public-homepage/top-navigation-bar';
import SiteFooter from '@/components/site/public-homepage/site-footer';
import { AlertCircle, CreditCard, ShoppingBag, Truck, Trash2, Phone, ShieldCheck, MessageCircle } from 'lucide-react'; // Added Phone, ShieldCheck, MessageCircle
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth/context'; // Import useAuth
import { RecaptchaVerifier } from 'firebase/auth'; // Import RecaptchaVerifier
import { auth, db } from '@/lib/firebase/config'; // Import auth for Recaptcha and db
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'; // For group order finalization
import { convertFirebaseTimestampToString } from '@/lib/firebase/utils';

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantId = params.restaurantId as string;
  const { cart: localCart, clearCart: clearLocalCart, removeFromCart, updateQuantity } = useCart(); // Local cart
  const { toast } = useToast();
  const { user, loading: authLoading, linkAnonymousWithPhoneNumber, confirmPhoneNumberVerification } = useAuth(); // Get auth state and functions

  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [loading, setLoading] = useState(true); // General page loading
  const [showNavShadow, setShowNavShadow] = useState(false);
  
  // Form state
  const [customerName, setCustomerName] = useState(''); 
  const [customerPhoneNumberState, setCustomerPhoneNumberState] = useState(''); 
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  
  const [email, setEmail] = useState(''); 
  const [address, setAddress] = useState(''); 
  const [customerNotes, setCustomerNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'card'>('card');
  const [isProcessingOrder, setIsProcessingOrder] = useState(false); 

  const recaptchaContainerRef = useRef<HTMLDivElement>(null); 
  const appVerifierRef = useRef<RecaptchaVerifier | null>(null); 

  const tableId = useMemo(() => searchParams.get('tableId'), [searchParams]);
  const tableNumber = useMemo(() => searchParams.get('tableNumber'), [searchParams]);
  const groupId = useMemo(() => searchParams.get('groupId'), [searchParams]); // For group orders

  const [groupCartItems, setGroupCartItems] = useState<GroupCartItem[]>([]); // For group order summary

  // Determine current cart based on whether it's a group order
  const cartToUse = useMemo(() => groupId ? groupCartItems : localCart, [groupId, groupCartItems, localCart]);


  // Fetch group cart if groupId is present
  useEffect(() => {
    if (groupId && restaurantId) {
      setLoading(true);
      const groupRef = doc(db, `restaurants/${restaurantId}/tableGroups`, groupId);
      getDoc(groupRef).then(docSnap => {
        if (docSnap.exists()) {
          const groupData = docSnap.data() as TableGroup;
          setGroupCartItems(groupData.cartItems || []);
        } else {
          toast({ variant: "destructive", title: "Error", description: "Group order details not found."});
          // Potentially redirect or clear groupId from URL
        }
        setLoading(false);
      }).catch(err => {
        console.error("Error fetching group cart:", err);
        toast({ variant: "destructive", title: "Error", description: "Could not load group order details."});
        setLoading(false);
      });
    }
  }, [groupId, restaurantId, toast]);


  // Initialize reCAPTCHA verifier
  useEffect(() => {
    if (!auth || appVerifierRef.current || !recaptchaContainerRef.current) return;
    try {
      appVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
        'size': 'invisible',
        'callback': (response: any) => {
          console.log("reCAPTCHA solved:", response);
        },
        'expired-callback': () => {
          console.warn("reCAPTCHA expired. Please try again.");
          appVerifierRef.current?.clear();
          if (recaptchaContainerRef.current) { 
            appVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, { size: 'invisible' });
          }
        }
      });
    } catch (error) {
      console.error("Error initializing RecaptchaVerifier:", error);
      toast({variant: "destructive", title: "Verification Error", description: "Could not initialize phone verification system."});
    }
    return () => {
        appVerifierRef.current?.clear(); 
    }
  }, [auth, toast]); 

  useEffect(() => {
    if (restaurantId && !groupId) { // Don't setLoading(false) if group data is still fetching
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
        .finally(() => { if (!groupId) setLoading(false); }); 
    } else if (restaurantId && groupId) { // If group order, restaurant data can be fetched after group
         getRestaurant(restaurantId)
        .then(data => {
            if (data) setRestaurant(data as RestaurantProfile);
            else { /* handle error if needed, though group fetch might handle redirect */ }
        });
    }
     const handleScroll = () => setShowNavShadow(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [restaurantId, groupId, toast, router]);

  const subtotal = useMemo(() => cartToUse.reduce((sum, item) => sum + item.totalPrice, 0), [cartToUse]);
  const taxRate = useMemo(() => restaurant?.taxRate || 0.08, [restaurant]); 
  const tax = useMemo(() => subtotal * taxRate, [subtotal, taxRate]);
  const deliveryFee = (tableId || groupId) ? 0 : 5.00; 
  const total = useMemo(() => subtotal + tax + deliveryFee, [subtotal, tax, deliveryFee]);

  const handleSendOtp = async () => {
    if (!customerPhoneNumberState) {
        toast({ variant: "destructive", title: "Input Error", description: "Please enter your phone number." });
        return;
    }
    if (!appVerifierRef.current) {
        toast({ variant: "destructive", title: "Verification Error", description: "Phone verification system not ready. Please refresh." });
        return;
    }
    setIsVerifyingOtp(true); 
    const result = await linkAnonymousWithPhoneNumber(customerPhoneNumberState, appVerifierRef.current);
    if (result.verificationId) {
        setVerificationId(result.verificationId);
        setIsOtpSent(true);
        toast({ title: "OTP Sent", description: "Please check your phone for the verification code." });
    } else {
        toast({ variant: "destructive", title: "OTP Error", description: result.error?.message || "Could not send OTP. Please try again." });
    }
    setIsVerifyingOtp(false);
  };

  const handleVerifyOtpAndPlaceOrder = async () => {
    if (!verificationId || !otp) {
      toast({ variant: "destructive", title: "Input Error", description: "Please enter the OTP." });
      return;
    }
    setIsVerifyingOtp(true);
    const result = await confirmPhoneNumberVerification(verificationId, otp, customerPhoneNumberState);
    if (result.success) {
        toast({ title: "Phone Verified!", description: "Your phone number has been verified." });
        await placeOrderAfterVerification();
    } else {
        toast({ variant: "destructive", title: "OTP Verification Failed", description: result.error?.message || "Invalid OTP or an error occurred." });
    }
    setIsVerifyingOtp(false);
  };

  const placeOrderAfterVerification = async () => {
    if (!restaurant) {
        toast({ variant: "destructive", title: "Error", description: "Restaurant data is not loaded." });
        return;
    }
    if (cartToUse.length === 0) {
        toast({ variant: "destructive", title: "Empty Cart", description: "Please add items to your cart." });
        return;
    }
    setIsProcessingOrder(true);
    
    const orderItems: OrderItem[] = cartToUse.map(ci => ({
        menuItemId: ci.menuItemId,
        menuItemName: ci.menuItemName,
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        totalPrice: ci.totalPrice,
        variantChoices: ci.variantChoices, 
    }));

    const orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> = {
        restaurantId: restaurant.id,
        userId: user?.uid, 
        tableId: tableId || null, 
        tableNumber: tableNumber || null, 
        items: orderItems,
        subtotal,
        taxAmount: tax,
        totalAmount: total,
        status: 'pending_kitchen' as OrderStatus, 
        customerName: customerName || null, 
        customerPhoneNumber: user?.phoneNumber || customerPhoneNumberState || null, 
        customerNotes: customerNotes || undefined,
        paymentMethod: paymentMethod,
        // For group orders, add groupId
        ...(groupId && { groupId }),
    };

    try {
      const newOrder = await createOrder(restaurant.id, orderData);
      toast({ title: "Order Placed Successfully!", description: "Thank you for your order."});
      
      if (groupId) {
        // Update group status to 'ordered'
        const groupRef = doc(db, `restaurants/${restaurantId}/tableGroups`, groupId);
        await updateDoc(groupRef, { status: 'ordered', updatedAt: serverTimestamp() });
        // Group cart is implicitly cleared by status change or can be explicitly emptied
        localStorage.removeItem(`activeGroup_${restaurantId}_${tableId}`); // Clear active group from local storage
      } else {
        clearLocalCart();
      }
      
      let confirmationUrl = `/site/${restaurantId}/order-confirmation?orderId=${newOrder.id}`;
      if (tableId) {
        confirmationUrl += `&tableOrder=true`;
        if(tableNumber) confirmationUrl += `&tableNumber=${encodeURIComponent(tableNumber)}`;
      }
      router.push(confirmationUrl); 
      
    } catch (error: any) {
      console.error("Order placement error:", error);
      toast({ variant: "destructive", title: "Order Failed", description: error.message || "Could not place your order."});
    } finally {
      setIsProcessingOrder(false);
    }
  }

  const handleSubmitOrderFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.isAnonymous) {
        if (!isOtpSent) {
            await handleSendOtp(); 
        } else {
            await handleVerifyOtpAndPlaceOrder();
        }
    } else {
        await placeOrderAfterVerification(); 
    }
  };

  if (loading || authLoading) {
    return <div className="flex h-screen items-center justify-center"><LoadingSpinner className="h-10 w-10 text-primary" /></div>;
  }

  if (!restaurant) {
    return <div className="flex h-screen items-center justify-center text-destructive p-8 text-center">Restaurant data could not be loaded. Please try returning to the homepage.</div>;
  }
  
  const cartItemCount = cartToUse.reduce((sum, item) => sum + item.quantity, 0);

  return (
     <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-muted/5 to-background">
        <TopNavigationBar
            restaurantName={tableNumber ? `${restaurant.name} - Table ${tableNumber}` : restaurant.name}
            restaurantLogoUrl={`https://picsum.photos/seed/${restaurant.id}logo/40/40`}
            cartItemCount={cartItemCount}
            showShadow={showNavShadow}
            restaurantId={restaurant.id}
            tableContext={tableId && tableNumber ? { id: tableId, number: tableNumber, docId: tableId } : undefined}
            isUserAnonymous={user?.isAnonymous}
            userDisplayName={user?.displayName || user?.email || (user?.isAnonymous ? "Guest" : "")}
        />
        <div ref={recaptchaContainerRef}></div> {/* Invisible reCAPTCHA container */}
        <main className="container mx-auto px-4 py-8 flex-grow">
            <Card className="max-w-4xl mx-auto shadow-xl border-primary/20">
            <CardHeader className="text-center">
                <ShoppingBag className="mx-auto h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-3xl font-bold">Checkout</CardTitle>
                <CardDescription>Finalize your {groupId ? 'group ' : ''}order from {restaurant.name} {tableNumber ? `for Table ${tableNumber}` : ''}.</CardDescription>
            </CardHeader>
            <CardContent>
                {cartToUse.length === 0 && !isProcessingOrder ? (
                    <div className="text-center py-10">
                        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg text-muted-foreground">Your cart is empty.</p>
                        <Button asChild variant="link" className="mt-2 text-primary">
                            <Link href={tableId ? `/menu/table/${tableId}` : `/site/${restaurantId}`}>Return to Menu</Link>
                        </Button>
                    </div>
                ) : (
                <form onSubmit={handleSubmitOrderFlow} className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <Card className="border-border/70">
                            <CardHeader><CardTitle className="text-lg">{user?.isAnonymous ? 'Verify & Place Order' : (tableId ? 'Order Details' : 'Your Contact & Delivery Details')}</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div><Label htmlFor="customerName">Full Name {groupId && user?.uid === groupCartItems.find(item => item.addedByUid === user.uid) ? '(Group Host)' : ''}</Label><Input id="customerName" value={customerName} onChange={e => setCustomerName(e.target.value)} required={!tableId && !user?.isAnonymous && !groupId} placeholder="John Doe" /></div>
                                
                                {user?.isAnonymous && (
                                    <>
                                        <div>
                                            <Label htmlFor="customerPhoneNumberState">Phone Number for Verification</Label>
                                            <div className="flex gap-2">
                                                <Input id="customerPhoneNumberState" type="tel" value={customerPhoneNumberState} onChange={e => setCustomerPhoneNumberState(e.target.value)} required placeholder="+1 123 456 7890" disabled={isOtpSent || isVerifyingOtp}/>
                                                {!isOtpSent && (
                                                    <Button type="button" onClick={handleSendOtp} disabled={isVerifyingOtp || !customerPhoneNumberState} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                                                        {isVerifyingOtp ? <LoadingSpinner className="h-4 w-4"/> : <ShieldCheck className="mr-2 h-4 w-4"/>} Send OTP
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                        {isOtpSent && (
                                        <div><Label htmlFor="otp">Enter OTP</Label><Input id="otp" type="text" value={otp} onChange={e => setOtp(e.target.value)} required placeholder="123456" disabled={isVerifyingOtp}/></div>
                                        )}
                                    </>
                                )}
                                
                                {!tableId && !user?.isAnonymous && !groupId && ( 
                                  <>
                                    <div><Label htmlFor="email">Email (Optional)</Label><Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/></div>
                                    <div><Label htmlFor="customerPhoneNumberPermanent">Phone Number</Label><Input id="customerPhoneNumberPermanent" type="tel" value={customerPhoneNumberState} onChange={e => setCustomerPhoneNumberState(e.target.value)} placeholder="123-456-7890" required /></div>
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
                                    <Truck className="mr-3 h-5 w-5"/> {(tableId || groupId) ? 'Pay at Table (Demo)' : 'Cash on Delivery (Demo)'}
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
                            <CardHeader><CardTitle className="text-lg">Order Summary {groupId && '(Group Cart)'}</CardTitle></CardHeader>
                            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                                {cartToUse.map(item => (
                                <div key={item.menuItemId + JSON.stringify(item.variantChoices) + ((item as GroupCartItem).addedByUid || '')} className="flex justify-between items-center text-sm py-2 border-b last:border-b-0">
                                    <div className="flex items-center">
                                        {item.imageUrl && <Image src={item.imageUrl} alt={item.menuItemName} width={40} height={40} className="rounded mr-3 object-cover" data-ai-hint="cart item image"/>}
                                        <div>
                                            <p className="font-medium">{item.menuItemName}</p>
                                            <p className="text-xs text-muted-foreground">Qty: {item.quantity} &times; ${item.unitPrice.toFixed(2)}</p>
                                            {(item as GroupCartItem).addedByName && <p className="text-xs text-blue-500">Added by: {(item as GroupCartItem).addedByName}</p>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">${item.totalPrice.toFixed(2)}</span>
                                        {/* Remove button might not be applicable for group orders in checkout, or only for group host */}
                                        {!groupId && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => updateQuantity(item.menuItemId, 0)}><Trash2 className="h-4 w-4"/></Button>}
                                    </div>
                                </div>
                                ))}
                            </CardContent>
                             <CardFooter className="flex-col space-y-2 border-t pt-4">
                                <div className="w-full flex justify-between text-sm"><p>Subtotal</p><p>${subtotal.toFixed(2)}</p></div>
                                <div className="w-full flex justify-between text-sm text-muted-foreground"><p>Tax ({(taxRate * 100).toFixed(0)}%)</p><p>${tax.toFixed(2)}</p></div>
                                {!(tableId || groupId) && <div className="w-full flex justify-between text-sm text-muted-foreground"><p>Delivery Fee</p><p>${deliveryFee.toFixed(2)}</p></div>}
                                <Separator className="my-2"/>
                                <div className="w-full flex justify-between text-lg font-bold text-primary"><p>Total</p><p>${total.toFixed(2)}</p></div>
                               
                               <Button type="submit" className="w-full bg-primary hover:bg-primary/80 text-primary-foreground text-lg py-3 mt-4" disabled={isProcessingOrder || isVerifyingOtp || (user?.isAnonymous && !isOtpSent && !verificationId) || (user?.isAnonymous && isOtpSent && !otp) || cartToUse.length === 0}>
                                 {(isProcessingOrder || isVerifyingOtp) ? <LoadingSpinner className="mr-2 h-5 w-5" /> : (user?.isAnonymous && !isOtpSent ? <ShieldCheck className="mr-2 h-5 w-5" /> : (user?.isAnonymous && isOtpSent ? <MessageCircle className="mr-2 h-5 w-5" /> :<CreditCard className="mr-2 h-5 w-5" /> ) ) }
                                 {isProcessingOrder ? 'Processing Order...' : (isVerifyingOtp ? 'Verifying...' : (user?.isAnonymous && !isOtpSent ? 'Verify Phone & Place Order' : (user?.isAnonymous && isOtpSent ? 'Confirm OTP & Place Order' : 'Place Order')))}
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

