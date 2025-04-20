import { useState, useEffect } from 'react';
import { PlusCircle, MinusCircle, ShoppingCart, Search, Users } from 'lucide-react';
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
import AiRecommendations from '../menu/AiRecommendations';
import GroupOrder from './GroupOrder';

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
  addedBy?: string; // New field for group orders
}

const CustomerMenu = ({ restaurantName, tableNumber }: CustomerMenuProps) => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<string>('');
  const { toast } = useToast();
  
  // Load group members on component mount
  useEffect(() => {
    // In a real app, this would fetch from an API/localStorage
    const user = localStorage.getItem(`table-${tableNumber}-user`);
    if (user) {
      setCurrentUser(user);
      
      // Simulate getting group members from an API
      // In a real app, this would be a real-time update from the server
      setGroupMembers([user]);
    }
    
    // Load cart data from localStorage
    const savedCart = localStorage.getItem(`table-${tableNumber}-cart`);
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error("Error loading cart from localStorage", e);
      }
    }
    
    // Set up periodic updates for group members
    const interval = setInterval(() => {
      // In a real app, this would fetch real-time data from the server
      // For demo purposes, we're simulating updates with random members
      if (Math.random() > 0.8) {
        const mockUsers = ['Alex', 'Jamie', 'Taylor', 'Jordan', 'Casey'];
        const randomUser = mockUsers[Math.floor(Math.random() * mockUsers.length)];
        if (user && !groupMembers.includes(randomUser) && randomUser !== user) {
          setGroupMembers(prev => [...prev, randomUser]);
        }
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [tableNumber]);
  
  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(`table-${tableNumber}-cart`, JSON.stringify(cart));
    
    // In a real app, this would send the cart data to the server
    // to update the real-time table bill and order status
    console.log("Cart updated, would sync with server:", cart);
  }, [cart, tableNumber]);
  
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
      const existingItem = prevCart.find(cartItem => cartItem.id === item.id && cartItem.addedBy === currentUser);
      
      if (existingItem) {
        return prevCart.map(cartItem => 
          cartItem.id === item.id && cartItem.addedBy === currentUser 
            ? { ...cartItem, quantity: cartItem.quantity + 1 } 
            : cartItem
        );
      } else {
        return [...prevCart, { 
          id: item.id, 
          name: item.name, 
          price: item.price, 
          quantity: 1,
          addedBy: currentUser || undefined
        }];
      }
    });
    
    toast({
      title: "Added to cart",
      description: `${item.name} has been added to your cart.`,
      duration: 2000,
    });
  };
  
  const removeFromCart = (itemId: number, addedBy?: string) => {
    setCart(prevCart => {
      const targetItem = addedBy 
        ? prevCart.find(item => item.id === itemId && item.addedBy === addedBy)
        : prevCart.find(item => item.id === itemId && item.addedBy === currentUser);
      
      if (targetItem && targetItem.quantity > 1) {
        return prevCart.map(item => 
          (item.id === itemId && item.addedBy === (addedBy || currentUser))
            ? { ...item, quantity: item.quantity - 1 } 
            : item
        );
      } else {
        return prevCart.filter(item => 
          !(item.id === itemId && item.addedBy === (addedBy || currentUser))
        );
      }
    });
  };
  
  const getItemCount = (itemId: number) => {
    const userItems = cart.filter(item => item.id === itemId && item.addedBy === currentUser);
    return userItems.reduce((total, item) => total + item.quantity, 0);
  };
  
  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };
  
  const getMyTotalItems = () => {
    return cart
      .filter(item => item.addedBy === currentUser)
      .reduce((total, item) => total + item.quantity, 0);
  };
  
  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };
  
  const getMyTotalPrice = () => {
    return cart
      .filter(item => item.addedBy === currentUser)
      .reduce((total, item) => total + (item.price * item.quantity), 0);
  };
  
  const handleJoinGroup = (name: string) => {
    setCurrentUser(name);
    if (!groupMembers.includes(name)) {
      setGroupMembers([...groupMembers, name]);
    }
  };
  
  const placeOrder = () => {
    // In a real app, this would send the order to the API
    console.log('Placing order:', cart);
    
    toast({
      title: "Order placed successfully!",
      description: `Your order has been sent to the kitchen.`,
      duration: 3000,
    });
    
    // Clear the cart
    setCart([]);
    setSheetOpen(false);
    
    // In a real app, we would keep the group intact but clear the cart
    localStorage.removeItem(`table-${tableNumber}-cart`);
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
        {/* Group Order Component - NEW */}
        <div className="mb-6">
          <GroupOrder 
            tableId={tableNumber} 
            onJoinGroup={handleJoinGroup}
            groupMembers={groupMembers}
          />
        </div>
        
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
                                disabled={!currentUser}
                              >
                                <MinusCircle className="h-4 w-4" />
                              </Button>
                              <span className="font-medium">{itemCount}</span>
                              <Button 
                                variant="outline" 
                                size="icon"
                                onClick={() => addToCart(item)}
                                className="h-8 w-8 rounded-full"
                                disabled={!currentUser}
                              >
                                <PlusCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              onClick={() => addToCart(item)}
                              className="rounded-full"
                              disabled={!currentUser}
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
                  
                  {/* Group Order Items - NEW */}
                  {groupMembers.length > 1 && (
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2 text-restaurant-primary" />
                        <h4 className="font-medium">Group Order</h4>
                      </div>
                      <div className="pl-6">
                        {groupMembers.map((member) => {
                          const memberItems = cart.filter(item => item.addedBy === member);
                          const memberTotal = memberItems.reduce((total, item) => total + (item.price * item.quantity), 0);
                          
                          if (memberItems.length === 0) return null;
                          
                          return (
                            <div key={member} className="mb-4">
                              <div className="flex justify-between items-center mb-2">
                                <Badge variant="outline">{member}</Badge>
                                <span className="text-sm font-medium">${memberTotal.toFixed(2)}</span>
                              </div>
                              
                              {memberItems.map((item) => (
                                <div key={`${member}-${item.id}`} className="flex justify-between items-center text-sm ml-2 mb-1">
                                  <span>{item.quantity}x {item.name}</span>
                                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                      
                      <Separator />
                    </div>
                  )}
                  
                  {/* Cart Items by Current User */}
                  <div className="space-y-4">
                    <h4 className="font-medium">
                      {currentUser ? `${currentUser}'s Items` : 'Your Items'}
                    </h4>
                    
                    {cart
                      .filter(item => item.addedBy === currentUser)
                      .map((item) => (
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
                    {groupMembers.length > 1 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span>Your subtotal</span>
                          <span>${getMyTotalPrice().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Others' subtotal</span>
                          <span>${(getTotalPrice() - getMyTotalPrice()).toFixed(2)}</span>
                        </div>
                      </>
                    )}
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
                    disabled={!currentUser || getMyTotalItems() === 0}
                  >
                    {currentUser 
                      ? (groupMembers.length > 1 
                          ? `Place Order for ${groupMembers.join(' & ')}`
                          : 'Place Order') 
                      : 'Join Group First'}
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
