// src/app/waiter/page.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Utensils, ListOrdered } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/context';

export default function WaiterDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl text-primary">
            <Utensils className="mr-3 h-7 w-7" />
            Waiter Station
          </CardTitle>
          <CardDescription>
            Welcome, {user?.displayName || user?.email?.split('@')[0] || 'Waiter'}! This is your dedicated space to manage tables and orders.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            Quickly access table statuses and take new orders.
          </p>
          {user?.restaurantId ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link href={`/dashboard/table-management/${user.restaurantId}`}>
                    <ListOrdered className="mr-2 h-5 w-5" />
                    View & Manage Tables
                </Link>
                </Button>
                 <Button asChild size="lg" variant="outline">
                    <Link href={`/dashboard/orders/${user.restaurantId}?context=waiter`}> {/* Example context, might not be needed */}
                        <Utensils className="mr-2 h-5 w-5" />
                        View Active Orders
                    </Link>
                </Button>
            </div>
          ) : (
            <p className="text-destructive">Restaurant assignment missing. Please contact your manager.</p>
          )}
          <div className="mt-8 p-6 border-2 border-dashed border-border rounded-xl bg-muted/20 text-center">
            <h3 className="text-xl font-semibold text-foreground">Quick Actions</h3>
            <p className="text-sm text-muted-foreground mt-2">
              (Future features: Direct links to tables needing attention, quick KOT view, etc.)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
