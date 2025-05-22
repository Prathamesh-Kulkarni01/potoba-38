
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { getRestaurant, updateRestaurantProfile, updateUserProfile } from '@/lib/firebase/firestore';
import type { RestaurantProfile, OutletType } from '@/types';
import { outletTypes } from '@/types'; // Import outletTypes
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; 
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Store, Utensils } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Restaurant name must be at least 2 characters.' }),
  outletType: z.string().min(1, {message: "Please select an outlet type."}) as z.ZodType<OutletType>, // Use OutletType
});

export default function RestaurantSetupPage() {
  const { user, initialLoading: authInitialLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true); 
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      outletType: 'restaurant', // Default to 'restaurant'
    },
  });

  useEffect(() => {
    if (!authInitialLoading && user && user.restaurantId) {
      const fetchRestaurantData = async () => {
        setPageLoading(true);
        const restaurant = await getRestaurant(user.restaurantId!);
        if (restaurant) {
          form.reset({
            name: restaurant.name,
            outletType: restaurant.outletType || 'restaurant',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not load your restaurant data. Please try again.',
          });
        }
        setPageLoading(false);
      };
      fetchRestaurantData();
    } else if (!authInitialLoading && (!user || !user.restaurantId)) {
        setPageLoading(false); 
    }
  }, [user, authInitialLoading, form, toast]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !user.restaurantId) {
      toast({ variant: 'destructive', title: 'Error', description: 'User or restaurant not found.' });
      return;
    }
    setLoading(true);
    try {
      await updateRestaurantProfile(user.restaurantId, {
        name: values.name,
        outletType: values.outletType,
      });
      toast({ title: 'Restaurant Details Saved', description: 'Next, choose your subscription plan.' });
      router.push('/onboarding/subscription');
    } catch (error: any) {
      console.error('Restaurant setup error:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'Could not save restaurant details.',
      });
    } finally {
      setLoading(false);
    }
  }
  
  if (authInitialLoading || pageLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <LoadingSpinner className="h-10 w-10 text-primary" />
      </div>
    );
  }

  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Store className="h-8 w-8" />
        </div>
        <CardTitle className="text-2xl font-bold text-center">Set Up Your Restaurant</CardTitle>
        <CardDescription className="text-center">
          Confirm or update your restaurant&apos;s basic information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Restaurant Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., The Cozy Corner" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="outletType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type of Outlet</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select the type of your outlet" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {outletTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={loading}>
              {loading ? <LoadingSpinner className="mr-2 h-4 w-4" /> : <Utensils className="mr-2 h-4 w-4" />}
              Save and Continue to Subscription
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
