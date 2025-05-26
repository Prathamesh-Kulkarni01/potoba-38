
// src/components/table-management/area-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { TableArea } from '@/types';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { useEffect } from 'react';

const areaFormSchema = z.object({
  name: z.string().min(1, { message: 'Area name is required.' }),
  order: z.coerce.number().min(0, { message: 'Display order must be non-negative.' }),
});

type AreaFormValues = z.infer<typeof areaFormSchema>;

interface AreaFormProps {
  area?: TableArea | null;
  onSubmit: (values: AreaFormValues, areaId?: string) => Promise<void>;
  isLoading: boolean;
  onDone: () => void; // Callback when form is submitted/cancelled to reset editingArea
}

export default function AreaForm({ area, onSubmit, isLoading, onDone }: AreaFormProps) {
  const form = useForm<AreaFormValues>({
    resolver: zodResolver(areaFormSchema),
    defaultValues: {
      name: area?.name || '',
      order: area?.order || 0,
    },
  });

  useEffect(() => {
    form.reset({
        name: area?.name || '',
        order: area?.order || 0,
    });
  }, [area, form]);

  const handleSubmit = async (values: AreaFormValues) => {
    await onSubmit(values, area?.id);
    form.reset({ name: '', order: 0 }); // Reset form after submission
    onDone();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3 border-t pt-4">
        <h4 className="text-md font-semibold mb-2">{area ? 'Edit Area' : 'Add New Area'}</h4>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Area Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Terrace, Main Hall" {...field} className="h-9"/>
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
              <FormLabel className="text-xs">Display Order</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 1" {...field} className="h-9"/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-2">
            {area && <Button type="button" variant="ghost" size="sm" onClick={() => {form.reset({name:'', order: 0}); onDone();}} disabled={isLoading}>Cancel Edit</Button>}
            <Button type="submit" disabled={isLoading} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {isLoading ? <LoadingSpinner className="mr-2 h-3 w-3" /> : (area ? 'Save Changes' : 'Add Area')}
            </Button>
        </div>
      </form>
    </Form>
  );
}
