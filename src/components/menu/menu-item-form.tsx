
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import type { MenuItem } from '@/types';
import LoadingSpinner from '@/components/shared/loading-spinner';

const menuItemFormSchema = z.object({
  name: z.string().min(1, { message: 'Item name is required.' }),
  description: z.string().optional(),
  price: z.coerce.number().min(0, { message: 'Price must be a positive number.' }),
  imageUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  availability: z.boolean().default(true),
  dietaryTags: z.string().optional().transform(val => val ? val.split(',').map(s => s.trim()).filter(Boolean) : []),
  allergenInfo: z.string().optional().transform(val => val ? val.split(',').map(s => s.trim()).filter(Boolean) : []),
  order: z.coerce.number().min(0, { message: 'Order must be a positive number.' }),
});

export type MenuItemFormValues = z.infer<typeof menuItemFormSchema>;

interface MenuItemFormProps {
  restaurantId: string;
  categoryId: string;
  subcategoryId?: string | null;
  menuItem?: MenuItem | null;
  onSubmit: (values: MenuItemFormValues, itemId?: string) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}

export default function MenuItemForm({ restaurantId, categoryId, subcategoryId, menuItem, onSubmit, onClose, isLoading }: MenuItemFormProps) {
  const form = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues: {
      name: menuItem?.name || '',
      description: menuItem?.description || '',
      price: menuItem?.price || 0,
      imageUrl: menuItem?.imageUrl || '',
      availability: menuItem?.availability === undefined ? true : menuItem.availability,
      dietaryTags: menuItem?.dietaryTags || [],
      allergenInfo: menuItem?.allergenInfo || [],
      order: menuItem?.order || 0,
    },
  });

  const handleSubmit = async (values: MenuItemFormValues) => {
    await onSubmit(values, menuItem?.id);
  };

  return (
    <DialogContent className="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>{menuItem ? 'Edit Menu Item' : 'Add New Menu Item'}</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
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
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="A brief description of the item" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
              <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
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
            name="dietaryTags"
            render={({ field : { onChange, value, ...rest } }) => (
              <FormItem>
                <FormLabel>Dietary Tags (Optional)</FormLabel>
                <FormControl>
                   <Input 
                    placeholder="e.g., vegan, gluten-free (comma-separated)" 
                    value={Array.isArray(value) ? value.join(', ') : ''}
                    onChange={(e) => onChange(e.target.value.split(',').map(s => s.trim()))}
                    {...rest}
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
            render={({ field: { onChange, value, ...rest } }) => (
              <FormItem>
                <FormLabel>Allergen Info (Optional)</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., dairy, nuts (comma-separated)" 
                    value={Array.isArray(value) ? value.join(', ') : ''}
                    onChange={(e) => onChange(e.target.value.split(',').map(s => s.trim()))}
                    {...rest}
                  />
                </FormControl>
                <FormDescription>Comma-separated list of allergens.</FormDescription>
                <FormMessage />
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
          <DialogFooter className="sticky bottom-0 bg-background py-4 border-t">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {isLoading ? <LoadingSpinner className="mr-2 h-4 w-4" /> : (menuItem ? 'Save Changes' : 'Add Item')}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
