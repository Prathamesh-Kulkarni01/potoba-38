
// src/app/dashboard/inventory/[restaurantId]/stock-out/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { getRestaurant } from '@/lib/firebase/firestore';
import { getInventoryItems, recordStockOutflow } from '@/lib/firebase/inventory';
import type { RestaurantProfile, InventoryItem, UnitOfMeasure, StockTransactionType } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PackageMinus, ArrowLeft } from 'lucide-react';

const stockOutflowReasons: { value: StockTransactionType; label: string }[] = [
  { value: 'wastage', label: 'Wastage / Spoilage' },
  { value: 'adjustment_out', label: 'Stock Adjustment (Out)' },
  { value: 'internal_consumption', label: 'Internal Consumption' },
  // Add 'transfer_out' when transfers are implemented
];

const stockOutFormSchema = z.object({
  inventoryItemId: z.string().min(1, { message: 'Please select an item.' }),
  quantityOut: z.coerce.number().positive({ message: 'Quantity must be positive.' }),
  reason: z.custom<StockTransactionType>((val) => 
    stockOutflowReasons.map(r => r.value).includes(val as StockTransactionType),
    { message: "Please select a valid reason." }
  ),
  notes: z.string().optional().nullable(),
});

type StockOutFormValues = z.infer<typeof stockOutFormSchema>;

export default function StockOutPage() {
  const params = useParams();
  const restaurantId = params.restaurantId as string;
  const { user, role, initialLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedItemUnit, setSelectedItemUnit] = useState<UnitOfMeasure | ''>('');
  const [pageLoading, setPageLoading] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const form = useForm<StockOutFormValues>({
    resolver: zodResolver(stockOutFormSchema),
    defaultValues: {
      inventoryItemId: '',
      quantityOut: 0,
      reason: 'wastage',
      notes: '',
    },
  });

  const selectedItemId = form.watch('inventoryItemId');

  useEffect(() => {
    if (selectedItemId) {
      const item = inventoryItems.find(i => i.id === selectedItemId);
      setSelectedItemUnit(item?.unitOfMeasure || '');
    } else {
      setSelectedItemUnit('');
    }
  }, [selectedItemId, inventoryItems]);

  const fetchData = useCallback(async () => {
    if (!restaurantId || !user) return;
    setPageLoading(true);
    try {
      const [restaurantData, fetchedItems] = await Promise.all([
        getRestaurant(restaurantId),
        getInventoryItems(restaurantId)
      ]);

      if (restaurantData && (restaurantData.ownerId === user.uid || (role === 'staff' && user.restaurantId === restaurantId))) {
        setRestaurant(restaurantData);
        setInventoryItems(fetchedItems);
      } else {
        toast({ variant: "destructive", title: "Access Denied", description: "Restaurant not found or you don't have permission." });
        router.replace('/dashboard');
      }
    } catch (error) {
      console.error("Error fetching data for stock out page:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load necessary data." });
    } finally {
      setPageLoading(false);
    }
  }, [restaurantId, user, role, router, toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || (role !== 'owner' && role !== 'staff')) {
      router.replace('/dashboard');
      return;
    }
    if (role === 'staff' && user.restaurantId !== restaurantId) {
      router.replace('/dashboard');
      return;
    }
    if (restaurantId) {
      fetchData();
    } else {
      router.replace('/dashboard');
    }
  }, [restaurantId, user, role, authLoading, router, fetchData]);

  const onSubmit = async (values: StockOutFormValues) => {
    setFormSubmitting(true);
    try {
      const selectedItem = inventoryItems.find(i => i.id === values.inventoryItemId);
      if (!selectedItem) {
        toast({ variant: "destructive", title: "Error", description: "Selected item not found."});
        setFormSubmitting(false);
        return;
      }

      await recordStockOutflow(
        restaurantId,
        values.inventoryItemId,
        values.quantityOut,
        values.reason as 'wastage' | 'adjustment_out' | 'internal_consumption',
        values.notes,
        user?.uid 
      );
      toast({ title: "Stock Out Recorded", description: `${values.quantityOut} ${selectedItem.unitOfMeasure} of ${selectedItem.name} deducted.` });
      form.reset();
      setSelectedItemUnit('');
      // Re-fetch data to update inventory list / dashboard if it were on the same page
      // For now, just reset form. If user navigates back, data will be fresh.
      // If we want immediate update for a displayed list on *this* page, we'd call fetchData()
    } catch (error: any) {
      toast({ variant: "destructive", title: "Stock Out Failed", description: error.message || "Could not record stock outflow." });
    } finally {
      setFormSubmitting(false);
    }
  };

  if (authLoading || pageLoading) {
    return <div className="flex h-full items-center justify-center"><LoadingSpinner className="h-10 w-10 text-primary" /></div>;
  }
  if (!restaurant) {
    return <Card><CardHeader><CardTitle>Error</CardTitle></CardHeader><CardContent><p>Restaurant data could not be loaded.</p></CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-xl max-w-2xl mx-auto">
        <CardHeader>
            <div className="flex items-center justify-between">
                <Link href={`/dashboard/inventory/${restaurantId}/dashboard`} className="text-sm text-muted-foreground hover:text-primary flex items-center">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to Inventory Dashboard
                </Link>
            </div>
          <CardTitle className="text-2xl md:text-3xl flex items-center pt-4">
            <PackageMinus className="mr-3 h-7 w-7 text-destructive" /> Record Stock Outflow
          </CardTitle>
          <CardDescription>Manually deduct stock for wastage, internal use, or adjustments for {restaurant.name}.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="inventoryItemId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inventory Item</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={inventoryItems.length === 0}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={inventoryItems.length === 0 ? "No inventory items found" : "Select item..."} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {inventoryItems.map(item => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} (Current: {item.currentStock} {item.unitOfMeasure})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantityOut"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity Out {selectedItemUnit && `(${selectedItemUnit})`}</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" placeholder="e.g., 1.5" {...field} disabled={!selectedItemId}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Outflow</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedItemId}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {stockOutflowReasons.map(reason => (
                            <SelectItem key={reason.value} value={reason.value}>
                            {reason.label}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
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
                      <Textarea placeholder="e.g., Spoiled during delivery, Used for staff meal" {...field} value={field.value ?? ''} disabled={!selectedItemId}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={formSubmitting || !selectedItemId}>
                {formSubmitting ? <LoadingSpinner className="mr-2 h-4 w-4" /> : <PackageMinus className="mr-2 h-4 w-4" />}
                Record Stock Out
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
