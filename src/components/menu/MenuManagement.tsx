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
import { useToast } from "@/components/ui/use-toast";
import {
  Utensils,
  Plus,
  Edit,
  Trash2,
  Search,
  Coffee,
  Soup,
  UtensilsCrossed,
  IceCream,
  Loader2
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import AiMenuGenerator from './AiMenuGenerator';
import { MenuItemSuggestion } from '@/services/aiService';
import { getMenuItems, addDocument, deleteDocument } from '@/services/firestoreService';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  available: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MenuManagementProps {
  restaurantId: string;
}

const MenuManagement: React.FC<MenuManagementProps> = ({ restaurantId }) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const { toast } = useToast();
  const navigate = useNavigate();

  const categories = [
    { id: 'all', name: 'All Items', icon: Utensils },
    { id: 'appetizers', name: 'Appetizers', icon: Soup },
    { id: 'main-courses', name: 'Main Courses', icon: UtensilsCrossed },
    { id: 'desserts', name: 'Desserts', icon: IceCream },
    { id: 'beverages', name: 'Beverages', icon: Coffee },
  ];

  useEffect(() => {
    fetchMenuItems();
  }, [restaurantId]);

  const fetchMenuItems = async () => {
    if (!restaurantId) return;

    setLoading(true);
    try {
      const menuRef = collection(db, 'restaurants', restaurantId, 'menu');
      const menuSnapshot = await getDocs(menuRef);
      
      const items = menuSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || '',
        description: doc.data().description || '',
        price: doc.data().price || 0,
        category: doc.data().category || '',
        image: doc.data().image,
        available: doc.data().available ?? true,
        createdAt: doc.data().createdAt || new Date().toISOString(),
        updatedAt: doc.data().updatedAt || new Date().toISOString()
      })) as MenuItem[];

      setMenuItems(items);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      toast({
        title: "Error",
        description: "Failed to load menu items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItemId || !restaurantId) return;

    try {
      const menuItemRef = doc(db, 'restaurants', restaurantId, 'menu', deleteItemId);
      await deleteDoc(menuItemRef);
      
      setMenuItems(prev => prev.filter(item => item.id !== deleteItemId));
      toast({
        title: "Success",
        description: "Menu item deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting menu item:', error);
      toast({
        title: "Error",
        description: "Failed to delete menu item",
        variant: "destructive",
      });
    } finally {
      setDeleteItemId(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
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
  }, [menuItems, activeCategory, searchQuery]);

  const handleAddItem = useCallback(async (newItem: MenuItemSuggestion) => {
    try {
      const itemToAdd = {
        name: newItem.name,
        description: newItem.description,
        price: newItem.price,
        category: newItem.category,
        image: '/placeholder.svg', // Default image
        restaurantId,
        available: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docId = await addDocument('menuItems', itemToAdd);
      const addedItem = { ...itemToAdd, id: docId };
      setMenuItems(prevItems => [...prevItems, addedItem]);

      toast({
        title: "Success",
        description: `${newItem.name} has been added to your menu`,
      });
    } catch (error) {
      console.error('Failed to add menu item:', error);
      toast({
        title: "Error",
        description: 'Failed to add menu item. Please try again later.',
        variant: "destructive",
      });
    }
  }, [restaurantId, toast]);

  const handleCategoryClick = useCallback((categoryId: string) => {
    setActiveCategory(categoryId);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-restaurant-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="page-title">Menu Management</h1>
        <Button onClick={() => navigate('/dashboard/menu/add')}>
          <Plus className="mr-2 h-4 w-4" /> Add Menu Item
        </Button>
      </div>

      {/* AI Menu Generator */}
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
                    className={`flex items-center w-full px-4 py-2 text-left transition-colors ${
                      activeCategory === category.id
                        ? 'bg-muted font-medium'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleCategoryClick(category.id)}
                  >
                    <category.icon className="h-4 w-4 mr-2 text-muted-foreground" />
                    {category.name}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {category.id === 'all'
                        ? menuItems.length
                        : menuItems.filter(item =>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No menu items found. Add your first item!
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{formatPrice(item.price)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            item.available 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {item.available ? 'Available' : 'Unavailable'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/dashboard/menu/edit/${item.id}`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteItemId(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={!!deleteItemId} onOpenChange={() => setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the menu item.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MenuManagement;
