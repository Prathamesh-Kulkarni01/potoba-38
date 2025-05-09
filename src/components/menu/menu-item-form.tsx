
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MenuItem } from '@/types';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Sparkles } from 'lucide-react';
import { generateMenuItemDescription } from '@/ai/flows/generate-menu-item-description-flow';
import { useToast } from '@/hooks/use-toast';

const menuItemFormSchema = z.object({
  name: z.string().min(1, { message: 'Item name is required.' }),
  description: z.string().optional(),
  price: z.coerce.number().min(0, { message: 'Price must be a positive number.' }),
  imageUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  availability: z.boolean().default(true),
  order: z.coerce.number().min(0, { message: 'Order must be a positive number.' }),
  // Advanced fields
  dietaryTags: z.string().optional().transform(val => val ? val.split(',').map(s => s.trim()).filter(Boolean) : undefined),
  allergenInfo: z.string().optional().transform(val => val ? val.split(',').map(s => s.trim()).filter(Boolean) : undefined),
  calories: z.coerce.number().optional().nullable(), // Allow null for empty input after coercion
  crossSellItems: z.string().optional().transform(val => val ? val.split(',').map(s => s.trim()).filter(Boolean) : undefined),
  upsellItems: z.string().optional().transform(val => val ? val.split(',').map(s => s.trim()).filter(Boolean) : undefined),
});

export type MenuItemFormValues = z.infer<typeof menuItemFormSchema>;

interface MenuItemFormProps {
  restaurantId: string;
  categoryId: string;
  categoryName?: string; // For AI context
  subcategoryId?: string | null;
  subcategoryName?: string; // For AI context
  menuItem?: MenuItem | null;
  onSubmit: (values: MenuItemFormValues, itemId?: string) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}

export default function MenuItemForm({
  restaurantId,
  categoryId,
  categoryName,
  subcategoryId,
  subcategoryName,
  menuItem,
  onSubmit,
  onClose,
  isLoading,
}: MenuItemFormProps) {
  const { toast } = useToast();
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  const form = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues: {
      name: menuItem?.name || '',
      description: menuItem?.description || '',
      price: menuItem?.price || 0,
      imageUrl: menuItem?.imageUrl || '',
      availability: menuItem?.availability === undefined ? true : menuItem.availability,
      order: menuItem?.order || 0,
      dietaryTags: menuItem?.dietaryTags?.join(', ') || '',
      allergenInfo: menuItem?.allergenInfo?.join(', ') || '',
      calories: menuItem?.calories || null,
      crossSellItems: menuItem?.crossSellItems?.join(', ') || '',
      upsellItems: menuItem?.upsellItems?.join(', ') || '',
    },
  });

  const handleGenerateDescription = async () => {
    const itemName = form.getValues('name');
    if (!itemName) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter an item name first.' });
      return;
    }
    setIsGeneratingDescription(true);
    try {
      // const itemContextCategory = subcategoryName || categoryName || 'food item';
      const result = await generateMenuItemDescription({ itemName }); // Pass itemCategory if available and desired for prompt
      form.setValue('description', result.description);
      toast({ title: 'Success', description: 'AI-generated description populated.' });
    } catch (error) {
      console.error('AI description generation error:', error);
      toast({ variant: 'destructive', title: 'AI Error', description: 'Could not generate description.' });
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handleSubmit = async (values: MenuItemFormValues) => {
    // Ensure empty string for calories becomes undefined for Firestore if not filled
    const dataToSubmit = {
      ...values,
      calories: values.calories === null || values.calories === undefined || isNaN(values.calories) ? undefined : Number(values.calories),
    };
    await onSubmit(dataToSubmit, menuItem?.id);
  };

  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{menuItem ? 'Edit Menu Item' : 'Add New Menu Item'}</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>
            <div className="max-h-[60vh] overflow-y-auto pr-2 pt-4">
              <TabsContent value="general" className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Tomato Soup" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Description</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateDescription}
                      disabled={isGeneratingDescription || isLoading}
                    >
                      {isGeneratingDescription ? <LoadingSpinner className="mr-2 h-3 w-3" /> : <Sparkles className="mr-2 h-3 w-3" />}
                      Generate with AI
                    </Button>
                  </div>
                  <FormControl>
                    <Textarea placeholder="A brief description of the item" {...form.register('description')} />
                  </FormControl>
                  <FormMessage {...form.getFieldState('description')} />
                </FormItem>
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="e.g., 5.99" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/image.jpg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="availability"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm bg-card">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Available</FormLabel>
                        <FormDescription>
                          Is this item currently available for ordering?
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Order</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              <TabsContent value="advanced" className="space-y-4">
                <FormField
                  control={form.control}
                  name="dietaryTags"
                  render={({ field }) => ( // field already contains onChange, value, etc.
                    <FormItem>
                      <FormLabel>Dietary Tags (Optional)</FormLabel>
                      <FormControl>
                         <Input 
                          placeholder="e.g., vegan, gluten-free (comma-separated)"
                          {...field} // Spread field props here
                        />
                      </FormControl>
                       <FormDescription>Comma-separated list of dietary tags.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="allergenInfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Allergen Info (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., dairy, nuts (comma-separated)"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Comma-separated list of allergens.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="calories"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calories (Optional)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 350" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="crossSellItems"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cross-Sell Items (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Fries, Coke (comma-separated)" {...field} />
                      </FormControl>
                      <FormDescription>Suggest items that go well with this one.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="upsellItems"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Up-Sell Items (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Large Fries, Combo Meal (comma-separated)" {...field} />
                      </FormControl>
                      <FormDescription>Suggest more premium alternatives or additions.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </div>
          </Tabs>
          <DialogFooter className="sticky bottom-0 bg-background py-4 border-t mt-6">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading || isGeneratingDescription}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading || isGeneratingDescription} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {(isLoading || isGeneratingDescription) ? <LoadingSpinner className="mr-2 h-4 w-4" /> : (menuItem ? 'Save Changes' : 'Add Item')}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}

