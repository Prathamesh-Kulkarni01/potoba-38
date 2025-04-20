import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [categories, setCategories] = useState([]);
  const {currentRestaurantId,token}=useAuth()
  const api=useApi()
  
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
        console.log({response})
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

    fetchCategories();
  }, [currentRestaurantId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

      await api.menu.create(currentRestaurantId,{
        name,
        description,
        price: parseFloat(price),
        category,
        image,
      });

      toast({ title: "Success", description: "Menu item added successfully" });
      navigate('/dashboard/menu');
    } catch (error) {
      console.error("Failed to add menu item:", error);
      toast({ title: "Error", description: "Failed to add menu item", variant: "destructive" });
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

      const response = await api.category.create(currentRestaurantId,{ name: newCategory });
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
          <CardTitle>Add New Menu Item</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium">Name</label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium">Description</label>
              <Textarea id="description" name="description" value={formData.description} onChange={handleChange} required />
            </div>
            <div>
              <label htmlFor="price" className="block text-sm font-medium">Price</label>
              <Input id="price" name="price" type="number" step="0.01" value={formData.price} onChange={handleChange} required />
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium">Category</label>
              <Select value={formData.category} onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}>
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
              <Input id="image" name="image" value={formData.image} onChange={handleChange} />
            </div>
            <Button type="submit" className="w-full bg-restaurant-primary hover:bg-restaurant-primary/90" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Menu Item"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddMenuItem;
