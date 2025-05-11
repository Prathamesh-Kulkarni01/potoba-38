'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { updateUserProfile, updateRestaurantProfile } from '@/lib/firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { CheckCircle, ShieldAlert, Star } from 'lucide-react'; // Icons for plan cards

// Mock plans
const plans = [
  { id: 'free', name: 'Free Trial', price: '₹0/mo', features: ['Basic Recipe Management', 'Limited Meal Planning', '1 Staff Account'], icon: ShieldAlert, cta: 'Start Free Trial' },
  { id: 'basic', name: 'Basic Plan', price: '₹29/mo', features: ['Full Recipe Management', 'Meal Planning Tools', 'Up to 5 Staff Accounts', 'Customer Support'], icon: CheckCircle, cta: 'Choose Basic' },
  { id: 'premium', name: 'Premium Plan', price: '₹79/mo', features: ['All Basic Features', 'Inventory Management', 'Advanced Analytics', 'Priority Support', 'Unlimited Staff'], icon: Star, cta: 'Go Premium' },
];

export default function SubscriptionPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  async function handleSelectPlan(planId: string) {
    if (!user || !user.uid || !user.restaurantId) {
      toast({ variant: 'destructive', title: 'Error', description: 'User or restaurant information is missing.' });
      return;
    }

    setLoadingPlanId(planId);
    try {
      // In a real app, integrate with Stripe or another payment provider here.
      // For now, just update the user/restaurant profile.
      await updateUserProfile(user.uid, { onboardingComplete: true });
      await updateRestaurantProfile(user.restaurantId, { 
        subscriptionPlan: planId,
        subscriptionStatus: planId === 'free' ? 'trialing' : 'active', // Example status
      });
      
      toast({ title: 'Subscription Chosen!', description: `You're all set with the ${plans.find(p => p.id === planId)?.name || 'plan'}. Welcome aboard!` });
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Subscription selection error:', error);
      toast({
        variant: 'destructive',
        title: 'Subscription Failed',
        description: error.message || 'Could not update subscription details.',
      });
    } finally {
      setLoadingPlanId(null);
    }
  }

  return (
    <div className="w-full space-y-8">
      <Card className="w-full shadow-xl">
        <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Star className="h-8 w-8" />
            </div>
          <CardTitle className="text-2xl font-bold">Choose Your Plan</CardTitle>
          <CardDescription>
            Select a subscription plan that best fits your restaurant&apos;s needs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {plans.map((plan) => (
            <Card key={plan.id} className={`overflow-hidden transition-shadow hover:shadow-lg ${plan.id === 'premium' ? 'border-primary border-2' : ''}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl flex items-center">
                    <plan.icon className={`mr-2 h-6 w-6 ${plan.id === 'premium' ? 'text-primary' : 'text-accent'}`} />
                    {plan.name}
                  </CardTitle>
                  <span className={`text-2xl font-bold ${plan.id === 'premium' ? 'text-primary' : 'text-foreground'}`}>{plan.price}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                  {plan.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => handleSelectPlan(plan.id)} 
                  className={`w-full ${plan.id === 'premium' ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'bg-accent hover:bg-accent/90 text-accent-foreground'}`}
                  disabled={loadingPlanId === plan.id}
                >
                  {loadingPlanId === plan.id ? <LoadingSpinner className="mr-2 h-4 w-4" /> : <plan.icon className="mr-2 h-4 w-4" />}
                  {plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </CardContent>
      </Card>
       <div className="text-center">
        <Button variant="link" onClick={() => router.push('/dashboard')} className="text-muted-foreground">
            Skip for now and go to dashboard (dev only)
        </Button>
       </div>
    </div>
  );
}
