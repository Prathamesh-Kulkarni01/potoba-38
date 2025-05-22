
// src/app/dashboard/inventory/[restaurantId]/stock-in/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { getRestaurant } from '@/lib/firebase/firestore';
import { getInventoryItems, recordPurchase } from '@/lib/firebase/inventory';
import type { RestaurantProfile, InventoryItem, UnitOfMeasure } from '@/types';
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
import { PackagePlus, ArrowLeft, CalendarIcon } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const stockInFormSchema = z.object({
  inventoryItemId: z.string().min(1, { message: 'Please select an item.' }),
  quantityReceived: z.coerce.number().positive({ message: 'Quantity must be positive.' }),
  costPerUnit: z.coerce.number().min(0, "Cost cannot be negative.").optional().nullable(),
  supplierName: z.string().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  batchNumber: z.string().optional().nullable(),
  expiryDate: z.date().optional().nullable(),
  paymentMode: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type StockInFormValues = z.infer<typeof stockInFormSchema>;

export default function StockInPage() {
  const params = useParams();
  const restaurantId = params.restaurantId as string;
  const { user, role, initialLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [totalValue, setTotalValue] = useState<number>(0);

  const form = useForm<StockInFormValues>({
    resolver: zodResolver(stockInFormSchema),
    defaultValues: {
      inventoryItemId: '',
      quantityReceived: 0,
      costPerUnit: null,
      supplierName: null,
      invoiceNumber: null,
      batchNumber: null,
      expiryDate: null,
      paymentMode: null,
      notes: '',
    },
  });

  const selectedItemId = form.watch('inventoryItemId');
  const quantityReceived = form.watch('quantityReceived');
  const costPerUnitForm = form.watch('costPerUnit');

  useEffect(() => {
    if (selectedItemId) {
      const item = inventoryItems.find(i => i.id === selectedItemId);
      setSelectedItem(item || null);
      if (item) {
        form.setValue('costPerUnit', item.costPerUnit === undefined || item.costPerUnit === null ? null : item.costPerUnit);
        form.setValue('supplierName', item.supplierInfo?.name || null);
      }
    } else {
      setSelectedItem(null);
      form.setValue('costPerUnit', null);
      form.setValue('supplierName', null);
    }
  }, [selectedItemId, inventoryItems, form]);

  useEffect(() => {
    const qty = parseFloat(String(quantityReceived));
    const cost = parseFloat(String(costPerUnitForm));
    if (!isNaN(qty) && !isNaN(cost) && qty > 0 && cost >= 0) {
      setTotalValue(qty * cost);
    } else {
      setTotalValue(0);
    }
  }, [quantityReceived, costPerUnitForm]);

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
      console.error("Error fetching data for stock in page:", error);
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

  const onSubmit = async (values: StockInFormValues) => {
    if (!selectedItem) {
      toast({ variant: "destructive", title: "Error", description: "Please select an item." });
      return;
    }
    setFormSubmitting(true);
    try {
      await recordPurchase(
        restaurantId,
        values.inventoryItemId,
        values.quantityReceived,
        values.costPerUnit,
        values.notes,
        values.supplierName,
        values.invoiceNumber,
        values.batchNumber,
        values.expiryDate,
        values.paymentMode
      );
      toast({ title: "Stock Received", description: `${values.quantityReceived} ${selectedItem.unitOfMeasure} of ${selectedItem.name} added to stock.` });
      form.reset({
        inventoryItemId: '', // Reset item selection as well
        quantityReceived: 0,
        costPerUnit: null,
        supplierName: null,
        invoiceNumber: null,
        batchNumber: null,
        expiryDate: null,
        paymentMode: null,
        notes: '',
      });
      setSelectedItem(null); 
      setTotalValue(0);
      // Optionally, call fetchData() again if you want the item list (e.g. current stock) to refresh immediately,
      // though the dashboard view will reflect changes.
    } catch (error: any) {
      toast({ variant: "destructive", title: "Stock In Failed", description: error.message || "Could not record stock received." });
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
            <PackagePlus className="mr-3 h-7 w-7 text-green-500" /> Record Stock In / Purchase
          </CardTitle>
          <CardDescription>Log new stock received for {restaurant.name}.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="inventoryItemId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inventory Item</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={inventoryItems.length === 0}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={inventoryItems.length === 0 ? "No inventory items found" : "Select item to receive..."} />
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

              {selectedItem && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="quantityReceived"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity Received ({selectedItem.unitOfMeasure})</FormLabel>
                          <FormControl>
                            <Input type="number" step="any" placeholder="e.g., 10" {...field} />
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
                          <FormLabel>Cost per Unit (₹)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder={`Current: ${selectedItem.costPerUnit || 'N/A'}`} {...field} value={field.value === null ? '' : String(field.value)} onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Total Purchase Value</Label>
                    <Input type="text" value={`₹${totalValue.toFixed(2)}`} readOnly disabled className="bg-muted/50 h-9" />
                  </div>
                  <FormField
                    control={form.control}
                    name="supplierName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier Name</FormLabel>
                        <FormControl>
                          <Input placeholder={selectedItem.supplierInfo?.name || "e.g., Local Farm Co."} {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="invoiceNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invoice Number</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., INV-00123" {...field} value={field.value || ''} />
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
                          <FormLabel>Batch Number</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., BATCH-XYZ789" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                   <FormField
                      control={form.control}
                      name="expiryDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Expiry Date</FormLabel>
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
                                  {field.value ? format(field.value, "PPP") : <span>Pick an expiry date</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value || undefined}
                                onSelect={(date) => field.onChange(date || null)}
                                // disabled={(date) => date < new Date("1900-01-01") } // Allow past dates for back-logging
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
                        <FormLabel>Payment Mode</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Cash, Card, UPI, Credit" {...field} value={field.value || ''} />
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
                        <FormLabel>Remarks/Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Any additional details about this stock receipt..." {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={formSubmitting || !selectedItem}>
                {formSubmitting ? <LoadingSpinner className="mr-2 h-4 w-4" /> : <PackagePlus className="mr-2 h-4 w-4" />}
                Record Stock In
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

