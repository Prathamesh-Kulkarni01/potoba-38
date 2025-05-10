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
import { 
  Utensils, ShoppingCart, PlusCircle, MinusCircle, Trash2, Send, PackageOpen, ChefHat, 
  Search, Flame, Soup, Fish, Cake, Coffee, Salad, Pizza as PizzaIcon, Hamburger, MoreHorizontal
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
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

const getCategoryIcon = (categoryName: string): React.ElementType => {
  const name = categoryName.toLowerCase();
  if (name.includes('burger')) return Hamburger;
  if (name.includes('pizza')) return PizzaIcon;
  if (name.includes('salad')) return Salad;
  if (name.includes('soup')) return Soup;
  if (name.includes('starter') || name.includes('appetizer')) return Flame;
  if (name.includes('main') || name.includes('entree')) return Utensils;
  if (name.includes('sea') || name.includes('fish')) return Fish;
  if (name.includes('dessert') || name.includes('sweet')) return Cake;
  if (name.includes('drink') || name.includes('beverage')) return Coffee;
  return MoreHorizontal; // Default icon
};

export default function PublicDigitalMenu({ restaurant, categories, subcategories, menuItems: initialMenuItems }: PublicDigitalMenuProps) {
  const { toast } = useToast();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerNotes, setCustomerNotes] = useState('');
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [orderPlacing, setOrderPlacing] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string>(categories[0]?.id || 'all');
  const [searchTerm, setSearchTerm] = useState('');

  const menuItems = useMemo(() => 
    initialMenuItems.filter(item => 
      item.availability && 
      (item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())))
    )
  , [initialMenuItems, searchTerm]);

  const itemsByActiveCategory = useMemo(() => {
    if (activeCategoryId === 'all') return menuItems;
    return menuItems.filter(item => item.categoryId === activeCategoryId);
  }, [menuItems, activeCategoryId]);

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
    const placeholderTableId = `online_${restaurant.id}_${Date.now()}`; // More unique ID
    const placeholderTableNumber = 'Online Order';

    const orderData = {
      restaurantId: restaurant.id,
      tableId: placeholderTableId, 
      tableNumber: placeholderTableNumber,
      items: cart,
      subtotal: calculateCartTotal(),
      taxAmount: calculateCartTotal() * (restaurant.taxRate ?? 0.10), 
      totalAmount: calculateCartTotal() * (1 + (restaurant.taxRate ?? 0.10)), 
      status: 'pending_kitchen' as OrderStatus,
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

  if (!restaurant) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner className="m-auto h-10 w-10 text-primary" /></div>;

  const sortedCategories = [...categories].sort((a,b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/5 to-background text-foreground flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg shadow-lg">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Image 
              src={`https://picsum.photos/seed/${restaurant.id}logo/40/40`} 
              alt={`${restaurant.name} Logo`}
              width={40}
              height={40}
              className="rounded-full border-2 border-primary shadow-sm"
              data-ai-hint="restaurant logo design"
            />
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-primary truncate max-w-[150px] sm:max-w-xs">{restaurant.name}</h1>
              {restaurant.type && <p className="text-xs sm:text-sm text-muted-foreground">{restaurant.type}</p>}
            </div>
          </div>
          <Button onClick={() => setIsCartModalOpen(true)} variant="default" size="default" className="relative rounded-full shadow-md bg-accent hover:bg-accent/90 text-accent-foreground px-4 py-2 h-auto">
            <ShoppingCart className="mr-2 h-5 w-5"/>
            <span className="hidden sm:inline">Order</span> ({cartTotalItems})
            {cartTotalItems > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
                {cartTotalItems}
              </Badge>
            )}
          </Button>
        </div>
        {/* Search Bar - part of sticky header */}
        <div className="container mx-auto px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder={`Search in ${restaurant.name}...`}
              className="w-full pl-10 pr-4 py-2 rounded-full border-border bg-background focus:ring-primary focus:border-primary text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Category Navigation - Below sticky header, but content scrolls under it */}
      <div className="py-3 bg-card/80 backdrop-blur-sm shadow-sm border-b border-border sticky top-[125px] sm:top-[105px] z-30"> 
        <ScrollArea orientation="horizontal" className="whitespace-nowrap">
          <div className="container mx-auto px-2 sm:px-4 flex space-x-2 items-center h-16">
          <Button
              variant={activeCategoryId === 'all' ? "default" : "outline"}
              onClick={() => setActiveCategoryId('all')}
              className={cn(
                "flex flex-col items-center justify-center h-14 w-20 rounded-lg p-1 shadow-sm transition-all duration-200 transform hover:scale-105",
                activeCategoryId === 'all' ? "bg-primary text-primary-foreground border-primary" : "bg-card text-card-foreground border-border hover:bg-muted"
              )}
            >
              <Utensils className="h-5 w-5 mb-0.5" />
              <span className="text-xs font-medium truncate">All</span>
            </Button>
            {sortedCategories.map(category => {
              const Icon = getCategoryIcon(category.name);
              return (
                <Button
                  key={category.id}
                  variant={activeCategoryId === category.id ? "default" : "outline"}
                  onClick={() => setActiveCategoryId(category.id)}
                  className={cn(
                    "flex flex-col items-center justify-center h-14 w-20 rounded-lg p-1 shadow-sm transition-all duration-200 transform hover:scale-105",
                     activeCategoryId === category.id ? "bg-primary text-primary-foreground border-primary" : "bg-card text-card-foreground border-border hover:bg-muted"
                  )}
                >
                  <Icon className="h-5 w-5 mb-0.5" />
                  <span className="text-xs font-medium truncate">{category.name}</span>
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </div>
      
      {/* Menu Content */}
      <main className="container mx-auto px-4 py-6 space-y-8 flex-grow">
        {itemsByActiveCategory.length === 0 && !searchTerm && (
            <div className="text-center py-20 flex flex-col items-center">
                <ChefHat className="mx-auto h-20 w-20 text-muted-foreground/40 mb-6" />
                <h2 className="text-xl font-semibold text-muted-foreground mb-2">Nothing here yet!</h2>
                <p className="text-muted-foreground max-w-md">
                  This category is currently empty or all items are unavailable.
                  Try selecting another category or check back later.
                </p>
            </div>
        )}
         {itemsByActiveCategory.length === 0 && searchTerm && (
            <div className="text-center py-20 flex flex-col items-center">
                <Search className="mx-auto h-20 w-20 text-muted-foreground/40 mb-6" />
                <h2 className="text-xl font-semibold text-muted-foreground mb-2">No results for "{searchTerm}"</h2>
                <p className="text-muted-foreground max-w-md">
                  Try searching for something else or clear the search to see all items.
                </p>
            </div>
        )}

        {/* Display items */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {itemsByActiveCategory.map(item => {
            // If activeCategoryId is not 'all', we're already filtered.
            // If it is 'all', we need to show subcategory headers.
            // For simplicity with the new top category bar, we might skip subcategory headers if 'all' is active,
            // or find a way to group them.
            // Let's assume items are already filtered by category by itemsByActiveCategory.
            // Subcategories within the selected category can be handled here.
            
            const subCat = item.subcategoryId ? subcategories.find(s => s.id === item.subcategoryId) : null;
            // This logic for displaying subcategory titles might be complex with the current filter.
            // Revisit if explicit subcategory grouping is needed on the "All" tab.
            // For now, flat list from itemsByActiveCategory.
            return <MenuItemCard key={item.id} item={item} onAddToCart={addToCart} />;
          })}
        </div>
      </main>

      {/* Cart Modal */}
      <Dialog open={isCartModalOpen} onOpenChange={setIsCartModalOpen}>
        <DialogContent className="sm:max-w-lg w-[95vw] rounded-lg flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center"><ShoppingCart className="mr-3 h-6 w-6 text-primary"/>Your Order Summary</DialogTitle>
            <CardDescription>Review your items before placing the order for {restaurant.name}.</CardDescription>
          </DialogHeader>
          
          {cart.length > 0 ? (
            <ScrollArea className="flex-grow my-4 pr-3 -mr-2"> {/* Negative margin to offset scrollbar */}
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.menuItemId} className="flex items-center justify-between p-3 border rounded-md hover:shadow-sm bg-card/50">
                    <div className="flex-1 mr-2">
                      <p className="font-semibold text-sm truncate">{item.menuItemName}</p>
                      <p className="text-xs text-muted-foreground">${item.unitPrice.toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="icon" onClick={() => removeFromCart(item.menuItemId)} className="h-7 w-7 shrink-0"><MinusCircle className="h-4 w-4"/></Button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <Button variant="outline" size="icon" onClick={() => addToCart(menuItems.find(mi => mi.id === item.menuItemId)!)} className="h-7 w-7 shrink-0"><PlusCircle className="h-4 w-4"/></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteFromCart(item.menuItemId)} className="h-7 w-7 text-destructive shrink-0"><Trash2 className="h-4 w-4"/></Button>
                    </div>
                     <p className="font-semibold w-20 text-right text-sm ml-2">${item.totalPrice.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center py-8">
              <PackageOpen className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Your order is empty. <br/> Add delicious items from our menu!</p>
            </div>
          )}
           
          {cart.length > 0 && (
            <>
              <div className="mt-auto"> {/* Pushes notes and footer to bottom if content is short */}
                <div className="mt-2">
                  <label htmlFor="customerNotes" className="block text-sm font-medium text-foreground mb-1">Order Notes (optional)</label>
                  <Textarea 
                      id="customerNotes" 
                      value={customerNotes} 
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      placeholder="Any special requests or dietary needs for the kitchen?"
                      className="mt-1 text-sm"
                      rows={2}
                  />
                </div>
              </div>
              <DialogFooter className="sm:justify-between items-center border-t pt-4 mt-4 gap-3">
                <div className="text-xl font-bold text-right sm:text-left w-full sm:w-auto">Total: <span className="text-primary">${calculateCartTotal().toFixed(2)}</span></div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <DialogClose asChild><Button type="button" variant="outline" className="flex-1 sm:flex-none">Browse</Button></DialogClose>
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

      {/* Footer (optional) */}
      <footer className="py-6 mt-auto text-center text-xs text-muted-foreground border-t border-border bg-card">
        Powered by AuthZen &copy; {new Date().getFullYear()}
      </footer>
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
      <div className="relative w-full h-48 sm:h-40 md:h-48 overflow-hidden">
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt={item.name} layout="fill" objectFit="cover" className="transition-transform duration-500 group-hover:scale-105" data-ai-hint={`${item.name} food`}/>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center text-muted-foreground/30" data-ai-hint="restaurant food icon">
            <Utensils className="w-16 h-16 opacity-50" />
          </div>
        )}
         {!item.availability && (
          <Badge variant="destructive" className="absolute top-2 right-2 z-10">Unavailable</Badge>
        )}
      </div>
      <CardHeader className="p-3 sm:p-4 flex-grow">
        <CardTitle className="text-base sm:text-lg font-semibold leading-tight text-foreground truncate group-hover:text-primary transition-colors">{item.name}</CardTitle>
         {item.description && <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2 min-h-[2.5em] sm:min-h-[2.25em]">{item.description}</CardDescription> }
      </CardHeader>
      <CardFooter className="p-3 sm:p-4 mt-auto flex justify-between items-center">
         <p className="text-lg sm:text-xl font-bold text-primary">${item.price.toFixed(2)}</p>
        <Button onClick={() => onAddToCart(item)} size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-md shadow-sm hover:shadow-md transition-shadow whitespace-nowrap text-xs sm:text-sm" disabled={!item.availability}>
          <PlusCircle className="mr-1.5 h-4 w-4 sm:h-5 sm:w-5"/>Add
        </Button>
      </CardFooter>
    </Card>
  );
};
