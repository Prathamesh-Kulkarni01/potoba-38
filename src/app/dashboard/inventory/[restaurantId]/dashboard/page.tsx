
// src/app/dashboard/inventory/[restaurantId]/dashboard/page.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { getRestaurant } from '@/lib/firebase/firestore';
import {
  calculateTotalStockValue,
  countLowStockItems,
  getDailyStockTransactionSummary,
  getStockTransactions, // Import getStockTransactions
} from '@/lib/firebase/inventory';
import type { RestaurantProfile, DailyStockSummary, InventoryItemCategory, StockTransaction, StockTransactionType } from '@/types'; // Added StockTransaction, StockTransactionType
import { inventoryItemCategories } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Button } from '@/components/ui/button';
import { DollarSign, AlertTriangle, PackagePlus, PackageMinus, Trash2, List, Archive, Search, Filter as FilterIcon, ArrowLeft, CalendarIcon, ShoppingCart, FileText, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import InventoryKpiCard from '@/components/inventory/inventory-kpi-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay } from 'date-fns';
import type { DateRange } from "react-day-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function InventoryDashboardPage() {
  const params = useParams();
  const restaurantId = params.restaurantId as string;
  const { user, role, initialLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [isRefreshingKPIs, setIsRefreshingKPIs] = useState(false);
  const [kpiData, setKpiData] = useState<{
    totalStockValue: number;
    lowStockItems: number;
    dailySummary: DailyStockSummary;
  } | null>(null);

  // Filters state
  const [selectedCategory, setSelectedCategory] = useState<InventoryItemCategory | 'all'>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Stock In Transactions State
  const [stockInTransactionsData, setStockInTransactionsData] = useState<StockTransaction[]>([]);
  const [stockInLoading, setStockInLoading] = useState(false);


  const fetchRestaurantData = useCallback(async () => {
    if (!restaurantId || !user) return;
    const restaurantData = await getRestaurant(restaurantId);
    if (restaurantData && (restaurantData.ownerId === user.uid || (role === 'staff' && user.restaurantId === restaurantId))) {
      setRestaurant(restaurantData);
    } else {
      toast({ variant: "destructive", title: "Access Denied", description: "Restaurant not found or you don't have permission." });
      router.replace('/dashboard');
    }
  }, [restaurantId, user, role, router, toast]);

  const fetchKpiData = useCallback(async () => {
    if (!restaurantId) return;
    setIsRefreshingKPIs(true);
    try {
      const [value, lowStock, summary] = await Promise.all([
        calculateTotalStockValue(restaurantId),
        countLowStockItems(restaurantId),
        getDailyStockTransactionSummary(restaurantId),
      ]);
      setKpiData({ totalStockValue: value, lowStockItems: lowStock, dailySummary: summary });
    } catch (error) {
      console.error("Error fetching KPI data:", error);
      toast({ variant: "destructive", title: "KPI Error", description: "Could not load key performance indicators." });
    } finally {
      setIsRefreshingKPIs(false);
    }
  }, [restaurantId, toast]);

  const fetchStockInTransactions = useCallback(async () => {
    if (!restaurantId) return;
    setStockInLoading(true);
    try {
      const transactions = await getStockTransactions(restaurantId, {
        transactionTypes: ['purchase', 'initial_stock', 'adjustment_in', 'transfer_in'],
        startDate: dateRange?.from,
        endDate: dateRange?.to ? endOfDay(dateRange.to) : undefined,
      });
      setStockInTransactionsData(transactions);
    } catch (error) {
      console.error("Error fetching stock-in transactions:", error);
      toast({ variant: "destructive", title: "Transaction Error", description: "Could not load stock-in transactions." });
    } finally {
      setStockInLoading(false);
    }
  }, [restaurantId, dateRange, toast]);


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
      fetchRestaurantData();
      fetchKpiData();
    } else {
      router.replace('/dashboard');
    }
    setPageLoading(false); 
  }, [restaurantId, user, role, authLoading, router, fetchRestaurantData, fetchKpiData]);

  // Fetch stock-in transactions when dateRange or restaurantId changes
  useEffect(() => {
    if (restaurantId) {
      fetchStockInTransactions();
    }
  }, [restaurantId, dateRange, fetchStockInTransactions]);
  
  const filteredStockInTransactions = useMemo(() => {
    return stockInTransactionsData.filter(transaction =>
      transaction.inventoryItemName.toLowerCase().includes(searchTerm.toLowerCase())
      // Category filter would be more complex here as transactions don't directly store category.
      // We'd need to fetch all items, find their categories, then filter transactions.
      // For now, search by name is client-side on the fetched date-filtered transactions.
    );
  }, [stockInTransactionsData, searchTerm]);


  const handleClearFilters = () => {
    setSelectedCategory('all');
    setDateRange(undefined);
    setSearchTerm('');
    // Note: This will trigger re-fetch of stock-in transactions due to dateRange change
  };
  
  if (authLoading || pageLoading || (!restaurant && !pageLoading)) {
    return <div className="flex h-full items-center justify-center"><LoadingSpinner className="h-10 w-10 text-primary" /></div>;
  }
  if (!restaurant && !authLoading && !pageLoading) { // Ensure this shows only after initial loading attempts
    return <Card><CardHeader><CardTitle>Error</CardTitle></CardHeader><CardContent><p>Restaurant data not found or you don't have permission.</p></CardContent></Card>;
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
              <CardDescription>Overview of stock for {restaurant?.name || "your restaurant"}.</CardDescription>
            </div>
             <Button variant="outline" onClick={fetchKpiData} disabled={isRefreshingKPIs}>
                <RefreshCw className={cn("mr-2 h-4 w-4", isRefreshingKPIs && "animate-spin")} />
                Refresh KPIs
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <InventoryKpiCard title="Total Stock Value" value={kpiData ? `₹${kpiData.totalStockValue.toFixed(2)}` : "..."} icon={<DollarSign className="h-5 w-5 text-muted-foreground" />} isLoading={!kpiData || isRefreshingKPIs} />
            <InventoryKpiCard title="Low Stock Items" value={kpiData ? kpiData.lowStockItems : "..."} icon={<AlertTriangle className="h-5 w-5 text-destructive" />} isLoading={!kpiData || isRefreshingKPIs} description={kpiData && kpiData.lowStockItems > 0 ? "Items at or below reorder level" : "All items above reorder level"}/>
            <InventoryKpiCard title="Stock In Today (Qty)" value={kpiData ? kpiData.dailySummary.stockInQuantity : "..."} icon={<PackagePlus className="h-5 w-5 text-green-500" />} isLoading={!kpiData || isRefreshingKPIs} />
            <InventoryKpiCard title="Stock Out Today (Qty)" value={kpiData ? kpiData.dailySummary.stockOutQuantity : "..."} icon={<PackageMinus className="h-5 w-5 text-orange-500" />} isLoading={!kpiData || isRefreshingKPIs} description="From sales & adjustments" />
            <InventoryKpiCard title="Wastage Today (Qty)" value={kpiData ? kpiData.dailySummary.wastageQuantity : "..."} icon={<Trash2 className="h-5 w-5 text-red-500" />} isLoading={!kpiData || isRefreshingKPIs} />
          </div>

          {/* Filters Section */}
          <div className="mb-6 p-4 border rounded-lg bg-muted/30">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Outlet</label>
                <Select value={restaurantId} disabled>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select Outlet" /></SelectTrigger>
                  <SelectContent><SelectItem value={restaurantId}>{restaurant?.name || restaurantId}</SelectItem></SelectContent>
                </Select>
              </div>
               <div className="space-y-1">
                <label htmlFor="category-filter" className="text-xs font-medium text-muted-foreground">Category</label>
                <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as InventoryItemCategory | 'all')}>
                    <SelectTrigger id="category-filter" className="h-9 text-xs"><SelectValue placeholder="Filter by category..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {inventoryItemCategories.map(cat => (<SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>))}
                    </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Date Range</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal h-9 text-xs", !dateRange && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>) : (format(dateRange.from, "LLL dd, y"))) : (<span>Pick a date range</span>)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2}/></PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <label htmlFor="item-search" className="text-xs font-medium text-muted-foreground">Search Item Name</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input id="item-search" placeholder="Search items..." className="pl-8 h-9 text-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>
              <Button onClick={handleClearFilters} variant="ghost" size="sm" className="h-9 text-xs self-end col-span-full md:col-span-1 justify-self-start md:justify-self-auto">
                <FilterIcon className="mr-2 h-3.5 w-3.5" /> Clear All Filters
              </Button>
            </div>
          </div>

          <Tabs defaultValue="current_stock" className="w-full">
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-7 mb-4">
              <TabsTrigger value="current_stock">Current Stock</TabsTrigger>
              <TabsTrigger value="stock_in">Stock In</TabsTrigger>
              <TabsTrigger value="stock_out">Stock Out</TabsTrigger>
              <TabsTrigger value="wastage">Wastage</TabsTrigger>
              <TabsTrigger value="transfers" disabled>Transfers</TabsTrigger>
              <TabsTrigger value="expiry" disabled>Expiry</TabsTrigger>
              <TabsTrigger value="reports" disabled>Reports</TabsTrigger>
            </TabsList>
            <TabsContent value="current_stock">
              <Card>
                <CardHeader><CardTitle>Current Stock Levels</CardTitle><CardDescription>A snapshot of all items in your inventory.</CardDescription></CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground mb-4">View and manage your master list of inventory items.</p>
                  <Button asChild variant="default">
                    <Link href={`/dashboard/inventory/${restaurantId}`}>
                      <List className="mr-2 h-4 w-4" /> View Full Stock List
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="stock_in">
              <Card>
                <CardHeader><CardTitle>Stock In Transactions</CardTitle><CardDescription>History of all incoming stock (purchases, initial stock, adjustments in).</CardDescription></CardHeader>
                <CardContent>
                  {stockInLoading ? <div className="flex justify-center p-8"><LoadingSpinner /></div> :
                    filteredStockInTransactions.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Item Name</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead className="text-right">Cost/Unit</TableHead>
                            <TableHead className="text-right">Total Cost</TableHead>
                            <TableHead>Supplier</TableHead>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Batch #</TableHead>
                            <TableHead>Expiry</TableHead>
                            <TableHead>Payment</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredStockInTransactions.map(tx => (
                            <TableRow key={tx.id}>
                              <TableCell className="text-xs">{format(tx.transactionDate.toDate(), 'PPp')}</TableCell>
                              <TableCell className="font-medium">{tx.inventoryItemName}</TableCell>
                              <TableCell className="text-right">{tx.quantity}</TableCell>
                              <TableCell>{tx.unitOfMeasure}</TableCell>
                              <TableCell className="text-right">{tx.costPerUnitAtTransaction != null ? `₹${tx.costPerUnitAtTransaction.toFixed(2)}` : 'N/A'}</TableCell>
                              <TableCell className="text-right font-semibold">{tx.costPerUnitAtTransaction != null && tx.quantity ? `₹${(tx.quantity * tx.costPerUnitAtTransaction).toFixed(2)}` : 'N/A'}</TableCell>
                              <TableCell className="text-xs">{tx.supplierName || 'N/A'}</TableCell>
                              <TableCell className="text-xs">{tx.invoiceNumber || 'N/A'}</TableCell>
                              <TableCell className="text-xs">{tx.batchNumber || 'N/A'}</TableCell>
                              <TableCell className="text-xs">{tx.expiryDate ? format(tx.expiryDate.toDate(), 'PP') : 'N/A'}</TableCell>
                              <TableCell className="text-xs">{tx.paymentMode || 'N/A'}</TableCell>
                              <TableCell className="text-xs max-w-[150px] truncate" title={tx.notes || ''}>{tx.notes || 'N/A'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : <p className="text-center text-muted-foreground p-8">No stock-in transactions found for the selected criteria.</p>
                  }
                </CardContent>
              </Card>
            </TabsContent>
             {/* Placeholder for other tabs */}
            <TabsContent value="stock_out"><Card><CardHeader><CardTitle>Stock Out Transactions</CardTitle></CardHeader><CardContent className="text-center text-muted-foreground p-8">Stock out transaction history (sales, adjustments out) coming soon.</CardContent></Card></TabsContent>
            <TabsContent value="wastage"><Card><CardHeader><CardTitle>Wastage Log</CardTitle></CardHeader><CardContent className="text-center text-muted-foreground p-8">Wastage records coming soon.</CardContent></Card></TabsContent>
            <TabsContent value="transfers"><Card><CardHeader><CardTitle>Stock Transfers</CardTitle></CardHeader><CardContent className="text-center text-muted-foreground p-8">Stock transfer history coming soon.</CardContent></Card></TabsContent>
            <TabsContent value="expiry"><Card><CardHeader><CardTitle>Expiry Tracking</CardTitle></CardHeader><CardContent className="text-center text-muted-foreground p-8">Item expiry tracking coming soon.</CardContent></Card></TabsContent>
            <TabsContent value="reports"><Card><CardHeader><CardTitle>Inventory Reports</CardTitle></CardHeader><CardContent className="text-center text-muted-foreground p-8">Detailed inventory reports coming soon.</CardContent></Card></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

