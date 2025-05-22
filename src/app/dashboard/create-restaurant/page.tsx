
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { createRestaurant } from '@/lib/firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Store, PlusCircle } from 'lucide-react';
import type { OutletType } from '@/types';
import { outletTypes } from '@/types';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Restaurant name must be at least 2 characters.' }),
  outletType: z.string().min(1, {message: "Please select an outlet type."}) as z.ZodType<OutletType>,
});

export default function CreateRestaurantPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      outletType: 'restaurant',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || user.role !== 'owner' || !user.uid) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in as an owner to create a restaurant.' });
      return;
    }
    setLoading(true);
    try {
      const newRestaurant = await createRestaurant(user.uid, values.name, values.outletType);
      toast({ title: 'Restaurant Created!', description: `Successfully created ${newRestaurant.name}.` });
      localStorage.setItem(`selectedRestaurant_${user.uid}`, newRestaurant.id);
      router.push('/dashboard'); 
      router.refresh(); 
    } catch (error: any) {
      console.error('Create restaurant error:', error);
      toast({
        variant: 'destructive',
        title: 'Creation Failed',
        description: error.message || 'Could not create restaurant.',
      });
    } finally {
      setLoading(false);
    }
  }

  if (user?.role !== 'owner') {
    if (typeof window !== 'undefined') router.replace('/dashboard');
    return <LoadingSpinner className="m-auto h-10 w-10 text-primary" />;
  }

  return (
    <div className="flex justify-center items-start pt-8">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Store className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Create a New Restaurant</CardTitle>
          <CardDescription className="text-center">
            Add another restaurant to your Potoba account.
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
                      <Input placeholder="e.g., The Grand Bistro" {...field} />
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
                {loading ? <LoadingSpinner className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                Create Restaurant
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
