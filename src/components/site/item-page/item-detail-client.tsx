
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
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from '@/components/ui/scroll-area';

import DishImageGallery from './dish-image-gallery';
import DishInfoPane from './dish-info-pane';
import VariantSelector from './variant-selector';
import AddonSelector, { type AddonItem } from './addon-selector';
import QuantityControl from './quantity-control';
import CouponInput from './coupon-input';
import CrossSellSection from './cross-sell-section';
import ItemReviews from './item-reviews';
import OrderSummarySidebar from './order-summary-sidebar';


import {
  ShoppingCart, Star, CheckCircle, Flame, Leaf, Info, Zap, Tag
} from 'lucide-react';
import Link from 'next/link';

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
  const [appliedDiscount, setAppliedDiscount] = useState(0); // Percentage (e.g., 0.10 for 10%)
  const [couponProcessing, setCouponProcessing] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showNavShadow, setShowNavShadow] = useState(false);

  const mockAddons = useMemo((): AddonItem[] => 
    frequentlyBoughtTogetherItems.slice(0,3).map(item => ({
        ...item, 
        addonPrice: parseFloat((item.price * 0.3).toFixed(2)) || 1.00 
    })), [frequentlyBoughtTogetherItems]);


  useEffect(() => {
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

  const baseItemPrice = menuItem.price;

  const calculatedVariantPrice = useMemo(() => {
    let price = baseItemPrice; // Start with base price
    menuItem.variants?.forEach(variant => {
      const selectedOptionName = selectedVariants[variant.name];
      const selectedOption = variant.options.find(opt => opt.name === selectedOptionName);
      if (selectedOption) {
        // Assuming variant options set an absolute price for the item if selected.
        // If variants are additive, this logic would be: price += selectedOption.priceAdjustment;
        price = selectedOption.price; 
      }
    });
    return price;
  }, [menuItem.variants, selectedVariants, baseItemPrice]);

  const addonsTotal = useMemo(() => {
    return mockAddons.reduce((sum, addon) => {
      if (selectedAddons[addon.id]) {
        return sum + addon.addonPrice;
      }
      return sum;
    }, 0);
  }, [mockAddons, selectedAddons]);

  const pricePerItem = calculatedVariantPrice + addonsTotal;
  const subtotal = pricePerItem * quantity;
  const taxRate = restaurant.taxRate || 0.08; 
  const taxAmount = subtotal * taxRate;
  const totalBeforeDiscount = subtotal + taxAmount;
  const discountValue = totalBeforeDiscount * appliedDiscount;
  const finalTotal = totalBeforeDiscount - discountValue;


  const handleAddToCart = () => {
    setIsAddingToCart(true);
    let variantChoices: CartItem['variantChoices'] = [];
    if (menuItem.variants) {
      variantChoices = menuItem.variants.map(variant => {
        const optionName = selectedVariants[variant.name];
        const option = variant.options.find(opt => opt.name === optionName);
        return {
          variantName: variant.name,
          optionName: optionName,
          optionPrice: option ? option.price : baseItemPrice, // Price of the chosen variant option
        };
      }).filter(choice => choice.optionName);
    }

    const addonChoices = mockAddons.filter(addon => selectedAddons[addon.id])
      .map(addon => ({ name: addon.name, price: addon.addonPrice }));

    // Constructing item name with variants/addons for display in cart (optional)
    let detailedItemName = menuItem.name;
    if (variantChoices.length > 0) {
        detailedItemName += ` (${variantChoices.map(vc => vc.optionName).join(', ')})`;
    }
    if (addonChoices.length > 0) {
        detailedItemName += ` w/ ${addonChoices.map(ac => ac.name).join(', ')}`;
    }

    const cartItem: CartItem = {
      menuItemId: menuItem.id,
      menuItemName: detailedItemName, // Use the more descriptive name
      quantity,
      unitPrice: pricePerItem, // Effective unit price for this configuration
      totalPrice: pricePerItem * quantity, // Total for these items before global cart adjustments
      imageUrl: menuItem.imageUrl || undefined,
      variantChoices, 
      // Consider how to represent addons in CartItem if needed for detailed cart display
    };
    addGlobalCartItem(cartItem);
    toast({
      title: `${menuItem.name} added to cart!`,
      description: `Quantity: ${quantity}. Your new item total: $${(pricePerItem * quantity).toFixed(2)}`,
    });
    setIsAddingToCart(false);
  };

  const handleApplyCoupon = async () => {
    setCouponProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 700)); // Simulate API call
    if (couponCode.toUpperCase() === 'SAVE10') {
      setAppliedDiscount(0.10);
      toast({ title: 'Coupon Applied!', description: '10% discount added to your order.' });
    } else {
      setAppliedDiscount(-1); // Indicate invalid
      toast({ variant: 'destructive', title: 'Invalid Coupon', description: 'The coupon code is not valid.' });
    }
    setCouponProcessing(false);
  };
  
  const cartTotalItemsGlobal = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-muted/5 to-background text-foreground">
      <TopNavigationBar
        restaurantName={restaurant.name}
        restaurantLogoUrl={`https://picsum.photos/seed/${restaurant.id}logo/40/40`}
        cartItemCount={cartTotalItemsGlobal}
        showShadow={showNavShadow}
        restaurantId={restaurant.id}
      />
      <main className="container mx-auto px-2 sm:px-4 py-6 md:py-8 flex-grow">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Left Column / Main Column on Mobile */}
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
            <DishImageGallery imageUrl={menuItem.imageUrl} itemName={menuItem.name} />
            <DishInfoPane menuItem={menuItem} />
            {menuItem.variants && menuItem.variants.length > 0 && (
              <VariantSelector 
                variants={menuItem.variants} 
                selectedVariants={selectedVariants}
                onVariantChange={(variantName, optionName) => setSelectedVariants(prev => ({...prev, [variantName]: optionName}))}
              />
            )}
            {mockAddons.length > 0 && (
              <AddonSelector 
                addons={mockAddons}
                selectedAddons={selectedAddons}
                onAddonToggle={(addonId, isSelected) => setSelectedAddons(prev => ({...prev, [addonId]: isSelected}))}
              />
            )}
            <CrossSellSection items={frequentlyBoughtTogetherItems} restaurantId={restaurant.id} onAddToCart={(item) => addGlobalCartItem({
                menuItemId: item.id,
                menuItemName: item.name,
                quantity: 1,
                unitPrice: item.price,
                totalPrice: item.price,
                imageUrl: item.imageUrl || undefined,
            })} />
            <ItemReviews reviews={reviews} averageRating={averageRating} totalReviews={reviews.length} />
          </div>

          {/* Right Column / Sticky Cart Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 md:top-24 space-y-6 md:space-y-8"> {/* Adjust top based on header height */}
                <Card className="shadow-xl border-primary/20">
                     <CardHeader>
                        <CardTitle className="text-lg font-semibold text-foreground">Quantity</CardTitle>
                     </CardHeader>
                     <CardContent>
                        <QuantityControl quantity={quantity} onQuantityChange={setQuantity} />
                     </CardContent>
                </Card>
               
                <CouponInput 
                    couponCode={couponCode}
                    onCouponCodeChange={setCouponCode}
                    onApplyCoupon={handleApplyCoupon}
                    appliedDiscount={appliedDiscount > 0 ? appliedDiscount : 0} // Only pass positive discount
                    isProcessing={couponProcessing}
                />
                 <OrderSummarySidebar
                    restaurantId={restaurant.id}
                    itemName={menuItem.name}
                    quantity={quantity}
                    baseItemPrice={baseItemPrice}
                    finalTotal={finalTotal}
                    subtotal={subtotal}
                    taxAmount={taxAmount}
                    discountAmount={discountValue}
                    onAddToCart={handleAddToCart}
                    isProcessing={isAddingToCart}
                    cartItemCount={cartTotalItemsGlobal}
                />
            </div>
          </div>
        </div>
      </main>
      <SiteFooter restaurantName={restaurant.name} />
    </div>
  );
}
