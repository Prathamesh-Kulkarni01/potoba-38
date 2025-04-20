import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { api } from '@/services/api';

const AddMenuItem = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

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

      await api.menu.createMenuItem({
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

  return (
    <div className="container mx-auto py-6">
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Add New Menu Item</CardTitle>
        </CardHeader>
        <CardContent>
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
                  <SelectItem value="Appetizers">Appetizers</SelectItem>
                  <SelectItem value="Main Course">Main Course</SelectItem>
                  <SelectItem value="Desserts">Desserts</SelectItem>
                  <SelectItem value="Drinks">Drinks</SelectItem>
                </SelectContent>
              </Select>
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
