
import { useState } from 'react';
import { PlusCircle, MinusCircle, ShoppingCart, Search } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import AiRecommendations from './AiRecommendations';

// Sample data - in a real application, this would come from an API
const categories = [
  'All',
  'Starters',
  'Main Courses',
  'Sides',
  'Desserts',
  'Drinks'
];

const menuItems = [
  { 
    id: 1, 
    name: 'Classic Burger', 
    description: 'Beef patty with lettuce, tomato, and our special sauce',
    category: 'Main Courses',
    price: 12.99,
    image: '/placeholder.svg'
  },
  { 
    id: 2, 
    name: 'Caesar Salad', 
    description: 'Romaine lettuce with Caesar dressing, croutons, and parmesan',
    category: 'Starters',
    price: 8.99,
    image: '/placeholder.svg'
  },
  { 
    id: 3, 
    name: 'Margherita Pizza', 
    description: 'Tomato sauce, mozzarella, and fresh basil',
    category: 'Main Courses',
    price: 14.99,
    image: '/placeholder.svg'
  },
  { 
    id: 4, 
    name: 'Chocolate Cake', 
    description: 'Rich chocolate cake with a molten center',
    category: 'Desserts',
    price: 6.99,
    image: '/placeholder.svg'
  },
  { 
    id: 5, 
    name: 'French Fries', 
    description: 'Crispy golden fries with sea salt',
    category: 'Sides',
    price: 4.99,
    image: '/placeholder.svg'
  },
  { 
    id: 6, 
    name: 'Iced Tea', 
    description: 'Refreshing iced tea with lemon',
    category: 'Drinks',
    price: 2.99,
    image: '/placeholder.svg'
  },
  { 
    id: 7, 
    name: 'Chicken Wings', 
    description: 'Spicy chicken wings with blue cheese dip',
    category: 'Starters',
    price: 9.99,
    image: '/placeholder.svg'
  },
  { 
    id: 8, 
    name: 'Spaghetti Carbonara', 
    description: 'Creamy pasta with bacon and parmesan',
    category: 'Main Courses',
    price: 13.99,
    image: '/placeholder.svg'
  }
];

interface CustomerMenuProps {
  restaurantName: string;
  tableNumber: number;
}

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

const CustomerMenu = ({ restaurantName, tableNumber }: CustomerMenuProps) => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  
  const filteredItems = menuItems
    .filter(item => {
      // First filter by category
      if (activeCategory !== 'All' && item.category !== activeCategory) {
        return false;
      }
      
      // Then filter by search query if it exists
      if (searchQuery.trim()) {
        return (
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      return true;
    });

  const addToCart = (item: typeof menuItems[0]) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.id === item.id);
      
      if (existingItem) {
        return prevCart.map(cartItem => 
          cartItem.id === item.id 
            ? { ...cartItem, quantity: cartItem.quantity + 1 } 
            : cartItem
        );
      } else {
        return [...prevCart, { id: item.id, name: item.name, price: item.price, quantity: 1 }];
      }
    });
    
    toast({
      title: "Added to cart",
      description: `${item.name} has been added to your cart.`,
      duration: 2000,
    });
  };
  
  const removeFromCart = (itemId: number) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === itemId);
      
      if (existingItem && existingItem.quantity > 1) {
        return prevCart.map(item => 
          item.id === itemId 
            ? { ...item, quantity: item.quantity - 1 } 
            : item
        );
      } else {
        return prevCart.filter(item => item.id !== itemId);
      }
    });
  };
  
  const getItemCount = (itemId: number) => {
    const item = cart.find(item => item.id === itemId);
    return item ? item.quantity : 0;
  };
  
  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };
  
  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };
  
  const placeOrder = () => {
    // In a real app, this would send the order to the API
    console.log('Placing order:', cart);
    
    toast({
      title: "Order placed successfully!",
      description: `Your order has been sent to the kitchen.`,
      duration: 3000,
    });
    
    setCart([]);
    setSheetOpen(false);
  };
  
  return (
    <div className="pb-20">
      <div className="sticky top-0 z-10 bg-gradient-to-r from-restaurant-primary to-restaurant-primary/90 text-white p-4 shadow-md">
        <div className="container mx-auto">
          <h1 className="text-xl font-bold">{restaurantName}</h1>
          <p className="text-sm">Table {tableNumber}</p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        {!searchQuery && activeCategory === 'All' && (
          <AiRecommendations 
            menuItems={menuItems} 
            onSelectItem={(item) => addToCart(item)}
          />
        )}
        
        <h2 className="text-2xl font-bold mb-6">Menu</h2>
        
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="w-full max-w-full h-auto flex flex-wrap mb-6">
            {categories.map((category) => (
              <TabsTrigger key={category} value={category} className="flex-grow">
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <TabsContent value={activeCategory}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredItems.map((item) => {
                const itemCount = getItemCount(item.id);
                
                return (
                  <div key={item.id} className="bg-white rounded-lg shadow overflow-hidden border hover:shadow-md transition-all duration-200">
                    <div className="flex flex-col sm:flex-row">
                      <div className="w-full sm:w-1/3 h-32 sm:h-auto bg-gray-100">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <h3 className="font-semibold">{item.name}</h3>
                            <span className="text-restaurant-primary font-semibold">${item.price.toFixed(2)}</span>
                          </div>
                          <p className="mt-1 text-sm text-gray-500">{item.description}</p>
                        </div>
                        
                        <div className="mt-4 flex justify-between items-center">
                          {itemCount > 0 ? (
                            <div className="flex items-center space-x-2">
                              <Button 
                                variant="outline" 
                                size="icon" 
                                onClick={() => removeFromCart(item.id)}
                                className="h-8 w-8 rounded-full"
                              >
                                <MinusCircle className="h-4 w-4" />
                              </Button>
                              <span className="font-medium">{itemCount}</span>
                              <Button 
                                variant="outline" 
                                size="icon"
                                onClick={() => addToCart(item)}
                                className="h-8 w-8 rounded-full"
                              >
                                <PlusCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              onClick={() => addToCart(item)}
                              className="rounded-full"
                            >
                              Add to Order
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {filteredItems.length === 0 && (
              <div className="text-center py-12 bg-muted/30 rounded-lg">
                <p className="text-muted-foreground">No items found</p>
                {searchQuery && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Cart button */}
      {getTotalItems() > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
          <div className="container mx-auto">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button className="w-full bg-restaurant-primary hover:bg-restaurant-primary/90">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  View Order ({getTotalItems()} items) - ${getTotalPrice().toFixed(2)}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Your Order</SheetTitle>
                </SheetHeader>
                
                <div className="mt-6 space-y-6">
                  <div>
                    <h3 className="font-medium">Table {tableNumber}</h3>
                    <p className="text-sm text-muted-foreground">{restaurantName}</p>
                  </div>
                  
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="outline" 
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => removeFromCart(item.id)}
                            >
                              <MinusCircle className="h-3 w-3" />
                            </Button>
                            <span className="font-medium">{item.quantity}</span>
                            <Button 
                              variant="outline" 
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => addToCart(menuItems.find(menuItem => menuItem.id === item.id)!)}
                            >
                              <PlusCircle className="h-3 w-3" />
                            </Button>
                          </div>
                          <span>{item.name}</span>
                        </div>
                        <span>${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>${getTotalPrice().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>${(getTotalPrice() * 0.08).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>${(getTotalPrice() * 1.08).toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full bg-restaurant-primary hover:bg-restaurant-primary/90 mt-6"
                    size="lg"
                    onClick={placeOrder}
                  >
                    Place Order
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerMenu;
