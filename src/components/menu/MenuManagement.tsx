import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import useApi from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

const MenuManagement = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const { toast } = useToast();
  const navigate = useNavigate();
  const { menu, category } = useApi();
  const { currentRestaurantId } = useAuth();

  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const response = await menu.get(currentRestaurantId);
        Array.isArray(response) && setItems(response);
      } catch (error) {
        console.error('Failed to fetch menu items:', error);
        toast({
          description: 'Failed to load menu items. Please try again later.',
        });
      }
    };

    const fetchCategories = async () => {
      try {
        const response = await category.get(currentRestaurantId);
        setCategories([
          { id: 'all', name: 'All Items', icon: Utensils },
          ...(Array.isArray(response) ? response.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            icon: Utensils, 
          })) : []),
        ]);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        toast({
          description: 'Failed to load categories. Please try again later.',
        });
      }
    };

    fetchMenuItems();
    fetchCategories();
  }, [currentRestaurantId]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
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
  }, [items, activeCategory, searchQuery]);

  const handleAddItem = useCallback((newItem: MenuItemSuggestion) => {
    const newId = Math.max(...items.map(item => item.id), 0) + 1;

    const itemToAdd = {
      id: newId,
      name: newItem.name,
      description: newItem.description,
      price: newItem.price,
      category: newItem.category,
      image: '/placeholder.svg' // Default image
    };

    setItems(prevItems => [...prevItems, itemToAdd]);

    toast({
      description: `${newItem.name} has been added to your menu`,
    });
  }, [items, toast]);

  const handleDeleteItem = useCallback(async (id: number) => {
    try {
      await menu.delete(currentRestaurantId, id.toString());
      setItems(prevItems => prevItems.filter(item => item.id !== id));
      toast({
        description: "Menu item has been deleted",
      });
    } catch (error) {
      console.error('Failed to delete menu item:', error);
      toast({
        description: 'Failed to delete menu item. Please try again later.',
      });
    }
  }, [menu, currentRestaurantId, toast]);

  const handleCategoryClick = useCallback((categoryId: string) => {
    setActiveCategory(categoryId);
  }, []);

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
                {categories.map(category => (
                  <button
                    key={category.id}
                    className={`flex items-center w-full px-4 py-2 text-left transition-colors ${activeCategory === category.id
                        ? 'bg-muted font-medium'
                        : 'hover:bg-muted/50'
                      }`}
                    onClick={() => handleCategoryClick(category.id)}
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
                            ₹{item.price.toFixed(2)}
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
                              onClick={() => navigate(`/dashboard/menu/edit/${item._id}`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteItem(item._id)}
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
