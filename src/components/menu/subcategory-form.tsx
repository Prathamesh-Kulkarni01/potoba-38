
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import type { MenuSubcategory } from '@/types';
import LoadingSpinner from '@/components/shared/loading-spinner';

const subcategoryFormSchema = z.object({
  name: z.string().min(1, { message: 'Subcategory name is required.' }),
  order: z.coerce.number().min(0, { message: 'Order must be a positive number.' }),
});

type SubcategoryFormValues = z.infer<typeof subcategoryFormSchema>;

interface SubcategoryFormProps {
  restaurantId: string;
  categoryId: string;
  subcategory?: MenuSubcategory | null;
  onSubmit: (values: SubcategoryFormValues, subcategoryId?: string) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}

export default function SubcategoryForm({ restaurantId, categoryId, subcategory, onSubmit, onClose, isLoading }: SubcategoryFormProps) {
  const form = useForm<SubcategoryFormValues>({
    resolver: zodResolver(subcategoryFormSchema),
    defaultValues: {
      name: subcategory?.name || '',
      order: subcategory?.order || 0,
    },
  });

  const handleSubmit = async (values: SubcategoryFormValues) => {
    await onSubmit(values, subcategory?.id);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{subcategory ? 'Edit Subcategory' : 'Add New Subcategory'}</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subcategory Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Soups" {...field} />
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
              {isLoading ? <LoadingSpinner className="mr-2 h-4 w-4" /> : (subcategory ? 'Save Changes' : 'Add Subcategory')}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
