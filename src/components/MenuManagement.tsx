
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Utensils, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Coffee,
  Soup,
  UtensilsCrossed,
  IceCream
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import AiMenuGenerator from './AiMenuGenerator';
import { MenuItemSuggestion } from '@/services/aiService';

// Sample menu data - in a real app, this would come from an API
const MENU_ITEMS = [
  {
    id: 1,
    name: 'Classic Burger',
    description: 'Beef patty with lettuce, tomato, and our special sauce',
    price: 12.99,
    category: 'Main Courses',
    image: '/placeholder.svg'
  },
  {
    id: 2,
    name: 'Caesar Salad',
    description: 'Romaine lettuce with Caesar dressing, croutons, and parmesan',
    price: 8.99,
    category: 'Starters',
    image: '/placeholder.svg'
  },
  {
    id: 3,
    name: 'Margherita Pizza',
    description: 'Tomato sauce, mozzarella, and fresh basil',
    price: 14.99,
    category: 'Main Courses',
    image: '/placeholder.svg'
  },
  {
    id: 4,
    name: 'Chocolate Cake',
    description: 'Rich chocolate cake with a molten center',
    price: 6.99,
    category: 'Desserts',
    image: '/placeholder.svg'
  },
  {
    id: 5,
    name: 'French Fries',
    description: 'Crispy golden fries with sea salt',
    price: 4.99,
    category: 'Sides',
    image: '/placeholder.svg'
  },
  {
    id: 6,
    name: 'Iced Tea',
    description: 'Refreshing iced tea with lemon',
    price: 2.99,
    category: 'Drinks',
    image: '/placeholder.svg'
  }
];

const CATEGORIES = [
  {
    id: 'all',
    name: 'All Items',
    icon: Utensils
  },
  {
    id: 'starters',
    name: 'Starters',
    icon: Soup
  },
  {
    id: 'main-courses',
    name: 'Main Courses',
    icon: UtensilsCrossed
  },
  {
    id: 'sides',
    name: 'Sides',
    icon: Utensils
  },
  {
    id: 'desserts',
    name: 'Desserts',
    icon: IceCream
  },
  {
    id: 'drinks',
    name: 'Drinks',
    icon: Coffee
  }
];

const MenuManagement = () => {
  const [items, setItems] = useState(MENU_ITEMS);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const filteredItems = items.filter(item => {
    // Filter by category first
    if (activeCategory !== 'all') {
      const categoryMatch = item.category.toLowerCase().replace(' ', '-') === activeCategory;
      if (!categoryMatch) return false;
    }
    
    // Then filter by search query
    if (searchQuery) {
      return (
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return true;
  });
  
  const handleAddItem = (newItem: MenuItemSuggestion) => {
    // In a real app, this would send the data to an API
    const newId = Math.max(...items.map(item => item.id), 0) + 1;
    
    const itemToAdd = {
      id: newId,
      name: newItem.name,
      description: newItem.description,
      price: newItem.price,
      category: newItem.category,
      image: '/placeholder.svg' // Default image
    };
    
    setItems([...items, itemToAdd]);
    
    toast({
      description: `${newItem.name} has been added to your menu`,
    });
  };
  
  const handleDeleteItem = (id: number) => {
    // In a real app, this would send a delete request to an API
    setItems(items.filter(item => item.id !== id));
    
    toast({
      description: "Menu item has been deleted",
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="page-title">Menu Management</h1>
        <Button onClick={() => navigate('/dashboard/menu/add')}>
          <Plus className="mr-2 h-4 w-4" /> Add Menu Item
        </Button>
      </div>
      
      {/* AI Menu Generator - NEW */}
      <AiMenuGenerator onAddItem={handleAddItem} />
      
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-56 flex-shrink-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Categories</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {CATEGORIES.map(category => (
                  <button
                    key={category.id}
                    className={`flex items-center w-full px-4 py-2 text-left transition-colors ${
                      activeCategory === category.id
                        ? 'bg-muted font-medium'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setActiveCategory(category.id)}
                  >
                    <category.icon className="h-4 w-4 mr-2 text-muted-foreground" />
                    {category.name}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {category.id === 'all'
                        ? items.length
                        : items.filter(item =>
                            item.category.toLowerCase().replace(' ', '-') === category.id
                          ).length}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="flex-1">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Menu Items</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <CardDescription>
                {filteredItems.length} items found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <div className="w-20 h-20 bg-gray-100 flex-shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 p-3 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <h3 className="font-medium">{item.name}</h3>
                            <span className="text-restaurant-primary font-medium">
                              ${item.price.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {item.description}
                          </p>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">
                            {item.category}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => navigate(`/dashboard/menu/edit/${item.id}`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Utensils className="mx-auto h-12 w-12 text-muted stroke-1" />
                  <h3 className="mt-2 text-lg font-medium">No items found</h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? "Try a different search term"
                      : "Add some items to your menu"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MenuManagement;
