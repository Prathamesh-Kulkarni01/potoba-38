import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

import { useAuth } from '@/contexts/AuthContext';
import useApi from '@/services/api';

const AddMenuItem = () => {
  const { id } = useParams<{ id: string }>();
  const [categories, setCategories] = useState([]);
  const { currentRestaurantId, token } = useAuth();
  const api = useApi();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image: '',
  });
  const [newCategory, setNewCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(''); // State to handle errors
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.category.get(currentRestaurantId);
        console.log({ response });
        if (Array.isArray(response)) {
          setCategories(response);
        } else {
          throw new Error('Invalid categories data');
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        setError('Failed to load categories. Please try again later.');
      }
    };

    const fetchMenuItem = async () => {
      if (id) {
        try {
          const response = await api.menu.getById(currentRestaurantId, id);
          if (response) {
            setFormData({
              name: response.name || '',
              description: response.description || '',
              price: response.price?.toString() || '',
              category: response.category || '',
              image: response.image || '',
            });
          } else {
            throw new Error('Menu item not found');
          }
        } catch (error) {
          console.error('Failed to fetch menu item:', error);
          setError('Failed to load menu item. Please try again later.');
        }
      }
    };

    fetchCategories();
    fetchMenuItem();
  }, [id, currentRestaurantId]); // Added `api` to dependency array

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value, // Ensure the state is updated with the new value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { name, description, price, category, image } = formData;
      if (!name || !description || !price || !category) {
        toast({ title: "Error", description: "All fields are required", variant: "destructive" });
        return;
      }

      if (id) {
        // Update existing menu item
        const updatedMenuItem = await api.menu.update(currentRestaurantId, id, {
          name,
          description,
          price: parseFloat(price),
          category,
          image,
        });
        if (updatedMenuItem) {
          toast({ title: "Success", description: "Menu item updated successfully" });
        } else {
          throw new Error('Failed to update menu item');
        }
      } else {
        // Create new menu item
        const newMenuItem = await api.menu.create(currentRestaurantId, {
          name,
          description,
          price: parseFloat(price),
          category,
          image,
        });
        if (newMenuItem) {
          toast({ title: "Success", description: "Menu item added successfully" });
        } else {
          throw new Error('Failed to add menu item');
        }
      }

      navigate('/dashboard/menu');
    } catch (error) {
      console.error(id ? "Failed to update menu item:" : "Failed to add menu item:", error);
      toast({ title: "Error", description: id ? "Failed to update menu item" : "Failed to add menu item", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCategory = async () => {
    try {
      if (!newCategory.trim()) {
        toast({ title: "Error", description: "Category name is required", variant: "destructive" });
        return;
      }

      const response = await api.category.create(currentRestaurantId, { name: newCategory });
      setCategories((prev) => [...prev, response]);
      setNewCategory('');
      toast({ title: "Success", description: "Category created successfully" });
    } catch (error) {
      console.error("Failed to create category:", error);
      toast({ title: "Error", description: "Failed to create category", variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>{id ? "Edit Menu Item" : "Add New Menu Item"}</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium">Name</label>
              <Input
                id="name"
                name="name"
                value={formData.name} // Bind to formData
                onChange={handleChange} // Update formData on change
                required
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium">Description</label>
              <Textarea
                id="description"
                name="description"
                value={formData.description} // Bind to formData
                onChange={handleChange} // Update formData on change
                required
              />
            </div>
            <div>
              <label htmlFor="price" className="block text-sm font-medium">Price</label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                value={formData.price} // Bind to formData
                onChange={handleChange} // Update formData on change
                required
              />
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium">Category</label>
              <Select
                value={formData.category} // Bind to formData
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, category: value })) // Update formData on change
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(categories) && categories.length > 0 ? (
                    categories.map((category) => (
                      <SelectItem key={category._id} value={category._id}>
                        {category.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-categories" disabled>No categories available</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="link" className="mt-2 text-sm text-restaurant-primary">Create New Category</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Category</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Category name"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                    />
                    <Button onClick={handleCreateCategory} className="w-full bg-restaurant-primary hover:bg-restaurant-primary/90">
                      Create
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div>
              <label htmlFor="image" className="block text-sm font-medium">Image URL (optional)</label>
              <Input
                id="image"
                name="image"
                value={formData.image} // Bind to formData
                onChange={handleChange} // Update formData on change
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-restaurant-primary hover:bg-restaurant-primary/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? (id ? "Updating..." : "Adding...") : (id ? "Update Menu Item" : "Add Menu Item")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddMenuItem;
