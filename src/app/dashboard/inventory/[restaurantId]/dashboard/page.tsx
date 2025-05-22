
// src/app/dashboard/inventory/[restaurantId]/dashboard/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { getRestaurant } from '@/lib/firebase/firestore';
import {
  calculateTotalStockValue,
  countLowStockItems,
  getDailyStockTransactionSummary,
} from '@/lib/firebase/inventory';
import type { RestaurantProfile, DailyStockSummary } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Button } from '@/components/ui/button';
import { DollarSign, AlertTriangle, PackagePlus, PackageMinus, Trash2, List, Archive } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import InventoryKpiCard from '@/components/inventory/inventory-kpi-card';

export default function InventoryDashboardPage() {
  const params = useParams();
  const restaurantId = params.restaurantId as string;
  const { user, role, initialLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [kpiData, setKpiData] = useState<{
    totalStockValue: number;
    lowStockItems: number;
    dailySummary: DailyStockSummary;
  } | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!restaurantId || !user) return;
    setPageLoading(true);
    try {
      const restaurantData = await getRestaurant(restaurantId);
      if (restaurantData && (restaurantData.ownerId === user.uid || role === 'staff')) {
        setRestaurant(restaurantData);
        const [value, lowStock, summary] = await Promise.all([
          calculateTotalStockValue(restaurantId),
          countLowStockItems(restaurantId),
          getDailyStockTransactionSummary(restaurantId),
        ]);
        setKpiData({ totalStockValue: value, lowStockItems: lowStock, dailySummary: summary });
      } else {
        toast({ variant: "destructive", title: "Access Denied", description: "Restaurant not found or you don't have permission." });
        router.replace('/dashboard');
      }
    } catch (error) {
      console.error("Error fetching inventory dashboard data:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load inventory dashboard." });
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
      fetchDashboardData();
    } else {
      router.replace('/dashboard');
    }
  }, [restaurantId, user, role, authLoading, router, fetchDashboardData]);
  
  if (authLoading || pageLoading || !restaurant) {
    return <div className="flex h-full items-center justify-center"><LoadingSpinner className="h-10 w-10 text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl md:text-3xl flex items-center">
                <Archive className="mr-3 h-7 w-7 text-primary" /> Inventory Dashboard
              </CardTitle>
              <CardDescription>Overview of stock for {restaurant.name}.</CardDescription>
            </div>
            <Button asChild variant="outline">
              <Link href={`/dashboard/inventory/${restaurantId}`}>
                <List className="mr-2 h-4 w-4" /> View Full Stock List
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <InventoryKpiCard
              title="Total Stock Value"
              value={kpiData ? `₹${kpiData.totalStockValue.toFixed(2)}` : "Loading..."}
              icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
              isLoading={!kpiData}
            />
            <InventoryKpiCard
              title="Low Stock Items"
              value={kpiData ? kpiData.lowStockItems : "Loading..."}
              icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
              isLoading={!kpiData}
              description={kpiData && kpiData.lowStockItems > 0 ? "Items at or below reorder level" : "All items are above reorder level"}
            />
            <InventoryKpiCard
              title="Stock In Today (Qty)"
              value={kpiData ? kpiData.dailySummary.stockInQuantity : "Loading..."}
              icon={<PackagePlus className="h-5 w-5 text-green-500" />}
              isLoading={!kpiData}
            />
            <InventoryKpiCard
              title="Stock Out Today (Qty)"
              value={kpiData ? kpiData.dailySummary.stockOutQuantity : "Loading..."}
              icon={<PackageMinus className="h-5 w-5 text-orange-500" />}
              isLoading={!kpiData}
              description="From sales & adjustments"
            />
            <InventoryKpiCard
              title="Wastage Today (Qty)"
              value={kpiData ? kpiData.dailySummary.wastageQuantity : "Loading..."}
              icon={<Trash2 className="h-5 w-5 text-red-500" />}
              isLoading={!kpiData}
            />
          </div>
          <div className="mt-8">
            {/* Placeholder for charts or recent activity feed */}
            <Card>
              <CardHeader><CardTitle>Recent Activity & Charts (Coming Soon)</CardTitle></CardHeader>
              <CardContent className="text-center text-muted-foreground p-8">
                More detailed inventory analytics will be displayed here.
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
