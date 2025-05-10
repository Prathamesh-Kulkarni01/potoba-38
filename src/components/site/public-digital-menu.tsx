
'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { createOrder } from '@/lib/firebase/orders';
import type { RestaurantProfile, MenuCategory, MenuSubcategory, MenuItem as MenuItemType, OrderItem, OrderStatus } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Utensils, ShoppingCart, PlusCircle, MinusCircle, Trash2, Send, PackageOpen, ChefHat } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface CartItem extends OrderItem {
  // Extends OrderItem
}

interface PublicDigitalMenuProps {
  restaurant: RestaurantProfile;
  categories: MenuCategory[];
  subcategories: MenuSubcategory[];
  menuItems: MenuItemType[];
}

export default function PublicDigitalMenu({ restaurant, categories, subcategories, menuItems: initialMenuItems }: PublicDigitalMenuProps) {
  const { toast } = useToast();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerNotes, setCustomerNotes] = useState('');
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [orderPlacing, setOrderPlacing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(categories[0]?.id || 'all');

  const menuItems = useMemo(() => initialMenuItems.filter(item => item.availability), [initialMenuItems]);

  const itemsByCategory = useMemo(() => {
    const grouped: Record<string, MenuItemType[]> = {};
    menuItems.forEach(item => {
      if (!grouped[item.categoryId]) {
        grouped[item.categoryId] = [];
      }
      grouped[item.categoryId].push(item);
    });
    return grouped;
  }, [menuItems]);

  const addToCart = (item: MenuItemType) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.menuItemId === item.id);
      if (existingItem) {
        return prevCart.map(cartItem =>
          cartItem.menuItemId === item.id ? { ...cartItem, quantity: cartItem.quantity + 1, totalPrice: (cartItem.quantity + 1) * cartItem.unitPrice } : cartItem
        );
      } else {
        return [...prevCart, {
          menuItemId: item.id,
          menuItemName: item.name,
          quantity: 1,
          unitPrice: item.price,
          totalPrice: item.price,
        }];
      }
    });
    toast({ title: `${item.name} added`, description: "Item added to your order." });
  };

  const removeFromCart = (menuItemId: string) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.menuItemId === menuItemId);
      if (existingItem && existingItem.quantity > 1) {
        return prevCart.map(cartItem =>
          cartItem.menuItemId === menuItemId ? { ...cartItem, quantity: cartItem.quantity - 1, totalPrice: (cartItem.quantity - 1) * cartItem.unitPrice } : cartItem
        );
      } else {
        return prevCart.filter(cartItem => cartItem.menuItemId !== menuItemId);
      }
    });
  };

  const deleteFromCart = (menuItemId: string) => {
    setCart(prevCart => prevCart.filter(cartItem => cartItem.menuItemId !== menuItemId));
  };

  const calculateCartTotal = () => {
    return cart.reduce((total, item) => total + item.totalPrice, 0);
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      toast({ variant: 'destructive', title: 'Empty Cart', description: 'Please add items to your cart.' });
      return;
    }

    setOrderPlacing(true);
    // For public page orders, tableId and tableNumber can be placeholders or indicate an online order.
    const placeholderTableId = `online_${restaurant.id}`;
    const placeholderTableNumber = 'Online Order';

    const orderData = {
      restaurantId: restaurant.id,
      tableId: placeholderTableId, 
      tableNumber: placeholderTableNumber,
      items: cart,
      subtotal: calculateCartTotal(),
      // Assuming a 10% tax for now, this should ideally come from restaurant settings
      taxAmount: calculateCartTotal() * (restaurant.taxRate ?? 0.10), 
      totalAmount: calculateCartTotal() * (1 + (restaurant.taxRate ?? 0.10)), 
      status: 'pending_kitchen' as OrderStatus, // Or 'pending_customer_confirmation' if more steps
      customerNotes: customerNotes || undefined,
    };

    try {
      await createOrder(restaurant.id, orderData);
      toast({ title: 'Order Placed!', description: 'Your order has been sent to the restaurant.' });
      setCart([]);
      setCustomerNotes('');
      setIsCartModalOpen(false);
    } catch (error: any) {
      console.error("Error placing order:", error);
      toast({ variant: 'destructive', title: 'Order Failed', description: error.message || "Could not place your order." });
    } finally {
      setOrderPlacing(false);
    }
  };
  
  const cartTotalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (!restaurant) return <LoadingSpinner className="m-auto h-10 w-10 text-primary" />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-md shadow-lg">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center">
          <div className="text-center sm:text-left mb-3 sm:mb-0">
            <div className="flex items-center justify-center sm:justify-start gap-3">
                 <Image 
                    src={`https://picsum.photos/seed/${restaurant.id}logo/50/50`} 
                    alt={`${restaurant.name} Logo`}
                    width={50}
                    height={50}
                    className="rounded-full border-2 border-primary"
                    data-ai-hint="restaurant logo"
                  />
              <div>
                <h1 className="text-2xl font-bold text-primary">{restaurant.name}</h1>
                {restaurant.type && <p className="text-sm text-muted-foreground">{restaurant.type}</p>}
              </div>
            </div>
          </div>
          <Button onClick={() => setIsCartModalOpen(true)} variant="default" size="lg" className="relative rounded-full shadow-md bg-accent hover:bg-accent/90 text-accent-foreground">
            <ShoppingCart className="mr-2 h-5 w-5"/>
            View Order ({cartTotalItems})
            {cartTotalItems > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-6 w-6 p-0 flex items-center justify-center text-xs rounded-full">
                {cartTotalItems}
              </Badge>
            )}
          </Button>
        </div>
      </header>

      {/* Menu Content */}
      <main className="container mx-auto px-2 sm:px-4 py-6 space-y-8">
        {categories.length > 0 ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <ScrollArea>
              <TabsList className="flex justify-start sm:justify-center mb-6 bg-transparent p-0">
                {categories.map(category => (
                  <TabsTrigger 
                    key={category.id} 
                    value={category.id}
                    className="px-4 py-2 mx-1 text-sm sm:text-base whitespace-nowrap rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=inactive]:bg-card data-[state=inactive]:text-card-foreground data-[state=inactive]:border hover:bg-muted"
                  >
                    {category.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            <span className="sr-only">Scroll for more categories</span></ScrollArea>

            {categories.map(category => (
              <TabsContent key={category.id} value={category.id}>
                <section aria-labelledby={`category-title-${category.id}`}>
                  {(itemsByCategory[category.id] || []).filter(item => !item.subcategoryId).length > 0 && (
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mb-8">
                        {(itemsByCategory[category.id] || []).filter(item => !item.subcategoryId).map(item => (
                          <MenuItemCard key={item.id} item={item} onAddToCart={addToCart} />
                        ))}
                      </div>
                  )}
                  
                  {subcategories.filter(sub => sub.categoryId === category.id).map(subcategory => {
                    const itemsInSub = (itemsByCategory[category.id] || []).filter(item => item.subcategoryId === subcategory.id);
                    if (itemsInSub.length === 0) return null;
                    return (
                      <div key={subcategory.id} className="mb-8">
                        <h3 className="text-xl font-semibold text-foreground mb-4 pl-2 border-l-4 border-accent">
                          {subcategory.name}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                          {itemsInSub.map(item => (
                            <MenuItemCard key={item.id} item={item} onAddToCart={addToCart} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {/* If category has no items at all (neither direct nor in subcategories) */}
                  {
                    (itemsByCategory[category.id] === undefined || itemsByCategory[category.id].length === 0) && 
                    subcategories.filter(sub => sub.categoryId === category.id && (itemsByCategory[category.id]?.some(item => item.subcategoryId === sub.id) ?? false)).length === 0 && (
                     <div className="text-center py-10">
                        <ChefHat className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">No items in "{category.name}" category for now.</p>
                      </div>
                    )
                  }
                </section>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="text-center py-20">
            <PackageOpen className="mx-auto h-24 w-24 text-muted-foreground/30 mb-6" />
            <h2 className="text-2xl font-semibold text-muted-foreground mb-2">Menu Coming Soon!</h2>
            <p className="text-muted-foreground">The menu for {restaurant.name} is currently being prepared. Please check back later!</p>
          </div>
        )}
      </main>

      {/* Cart Modal */}
      <Dialog open={isCartModalOpen} onOpenChange={setIsCartModalOpen}>
        <DialogContent className="sm:max-w-lg w-[95vw] rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center"><ShoppingCart className="mr-3 h-6 w-6 text-primary"/>Your Order Summary</DialogTitle>
            <CardDescription>Review your items before placing the order.</CardDescription>
          </DialogHeader>
          {cart.length > 0 ? (
            <ScrollArea className="max-h-[50vh] my-4 pr-3">
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.menuItemId} className="flex items-center justify-between p-3 border rounded-md hover:shadow-sm bg-card">
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{item.menuItemName}</p>
                      <p className="text-xs text-muted-foreground">${item.unitPrice.toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.menuItemId)} className="h-7 w-7"><MinusCircle className="h-4 w-4"/></Button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <Button variant="ghost" size="icon" onClick={() => addToCart(menuItems.find(mi => mi.id === item.menuItemId)!)} className="h-7 w-7"><PlusCircle className="h-4 w-4"/></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteFromCart(item.menuItemId)} className="h-7 w-7 text-destructive"><Trash2 className="h-4 w-4"/></Button>
                    </div>
                     <p className="font-semibold w-16 text-right text-sm">${item.totalPrice.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="py-8 text-center text-muted-foreground">Your order is empty. Add delicious items from our menu!</p>
          )}
           {cart.length > 0 && (
            <>
            <div className="mt-4">
                <label htmlFor="customerNotes" className="block text-sm font-medium text-foreground mb-1">Order Notes (optional)</label>
                <Textarea 
                    id="customerNotes" 
                    value={customerNotes} 
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="Any special requests or dietary needs for the kitchen?"
                    className="mt-1"
                />
              </div>
            <DialogFooter className="sm:justify-between items-center border-t pt-4 mt-4 gap-3">
              <div className="text-xl font-bold text-right sm:text-left w-full sm:w-auto">Total: <span className="text-primary">${calculateCartTotal().toFixed(2)}</span></div>
              <div className="flex gap-2 w-full sm:w-auto">
                <DialogClose asChild><Button type="button" variant="outline" className="flex-1 sm:flex-none">Continue Browsing</Button></DialogClose>
                <Button onClick={handlePlaceOrder} disabled={orderPlacing} className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1 sm:flex-none">
                  {orderPlacing ? <LoadingSpinner className="mr-2 h-4 w-4"/> : <Send className="mr-2 h-4 w-4" />}
                  Place Order
                </Button>
              </div>
            </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface MenuItemCardProps {
  item: MenuItemType;
  onAddToCart: (item: MenuItemType) => void;
}

const MenuItemCard = ({ item, onAddToCart }: MenuItemCardProps) => {
  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col group bg-card border-border transform hover:-translate-y-1">
      <div className="relative w-full h-48 overflow-hidden">
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt={item.name} layout="fill" objectFit="cover" className="transition-transform duration-500 group-hover:scale-110" data-ai-hint="delicious food plate"/>
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground/50" data-ai-hint="restaurant plate icon">
            <Utensils className="w-16 h-16" />
          </div>
        )}
      </div>
      <CardHeader className="p-4">
        <CardTitle className="text-lg font-semibold leading-tight text-foreground truncate">{item.name}</CardTitle>
        <p className="text-xl font-bold text-primary mt-1">${item.price.toFixed(2)}</p>
      </CardHeader>
      <CardContent className="p-4 pt-0 text-sm text-muted-foreground flex-grow min-h-[60px]">
        <p className="line-clamp-3">{item.description}</p>
      </CardContent>
      <CardFooter className="p-4 mt-auto">
        <Button onClick={() => onAddToCart(item)} size="default" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-lg">
          <PlusCircle className="mr-2 h-5 w-5"/>Add to Order
        </Button>
      </CardFooter>
    </Card>
  );
};
