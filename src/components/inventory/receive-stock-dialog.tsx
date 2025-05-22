
// src/components/inventory/receive-stock-dialog.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import type { InventoryItem } from '@/types';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const receiveStockFormSchema = z.object({
  quantityReceived: z.coerce.number().positive({ message: 'Quantity must be positive.' }),
  costPerUnit: z.coerce.number().min(0, "Cost cannot be negative.").optional().nullable(),
  supplierName: z.string().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  batchNumber: z.string().optional().nullable(),
  expiryDate: z.date().optional().nullable(),
  paymentMode: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type ReceiveStockFormValues = z.infer<typeof receiveStockFormSchema>;

interface ReceiveStockDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem;
  onSubmit: (values: ReceiveStockFormValues) => Promise<void>;
  isLoading: boolean;
}

export default function ReceiveStockDialog({ isOpen, onClose, item, onSubmit, isLoading }: ReceiveStockDialogProps) {
  const form = useForm<ReceiveStockFormValues>({
    resolver: zodResolver(receiveStockFormSchema),
    defaultValues: {
      quantityReceived: 0,
      costPerUnit: item.costPerUnit === undefined || item.costPerUnit === null ? null : item.costPerUnit,
      supplierName: item.supplierInfo?.name || null,
      invoiceNumber: null,
      batchNumber: null,
      expiryDate: null,
      paymentMode: null,
      notes: '',
    },
  });

  const handleSubmit = async (values: ReceiveStockFormValues) => {
    await onSubmit(values);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Receive Stock: {item.name}</DialogTitle>
          <DialogDescription>
            Current Stock: {item.currentStock} {item.unitOfMeasure}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3 py-2 max-h-[70vh] overflow-y-auto pr-2">
            <FormField
              control={form.control}
              name="quantityReceived"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity Received ({item.unitOfMeasure})</FormLabel>
                  <FormControl>
                    <Input type="number" step="any" placeholder="e.g., 50" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="costPerUnit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost per Unit (Optional)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder={`e.g., ${item.costPerUnit || '2.50'}`} {...field} value={field.value === null ? '' : field.value as number} onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="supplierName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder={item.supplierInfo?.name || "e.g., Main Distributor"} {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="invoiceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice Number (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., INV-2023-001" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="batchNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Batch Number (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., BN12345" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="expiryDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Expiry Date (Optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={(date) => field.onChange(date || null)}
                        disabled={(date) =>
                          date < new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Mode (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Cash, Card, UPI" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Early morning delivery" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4 sticky bottom-0 bg-dialog pb-1">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {isLoading ? <LoadingSpinner className="mr-2 h-4 w-4" /> : 'Add to Stock'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    
