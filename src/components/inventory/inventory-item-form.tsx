
// src/components/inventory/inventory-item-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // For supplier notes
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InventoryItem, InventoryItemCategory, UnitOfMeasure, SupplierInfo } from '@/types';
import { inventoryItemCategories, unitsOfMeasure } from '@/types';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { ScrollArea } from '@/components/ui/scroll-area';

const supplierInfoSchema = z.object({
  name: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email({ message: "Invalid email format for supplier."}).optional().or(z.literal('')),
}).optional().nullable();

export const inventoryItemFormSchema = z.object({
  name: z.string().min(1, { message: 'Item name is required.' }),
  category: z.custom<InventoryItemCategory>((val) => inventoryItemCategories.map(c => c.value).includes(val as InventoryItemCategory), {
    message: "Please select a valid category.",
  }),
  unitOfMeasure: z.custom<UnitOfMeasure>((val) => unitsOfMeasure.map(u => u.value).includes(val as UnitOfMeasure), {
    message: "Please select a valid unit of measure.",
  }),
  currentStock: z.coerce.number().min(0, { message: 'Stock cannot be negative.' }),
  reorderLevel: z.coerce.number().min(0, "Reorder level cannot be negative.").optional().nullable(),
  costPerUnit: z.coerce.number().min(0, "Cost cannot be negative.").optional().nullable(),
  supplierInfo: supplierInfoSchema,
});

export type InventoryItemFormValues = z.infer<typeof inventoryItemFormSchema>;

interface InventoryItemFormProps {
  item?: InventoryItem | null;
  onSubmit: (values: InventoryItemFormValues, itemId?: string) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}

export default function InventoryItemForm({ item, onSubmit, onClose, isLoading }: InventoryItemFormProps) {
  const form = useForm<InventoryItemFormValues>({
    resolver: zodResolver(inventoryItemFormSchema),
    defaultValues: {
      name: item?.name || '',
      category: item?.category || 'raw_material',
      unitOfMeasure: item?.unitOfMeasure || 'pcs',
      currentStock: item?.currentStock || 0,
      reorderLevel: item?.reorderLevel === undefined || item?.reorderLevel === null ? null : item.reorderLevel,
      costPerUnit: item?.costPerUnit === undefined || item?.costPerUnit === null ? null : item.costPerUnit,
      supplierInfo: item?.supplierInfo || { name: '', contactPerson: '', phone: '', email: ''},
    },
  });

  const handleSubmit = async (values: InventoryItemFormValues) => {
    await onSubmit(values, item?.id);
  };

  return (
    <DialogContent className="sm:max-w-lg md:max-w-xl">
      <DialogHeader>
        <DialogTitle>{item ? 'Edit Inventory Item' : 'Add New Inventory Item'}</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-0">
            <ScrollArea className="h-[65vh] pr-3">
                <div className="space-y-4 p-1">
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Item Name</FormLabel> <FormControl><Input placeholder="e.g., All-Purpose Flour" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="category" render={({ field }) => ( <FormItem> <FormLabel>Category</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl> <SelectContent>{inventoryItemCategories.map(cat => (<SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>))}</SelectContent> </Select> <FormMessage /> </FormItem> )} />
                        <FormField control={form.control} name="unitOfMeasure" render={({ field }) => ( <FormItem> <FormLabel>Unit of Measure</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger></FormControl> <SelectContent>{unitsOfMeasure.map(unit => (<SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>))}</SelectContent> </Select> <FormMessage /> </FormItem> )} />
                    </div>
                    <FormField control={form.control} name="currentStock" render={({ field }) => ( <FormItem> <FormLabel>Current Stock</FormLabel> <FormControl><Input type="number" step="any" placeholder="e.g., 100" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    
                    <details className="group rounded-lg border p-3 bg-muted/30">
                        <summary className="font-medium cursor-pointer text-sm text-muted-foreground group-open:text-primary">Optional Details (Reorder, Cost, Supplier)</summary>
                        <div className="mt-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="reorderLevel" render={({ field }) => ( <FormItem> <FormLabel>Reorder Level (Optional)</FormLabel> <FormControl><Input type="number" step="any" placeholder="e.g., 20" {...field} value={field.value === null ? '' : field.value} onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField control={form.control} name="costPerUnit" render={({ field }) => ( <FormItem> <FormLabel>Cost per Unit (Optional)</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="e.g., 5.25" {...field} value={field.value === null ? '' : field.value} onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))} /></FormControl> <FormMessage /> </FormItem> )} />
                            </div>
                            <FormField control={form.control} name="supplierInfo.name" render={({ field }) => ( <FormItem> <FormLabel>Supplier Name (Optional)</FormLabel> <FormControl><Input placeholder="e.g., Local Farm Co." {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="supplierInfo.contactPerson" render={({ field }) => ( <FormItem> <FormLabel>Contact Person (Optional)</FormLabel> <FormControl><Input placeholder="e.g., John Doe" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField control={form.control} name="supplierInfo.phone" render={({ field }) => ( <FormItem> <FormLabel>Supplier Phone (Optional)</FormLabel> <FormControl><Input type="tel" placeholder="e.g., +1234567890" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            </div>
                             <FormField control={form.control} name="supplierInfo.email" render={({ field }) => ( <FormItem> <FormLabel>Supplier Email (Optional)</FormLabel> <FormControl><Input type="email" placeholder="supplier@example.com" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                        </div>
                    </details>
                </div>
          </ScrollArea>
          <DialogFooter className="pt-4 border-t">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {isLoading ? <LoadingSpinner className="mr-2 h-4 w-4" /> : (item ? 'Save Changes' : 'Add Item')}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
