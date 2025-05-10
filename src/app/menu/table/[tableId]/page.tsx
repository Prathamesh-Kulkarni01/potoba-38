
// src/app/menu/table/[tableId]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { getRestaurant } from '@/lib/firebase/firestore';
import { getTableByDocIdFromGroup } from '@/lib/firebase/tables'; // Updated import
import { getMenuCategories, getMenuSubcategories, getMenuItems as fetchMenuItemsFirebase } from '@/lib/firebase/menu';
import { createOrder } from '@/lib/firebase/orders';
import type { RestaurantProfile, Table, MenuCategory, MenuSubcategory, MenuItem as MenuItemType, OrderItem, OrderStatus } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Utensils, ShoppingCart, PlusCircle, MinusCircle, Trash2, AlertTriangle, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';

interface CartItem extends OrderItem {
  // Extends OrderItem, could add specific UI-related fields if needed
}

export default function ScanOrderPage() {
  const params = useParams();
  const tableDocId = params.tableId as string; // This is the tableDocId from the URL
  const router = useRouter();
  const { toast } = useToast();

  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [tableInfo, setTableInfo] = useState<Table | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [subcategories, setSubcategories] = useState<MenuSubcategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerNotes, setCustomerNotes] = useState('');
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [orderPlacing, setOrderPlacing] = useState(false);
  
  const fetchData = useCallback(async () => {
    if (!tableDocId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Table ID is missing.' });
      router.push('/'); 
      return;
    }
    setPageLoading(true);
    try {
      const tableResult = await getTableByDocIdFromGroup(tableDocId);

      if (!tableResult || !tableResult.table || !tableResult.restaurantId) {
        toast({ variant: 'destructive', title: 'Invalid Table', description: 'This QR code is invalid or the table does not exist.' });
        setPageLoading(false);
        // Keep user on page to see error, or redirect: router.push('/');
        return;
      }
      
      const { table, restaurantId } = tableResult;
      setTableInfo(table);

      const [fetchedRestaurant, fetchedCategories, fetchedSubcategories, fetchedMenuItems] = await Promise.all([
        getRestaurant(restaurantId),
        getMenuCategories(restaurantId),
        getMenuSubcategories(restaurantId), // Fetch all for the restaurant
        fetchMenuItemsFirebase(restaurantId) // Fetch all for the restaurant
      ]);

      if (!fetchedRestaurant) {
        toast({ variant: 'destructive', title: 'Restaurant Not Found', description: 'The associated restaurant could not be loaded.' });
        setPageLoading(false);
        return;
      }
      
      setRestaurant(fetchedRestaurant);
      setCategories(fetchedCategories.sort((a, b) => a.order - b.order));
      setSubcategories(fetchedSubcategories.sort((a, b) => a.order - b.order));
      setMenuItems(fetchedMenuItems.sort((a, b) => a.order - b.order));

    } catch (error) {
      console.error("Error fetching data for order page:", error);
      toast({ variant: "destructive", title: "Error Loading Menu", description: "Could not load menu data. Please try scanning again." });
    } finally {
      setPageLoading(false);
    }
  }, [tableDocId, router, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    if (!restaurant || !tableInfo) {
      toast({ variant: 'destructive', title: 'Error', description: 'Restaurant or table information is missing. Cannot place order.' });
      return;
    }
    if (cart.length === 0) {
      toast({ variant: 'destructive', title: 'Empty Cart', description: 'Please add items to your cart before placing an order.' });
      return;
    }

    setOrderPlacing(true);
    const orderData = {
      restaurantId: restaurant.id,
      tableId: tableInfo.id, // Use the actual table ID (which is tableDocId here)
      tableNumber: tableInfo.tableNumber,
      items: cart,
      subtotal: calculateCartTotal(),
      totalAmount: calculateCartTotal(), 
      status: 'pending_kitchen' as OrderStatus,
      customerNotes: customerNotes || undefined,
    };

    try {
      await createOrder(restaurant.id, orderData);
      toast({ title: 'Order Placed!', description: 'Your order has been sent to the kitchen.' });
      setCart([]);
      setCustomerNotes('');
      setIsCartModalOpen(false);
    } catch (error: any) {
      console.error("Error placing order:", error);
      toast({ variant: 'destructive', title: 'Order Failed', description: error.message || "Could not place your order. Please try again." });
    } finally {
      setOrderPlacing(false);
    }
  };

  if (pageLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><LoadingSpinner className="h-12 w-12 text-primary" /></div>;
  }

  if (!restaurant || !tableInfo) { // Check if restaurant or tableInfo is still null after loading
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive mb-2">Unable to Load Menu</h1>
        <p className="text-muted-foreground mb-4">
          We couldn't fetch the menu for this table. This might be due to a configuration issue, an invalid QR code, or the table/restaurant might not exist.
          Please try scanning again or ask staff for assistance.
        </p>
        <Button onClick={() => router.push('/')}>Go to Homepage</Button>
         <p className="text-xs text-muted-foreground mt-8 max-w-md mx-auto">Developer Note: If this persists, ensure the table ID from the QR code (`{tableDocId}`) exists and has a `tableDocId` field matching its document ID, and a valid `restaurantId` field. Also, check Firestore indexes for the `tables` collection group on `tableDocId`.</p>
      </div>
    );
  }
  
  const cartTotalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-primary">{restaurant.name}</h1>
            <p className="text-sm text-muted-foreground">Table {tableInfo.tableNumber}</p>
          </div>
          <Button onClick={() => setIsCartModalOpen(true)} variant="outline" className="relative">
            <ShoppingCart className="mr-2 h-5 w-5"/>
            Cart
            {cartTotalItems > 0 && (
              <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {cartTotalItems}
              </Badge>
            )}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-8">
        {categories.length === 0 && menuItems.length === 0 && !pageLoading && (
            <div className="text-center py-20">
                <Utensils className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-xl text-muted-foreground">The menu is currently empty for {restaurant.name}.</p>
                <p className="text-sm text-muted-foreground">Please check back later or ask staff for assistance.</p>
            </div>
        )}

        {categories.map(category => (
          <section key={category.id} aria-labelledby={`category-title-${category.id}`}>
            <h2 id={`category-title-${category.id}`} className="text-2xl font-semibold text-foreground mb-4 sticky top-[68px] bg-background/80 backdrop-blur-sm py-2 z-30 -mx-4 px-4 border-b">
              {category.name}
            </h2>
            
            {menuItems.filter(item => item.categoryId === category.id && !item.subcategoryId && item.availability).length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {menuItems.filter(item => item.categoryId === category.id && !item.subcategoryId && item.availability).map(item => (
                  <MenuItemCard key={item.id} item={item} onAddToCart={addToCart} />
                ))}
              </div>
            )}

            {subcategories.filter(sub => sub.categoryId === category.id).map(subcategory => (
              menuItems.filter(item => item.subcategoryId === subcategory.id && item.availability).length > 0 && (
                <div key={subcategory.id} className="mb-6">
                  <h3 className="text-xl font-medium text-muted-foreground mb-3 pl-2 border-l-4 border-primary">
                    {subcategory.name}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {menuItems.filter(item => item.subcategoryId === subcategory.id && item.availability).map(item => (
                      <MenuItemCard key={item.id} item={item} onAddToCart={addToCart} />
                    ))}
                  </div>
                </div>
              )
            ))}
             {/* Message if category has no visible items/subcategories */}
             {menuItems.filter(item => item.categoryId === category.id && item.availability).length === 0 &&
              subcategories.filter(sub => sub.categoryId === category.id && menuItems.some(mi => mi.subcategoryId === sub.id && mi.availability)).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No available items in this category currently.</p>
             )}
          </section>
        ))}
      </main>
      
      <Dialog open={isCartModalOpen} onOpenChange={setIsCartModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center"><ShoppingCart className="mr-3 h-6 w-6 text-primary"/>Your Order</DialogTitle>
          </DialogHeader>
          {cart.length > 0 ? (
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
              {cart.map(item => (
                <div key={item.menuItemId} className="flex items-center justify-between p-3 border rounded-lg hover:shadow-sm">
                  <div>
                    <p className="font-semibold">{item.menuItemName}</p>
                    <p className="text-sm text-muted-foreground">${item.unitPrice.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.menuItemId)} className="h-7 w-7"><MinusCircle className="h-4 w-4"/></Button>
                    <span className="w-6 text-center">{item.quantity}</span>
                    <Button variant="ghost" size="icon" onClick={() => addToCart(menuItems.find(mi => mi.id === item.menuItemId)!)} className="h-7 w-7"><PlusCircle className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteFromCart(item.menuItemId)} className="h-7 w-7 text-destructive"><Trash2 className="h-4 w-4"/></Button>
                    <p className="font-semibold w-16 text-right">${item.totalPrice.toFixed(2)}</p>
                  </div>
                </div>
              ))}
              <div className="mt-4">
                <Label htmlFor="customerNotes">Order Notes (optional)</Label>
                <Textarea 
                    id="customerNotes" 
                    value={customerNotes} 
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="Any special requests for the kitchen?"
                    className="mt-1"
                />
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">Your cart is empty. Add some items from the menu!</p>
          )}
          {cart.length > 0 && (
            <DialogFooter className="sm:justify-between items-center border-t pt-4">
              <div className="text-xl font-bold">Total: ${calculateCartTotal().toFixed(2)}</div>
              <div className="flex gap-2">
                <DialogClose asChild><Button type="button" variant="outline">Continue Browsing</Button></DialogClose>
                <Button onClick={handlePlaceOrder} disabled={orderPlacing} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {orderPlacing ? <LoadingSpinner className="mr-2 h-4 w-4"/> : <Send className="mr-2 h-4 w-4" />}
                  Place Order
                </Button>
              </div>
            </DialogFooter>
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
    <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow flex flex-col">
      {item.imageUrl ? (
        <Image src={item.imageUrl} alt={item.name} width={300} height={180} className="w-full h-40 object-cover" data-ai-hint="food dish"/>
      ) : (
        <div className="w-full h-40 bg-muted flex items-center justify-center text-muted-foreground" data-ai-hint="generic food">
          <Utensils className="w-12 h-12" />
        </div>
      )}
      <CardHeader className="p-3">
        <CardTitle className="text-md leading-tight">{item.name}</CardTitle>
        <p className="text-sm font-semibold text-primary">${item.price.toFixed(2)}</p>
      </CardHeader>
      <CardContent className="p-3 pt-0 text-xs text-muted-foreground flex-grow h-16 overflow-y-auto">
        {item.description}
      </CardContent>
      <CardFooter className="p-3 mt-auto">
        <Button onClick={() => onAddToCart(item)} size="sm" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
          <PlusCircle className="mr-2 h-4 w-4"/>Add to Order
        </Button>
      </CardFooter>
    </Card>
  );
};
