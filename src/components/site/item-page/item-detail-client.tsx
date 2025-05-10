
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { RestaurantProfile, MenuItem, MenuItemVariant, MenuItemVariantOption } from '@/types';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useCart, type CartItem } from '../public-homepage/cart-store'; 
import TopNavigationBar from '../public-homepage/top-navigation-bar'; 
import SiteFooter from '../public-homepage/site-footer';
import DishCard from '../public-homepage/dish-card';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  Utensils, PlusCircle, MinusCircle, ShoppingCart, Star, MessageSquare, CheckCircle, Flame, Leaf, Info, Zap, Tag
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Review {
  id: string;
  reviewerName: string;
  rating: number;
  content: string;
}

interface ItemDetailClientProps {
  restaurant: RestaurantProfile & { createdAt: string; updatedAt: string };
  menuItem: MenuItem & { createdAt: string; updatedAt: string };
  frequentlyBoughtTogetherItems: (MenuItem & { createdAt: string; updatedAt: string })[];
  reviews: Review[];
  averageRating: number;
}

export default function ItemDetailClient({
  restaurant,
  menuItem,
  frequentlyBoughtTogetherItems,
  reviews,
  averageRating,
}: ItemDetailClientProps) {
  const { cart, addToCart: addGlobalCartItem } = useCart();
  const { toast } = useToast();

  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({}); // { variantName: optionName }
  const [selectedAddons, setSelectedAddons] = useState<Record<string, boolean>>({}); // { addonItemId: true/false }
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0); // Percentage or fixed amount
  const [showNavShadow, setShowNavShadow] = useState(false);

  // Mock addons (could be fetched or part of menuItem type)
  const mockAddons = useMemo(() => frequentlyBoughtTogetherItems.slice(0,3).map(item => ({...item, addonPrice: Math.round(item.price * 0.3) || 1.00 })), [frequentlyBoughtTogetherItems]);


  useEffect(() => {
    // Initialize selectedVariants with the first option of each variant if available
    const initialVariants: Record<string, string> = {};
    menuItem.variants?.forEach(variant => {
      if (variant.options.length > 0) {
        initialVariants[variant.name] = variant.options[0].name;
      }
    });
    setSelectedVariants(initialVariants);
  }, [menuItem.variants]);
  
  useEffect(() => {
    const handleScroll = () => setShowNavShadow(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  const calculatePrice = () => {
    let currentPrice = menuItem.price;
    // Add variant pricing
    menuItem.variants?.forEach(variant => {
      const selectedOptionName = selectedVariants[variant.name];
      const selectedOption = variant.options.find(opt => opt.name === selectedOptionName);
      if (selectedOption) {
        currentPrice = selectedOption.price; // Variant options define absolute price in this model
      }
    });
    // Add addon pricing
    mockAddons.forEach(addon => {
      if (selectedAddons[addon.id]) {
        currentPrice += addon.addonPrice;
      }
    });
    return currentPrice * quantity;
  };

  const subtotal = calculatePrice();
  const taxRate = restaurant.taxRate || 0.08; // Default 8% tax
  const tax = subtotal * taxRate;
  const totalBeforeDiscount = subtotal + tax;
  const discountAmount = totalBeforeDiscount * appliedDiscount;
  const finalTotal = totalBeforeDiscount - discountAmount;

  const handleAddToCart = () => {
    let variantChoices: CartItem['variantChoices'] = [];
    if (menuItem.variants) {
      variantChoices = menuItem.variants.map(variant => {
        const optionName = selectedVariants[variant.name];
        const option = variant.options.find(opt => opt.name === optionName);
        return {
          variantName: variant.name,
          optionName: optionName,
          optionPrice: option ? option.price : 0, // This assumes variants dictate final price. Adjust if additive.
        };
      }).filter(choice => choice.optionName); // Only include if an option was actually selected
    }

    const cartItem: CartItem = {
      menuItemId: menuItem.id,
      menuItemName: menuItem.name,
      quantity,
      unitPrice: menuItem.price, // Base unit price
      totalPrice: finalTotal / quantity, // Effective unit price after variants/addons for this configuration
      imageUrl: menuItem.imageUrl || undefined,
      variantChoices,
      // Addons could be added as separate items or as part of item details
    };
    addGlobalCartItem(cartItem);
    toast({
      title: `${menuItem.name} added to cart!`,
      description: `Quantity: ${quantity}, Total: $${finalTotal.toFixed(2)}`,
    });
  };

  const handleApplyCoupon = () => {
    if (couponCode.toUpperCase() === 'SAVE10') {
      setAppliedDiscount(0.10); // 10% discount
      toast({ title: 'Coupon Applied!', description: '10% discount added to your order.' });
    } else {
      setAppliedDiscount(0);
      toast({ variant: 'destructive', title: 'Invalid Coupon', description: 'The coupon code is not valid.' });
    }
  };

  const getTagIcon = (tag: string) => {
    if (tag.toLowerCase().includes('spicy') || tag.toLowerCase().includes('hot')) return <Flame className="h-4 w-4 text-red-500" />;
    if (tag.toLowerCase().includes('veg')) return <Leaf className="h-4 w-4 text-green-500" />;
    if (tag.toLowerCase().includes('special')) return <Star className="h-4 w-4 text-yellow-500" />;
    if (tag.toLowerCase().includes('new')) return <Zap className="h-4 w-4 text-blue-500" />;
    return <Tag className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-muted/10 to-background">
      <TopNavigationBar
        restaurantName={restaurant.name}
        restaurantLogoUrl={`https://picsum.photos/seed/${restaurant.id}logo/40/40`}
        cartItemCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        showShadow={showNavShadow}
      />
      <main className="container mx-auto px-2 sm:px-4 py-8 flex-grow">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column / Main Column on Mobile */}
          <div className="lg:col-span-2 space-y-8">
            {/* Dish Details Section */}
            <Card className="overflow-hidden shadow-lg">
              <div className="relative h-64 md:h-96 w-full">
                {menuItem.imageUrl ? (
                  <Image src={menuItem.imageUrl} alt={menuItem.name} layout="fill" objectFit="cover" data-ai-hint="delicious food item"/>
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground" data-ai-hint="food placeholder image">
                    <Utensils className="h-24 w-24" />
                  </div>
                )}
              </div>
              <CardContent className="p-6">
                <h1 className="text-3xl font-bold text-primary mb-2">{menuItem.name}</h1>
                <p className="text-muted-foreground mb-4">{menuItem.description || "No description available."}</p>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-2xl font-semibold text-accent">${menuItem.price.toFixed(2)}</p>
                  <div className="flex items-center">
                    <Button variant="outline" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="h-8 w-8"><MinusCircle className="h-4 w-4" /></Button>
                    <span className="w-10 text-center font-medium">{quantity}</span>
                    <Button variant="outline" size="icon" onClick={() => setQuantity(quantity + 1)} className="h-8 w-8"><PlusCircle className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {menuItem.dietaryTags?.map(tag => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1 text-xs">
                      {getTagIcon(tag)} {tag}
                    </Badge>
                  ))}
                   {menuItem.calories && <Badge variant="outline" className="text-xs flex items-center gap-1"><Info className="h-3 w-3"/> {menuItem.calories} kcal</Badge>}
                </div>
              </CardContent>
            </Card>

            {/* Customization Options */}
            {menuItem.variants && menuItem.variants.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Customize Your Order</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {menuItem.variants.map((variant) => (
                    <div key={variant.name}>
                      <Label className="text-md font-medium">{variant.name}</Label>
                      <RadioGroup
                        value={selectedVariants[variant.name]}
                        onValueChange={(value) => setSelectedVariants(prev => ({ ...prev, [variant.name]: value }))}
                        className="mt-2 space-y-1"
                      >
                        {variant.options.map((option) => (
                          <div key={option.name} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted/50">
                            <RadioGroupItem value={option.name} id={`${variant.name}-${option.name}`} />
                            <Label htmlFor={`${variant.name}-${option.name}`} className="flex-1 cursor-pointer">{option.name}</Label>
                            <span className="text-sm text-primary font-medium">${option.price.toFixed(2)}</span>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Extra Toppings / Add-ons */}
            {mockAddons.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Add Extras</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mockAddons.map(addon => (
                    <div key={addon.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={`addon-${addon.id}`}
                          checked={!!selectedAddons[addon.id]}
                          onCheckedChange={(checked) => setSelectedAddons(prev => ({ ...prev, [addon.id]: !!checked }))}
                        />
                        <Label htmlFor={`addon-${addon.id}`} className="flex-1 cursor-pointer">
                          {addon.name} <span className="text-xs text-muted-foreground">(${addon.addonPrice.toFixed(2)})</span>
                        </Label>
                      </div>
                      <Image src={addon.imageUrl || `https://picsum.photos/seed/${addon.id}addon/50/50`} alt={addon.name} width={40} height={40} className="rounded-md object-cover" data-ai-hint="food addon item"/>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            
            {/* Frequently Bought Together */}
            {frequentlyBoughtTogetherItems.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Frequently Bought Together</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="w-full">
                    <div className="flex space-x-4 pb-4">
                    {frequentlyBoughtTogetherItems.map(item => (
                       <div key={item.id} className="w-52 md:w-60 flex-shrink-0">
                         <DishCard dish={item} restaurantId={restaurant.id} onAddToCart={(dishToAdd) => addGlobalCartItem({
                            menuItemId: dishToAdd.id,
                            menuItemName: dishToAdd.name,
                            quantity: 1,
                            unitPrice: dishToAdd.price,
                            totalPrice: dishToAdd.price,
                            imageUrl: dishToAdd.imageUrl || undefined,
                         })} />
                       </div>
                    ))}
                    </div>
                    <div className="h-1 w-full bg-transparent pointer-events-none" /> {/* Scrollbar placeholder height */}
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Ratings and Reviews */}
             <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-xl">Ratings & Reviews</CardTitle>
                    {reviews.length > 0 && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                        <span className="font-semibold text-foreground">{averageRating.toFixed(1)}</span>
                        <span>({reviews.length} reviews)</span>
                    </div>
                    )}
                </CardHeader>
                <CardContent className="space-y-4">
                    {reviews.length > 0 ? reviews.slice(0,3).map(review => (
                    <div key={review.id} className="p-3 border rounded-md bg-muted/30">
                        <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-sm">{review.reviewerName}</p>
                        <div className="flex">
                            {[...Array(5)].map((_, i) => (
                            <Star key={i} className={cn("h-4 w-4", i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/50")}/>
                            ))}
                        </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{review.content}</p>
                    </div>
                    )) : <p className="text-sm text-muted-foreground text-center py-4">No reviews yet for this item.</p>}
                    <Button variant="outline" className="w-full mt-2">Write a Review</Button>
                </CardContent>
            </Card>


          </div>

          {/* Right Column / Sticky Cart Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 shadow-xl"> {/* top- value should match header height + some padding */}
              <CardHeader>
                <CardTitle className="text-xl flex items-center"><ShoppingCart className="mr-2 h-5 w-5 text-primary" />Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>{menuItem.name} x {quantity}</span>
                  <span>${(menuItem.price * quantity).toFixed(2)}</span>
                </div>
                {Object.entries(selectedVariants).map(([variantName, optionName]) => {
                   const variant = menuItem.variants?.find(v => v.name === variantName);
                   const option = variant?.options.find(o => o.name === optionName);
                   const priceEffect = option ? (option.price - menuItem.price) * quantity : 0; // Assuming variant price is absolute
                   if (!option) return null;
                   return (
                    <div key={variantName} className="flex justify-between text-xs text-muted-foreground pl-2">
                      <span>{variantName}: {optionName}</span>
                      {/* Price display depends on how variants affect price. If absolute, it's part of item line. If additive:
                      <span>{priceEffect >= 0 ? '+' : '-'}${Math.abs(priceEffect).toFixed(2)}</span> */}
                    </div>
                   );
                })}
                 {mockAddons.filter(addon => selectedAddons[addon.id]).map(addon => (
                    <div key={addon.id} className="flex justify-between text-xs text-muted-foreground pl-2">
                        <span>+ {addon.name}</span>
                        <span>+${addon.addonPrice.toFixed(2)}</span>
                    </div>
                ))}
                <Separator />
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax ({ (taxRate * 100).toFixed(0) }%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                {/* Apply Coupon Section */}
                <div className="space-y-2 pt-2">
                    <Label htmlFor="couponCode" className="text-xs">Coupon Code</Label>
                    <div className="flex gap-2">
                    <Input id="couponCode" type="text" placeholder="Enter code" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} className="h-9 text-sm"/>
                    <Button onClick={handleApplyCoupon} variant="outline" size="sm" className="h-9 text-xs">Apply</Button>
                    </div>
                    {appliedDiscount > 0 && (
                        <p className="text-xs text-green-600">Applied: -${discountAmount.toFixed(2)} ({(appliedDiscount * 100).toFixed(0)}%)</p>
                    )}
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold text-primary">
                  <span>Total</span>
                  <span>${finalTotal.toFixed(2)}</span>
                </div>
                <Button onClick={handleAddToCart} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-md py-3 mt-2">
                  <CheckCircle className="mr-2 h-5 w-5"/> Add to Cart
                </Button>
                 <Button variant="outline" asChild className="w-full mt-2">
                    <Link href={`/site/${restaurant.id}/checkout`}>Proceed to Checkout ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <SiteFooter restaurantName={restaurant.name} />
    </div>
  );
}

