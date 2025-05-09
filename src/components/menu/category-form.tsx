
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import type { MenuCategory } from '@/types';
import LoadingSpinner from '@/components/shared/loading-spinner';

const categoryFormSchema = z.object({
  name: z.string().min(1, { message: 'Category name is required.' }),
  order: z.coerce.number().min(0, { message: 'Order must be a positive number.' }),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

interface CategoryFormProps {
  restaurantId: string;
  category?: MenuCategory | null;
  onSubmit: (values: CategoryFormValues, categoryId?: string) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}

export default function CategoryForm({ restaurantId, category, onSubmit, onClose, isLoading }: CategoryFormProps) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: category?.name || '',
      order: category?.order || 0,
    },
  });

  const handleSubmit = async (values: CategoryFormValues) => {
    await onSubmit(values, category?.id);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{category ? 'Edit Category' : 'Add New Category'}</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Appetizers" {...field} />
                </FormControl>
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
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {isLoading ? <LoadingSpinner className="mr-2 h-4 w-4" /> : (category ? 'Save Changes' : 'Add Category')}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
