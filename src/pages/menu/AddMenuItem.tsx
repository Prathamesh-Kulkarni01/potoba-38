import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { doc, getDoc, setDoc, updateDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

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

const categories = [
  "Appetizers",
  "Main Course",
  "Desserts",
  "Beverages",
  "Specials"
];

const AddMenuItem: React.FC<{ restaurantId: string }> = ({ restaurantId }) => {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<MenuItem>>({
    name: '',
    description: '',
    price: 0,
    category: '',
    available: true,
    image: ''
  });

  React.useEffect(() => {
    if (itemId) {
      fetchMenuItem();
    }
  }, [itemId]);

  const fetchMenuItem = async () => {
    if (!itemId || !restaurantId) return;

    setLoading(true);
    try {
      const menuItemRef = doc(db, 'restaurants', restaurantId, 'menu', itemId);
      const menuItemDoc = await getDoc(menuItemRef);

      if (menuItemDoc.exists()) {
        setFormData(menuItemDoc.data() as MenuItem);
      } else {
        toast({
          title: "Error",
          description: "Menu item not found",
          variant: "destructive",
        });
        navigate('/dashboard/menu');
      }
    } catch (error) {
      console.error('Error fetching menu item:', error);
      toast({
        title: "Error",
        description: "Failed to load menu item",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) return;

    setLoading(true);
    try {
      const menuItemData = {
        ...formData,
        updatedAt: new Date().toISOString(),
        ...(itemId ? {} : { createdAt: new Date().toISOString() })
      };

      if (itemId) {
        // Update existing item
        const menuItemRef = doc(db, 'restaurants', restaurantId, 'menu', itemId);
        await updateDoc(menuItemRef, menuItemData);
        toast({
          title: "Success",
          description: "Menu item updated successfully",
        });
      } else {
        // Create new item
        const menuRef = collection(db, 'restaurants', restaurantId, 'menu');
        const newMenuItemRef = doc(menuRef);
        await setDoc(newMenuItemRef, menuItemData);
        toast({
          title: "Success",
          description: "Menu item created successfully",
        });
      }

      navigate('/dashboard/menu');
    } catch (error) {
      console.error('Error saving menu item:', error);
      toast({
        title: "Error",
        description: "Failed to save menu item",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' ? parseFloat(value) || 0 : value
    }));
  };

  if (loading && itemId) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-restaurant-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{itemId ? 'Edit Menu Item' : 'Add Menu Item'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">Image URL</Label>
              <Input
                id="image"
                name="image"
                value={formData.image}
                onChange={handleChange}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="available"
                checked={formData.available}
                onChange={(e) => setFormData(prev => ({ ...prev, available: e.target.checked }))}
                className="rounded border-gray-300 text-restaurant-primary focus:ring-restaurant-primary"
              />
              <Label htmlFor="available">Available</Label>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard/menu')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  itemId ? 'Update Item' : 'Add Item'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddMenuItem;
