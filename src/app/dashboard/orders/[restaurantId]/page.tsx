
// src/app/dashboard/orders/[restaurantId]/page.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth/context';
import { getRestaurant } from '@/lib/firebase/firestore';
import { getOrdersByRestaurant, updateOrderStatus } from '@/lib/firebase/orders';
import type { RestaurantProfile, OrderStatus as OrderStatusType, OrderItem, ClientOrder } from '@/types'; // Import ClientOrder
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Eye, MoreHorizontal, Clock, Utensils, CheckCircle, XCircle, Send, CalendarIcon, Filter, ArrowUpDown } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
// Timestamp import removed as we'll use ISO strings client-side
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import { cn } from '@/lib/utils';

const orderStatusConfig: Record<OrderStatusType, { label: string; color: string; icon?: React.ElementType, shortLabel?: string }> = {
  pending_customer_confirmation: { label: 'Pending Customer Confirmation', shortLabel: 'Pending Cust.', color: 'bg-gray-500 text-gray-50', icon: Clock },
  pending_kitchen: { label: 'Pending Kitchen Acceptance', shortLabel: 'Pending Kitchen', color: 'bg-yellow-500 text-yellow-50', icon: Clock },
  confirmed_by_kitchen: { label: 'Kitchen Confirmed', shortLabel: 'Kitchen Confirmed', color: 'bg-orange-500 text-orange-50', icon: Utensils },
  preparing: { label: 'Preparing', shortLabel: 'Preparing', color: 'bg-blue-500 text-blue-50', icon: Utensils },
  ready_for_pickup: { label: 'Ready for Pickup', shortLabel: 'Ready Pickup', color: 'bg-purple-500 text-purple-50', icon: ShoppingCart },
  served: { label: 'Served', shortLabel: 'Served', color: 'bg-teal-500 text-teal-50', icon: CheckCircle },
  payment_pending: { label: 'Payment Pending', shortLabel: 'Payment Pend.', color: 'bg-indigo-500 text-indigo-50', icon: DollarSignIcon },
  completed: { label: 'Completed', shortLabel: 'Completed', color: 'bg-green-500 text-green-50', icon: CheckCircle },
  cancelled_by_customer: { label: 'Cancelled by Customer', shortLabel: 'Cancelled (Cust)', color: 'bg-red-600 text-red-50', icon: XCircle },
  cancelled_by_restaurant: { label: 'Cancelled by Restaurant', shortLabel: 'Cancelled (Rest)', color: 'bg-red-700 text-red-50', icon: XCircle },
};

const possibleNextStatuses: Record<OrderStatusType, OrderStatusType[]> = {
  pending_customer_confirmation: ['pending_kitchen', 'cancelled_by_restaurant', 'cancelled_by_customer'],
  pending_kitchen: ['confirmed_by_kitchen', 'cancelled_by_restaurant'],
  confirmed_by_kitchen: ['preparing', 'cancelled_by_restaurant'],
  preparing: ['ready_for_pickup', 'served', 'cancelled_by_restaurant'],
  ready_for_pickup: ['served', 'completed', 'cancelled_by_restaurant'],
  served: ['payment_pending', 'completed'],
  payment_pending: ['completed', 'cancelled_by_restaurant'],
  completed: [],
  cancelled_by_customer: [],
  cancelled_by_restaurant: [],
};

// ClientOrder interface definition removed, will be imported from @/types

function DollarSignIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" > <line x1="12" x2="12" y1="2" y2="22" /> <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /> </svg>
  );
}

type MainTabValue = 'active' | 'all' | 'pending_kitchen' | 'cancelled';

const MAIN_TABS: { value: MainTabValue; label: string; statuses?: OrderStatusType[] }[] = [
  { value: 'all', label: 'All Orders' },
  { value: 'active', label: 'Active', statuses: ['pending_customer_confirmation', 'pending_kitchen', 'confirmed_by_kitchen', 'preparing', 'ready_for_pickup', 'served', 'payment_pending'] },
  { value: 'pending_kitchen', label: 'Pending Kitchen', statuses: ['pending_kitchen', 'confirmed_by_kitchen'] },
  { value: 'cancelled', label: 'Cancelled', statuses: ['cancelled_by_customer', 'cancelled_by_restaurant'] },
];

const DETAILED_STATUS_OPTIONS = (Object.keys(orderStatusConfig) as OrderStatusType[]).map(status => ({
    value: status,
    label: orderStatusConfig[status].label,
}));

const ALL_STATUSES_VALUE = "_all_"; 

export default function OrderManagementPage() {
  const params = useParams();
  const restaurantId = params.restaurantId as string;
  const searchParamsHook = useSearchParams(); 

  const { user, role, initialLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [allFetchedOrders, setAllFetchedOrders] = useState<ClientOrder[]>([]);
  const [displayedOrders, setDisplayedOrders] = useState<ClientOrder[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const [activeMainTab, setActiveMainTab] = useState<MainTabValue>('active');
  const [detailedStatusFilter, setDetailedStatusFilter] = useState<OrderStatusType | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [sortConfig, setSortConfig] = useState<{ key: keyof ClientOrder | null; direction: 'ascending' | 'descending' }>({ key: 'createdAt', direction: 'descending' });

  const tableIdFilter = useMemo(() => searchParamsHook.get('tableId'), [searchParamsHook]);


  const fetchRestaurantAndOrders = useCallback(async () => {
    if (!restaurantId || !user) return;
    setPageLoading(true);
    try {
      const restaurantData = await getRestaurant(restaurantId);
      if (restaurantData && (restaurantData.ownerId === user.uid || (role === 'staff' && user.restaurantId === restaurantId))) {
        setRestaurant(restaurantData);
        
        let queryStatuses: OrderStatusType[] | undefined = undefined;
        if (detailedStatusFilter) {
          queryStatuses = [detailedStatusFilter];
        } else if (activeMainTab !== 'all') {
          queryStatuses = MAIN_TABS.find(tab => tab.value === activeMainTab)?.statuses;
        }
        
        let startDateISOString: string | undefined = undefined;
        let endDateISOString: string | undefined = undefined;

        if (dateRange?.from) {
          startDateISOString = dateRange.from.toISOString();
        }
        if (dateRange?.to) {
            const toDate = new Date(dateRange.to);
            toDate.setHours(23, 59, 59, 999); 
            endDateISOString = toDate.toISOString();
        }

        const fetchedOrdersRaw = await getOrdersByRestaurant(
          restaurantId, 
          queryStatuses, 
          startDateISOString, 
          endDateISOString, 
          tableIdFilter || undefined
        );
        
        // fetchedOrdersRaw is now ClientOrder[], so direct assignment is fine
        setAllFetchedOrders(fetchedOrdersRaw);
      } else {
        toast({ variant: "destructive", title: "Access Denied", description: "Restaurant not found or you don't have permission." });
        router.replace('/dashboard');
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load order data." });
    } finally {
      setPageLoading(false);
    }
  }, [restaurantId, user, role, router, toast, activeMainTab, detailedStatusFilter, dateRange, tableIdFilter]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || (role !== 'owner' && role !== 'staff')) {
      router.replace('/dashboard'); return;
    }
    if (role === 'staff' && user.restaurantId !== restaurantId) {
      router.replace('/dashboard'); return;
    }
    if (restaurantId) fetchRestaurantAndOrders();
    else router.replace('/dashboard');
  }, [restaurantId, user, role, authLoading, router, fetchRestaurantAndOrders]);

  useEffect(() => {
    let filtered = [...allFetchedOrders];

    const minPrice = parseFloat(priceRange.min);
    const maxPrice = parseFloat(priceRange.max);
    if (!isNaN(minPrice)) filtered = filtered.filter(order => order.totalAmount >= minPrice);
    if (!isNaN(maxPrice)) filtered = filtered.filter(order => order.totalAmount <= maxPrice);

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const valA = a[sortConfig.key!];
        const valB = b[sortConfig.key!];
        let comparison = 0;
        if (typeof valA === 'string' && typeof valB === 'string') {
           if ((sortConfig.key === 'createdAt' || sortConfig.key === 'updatedAt')) {
            comparison = new Date(valA).getTime() - new Date(valB).getTime();
           } else {
            comparison = valA.localeCompare(valB);
           }
        } else if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        }
        // Add more type checks if other sortable fields exist
        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }
    setDisplayedOrders(filtered);
  }, [allFetchedOrders, priceRange, sortConfig]);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatusType) => {
    setUpdatingOrderId(orderId);
    try {
      await updateOrderStatus(restaurantId, orderId, newStatus);
      toast({ title: "Order Status Updated", description: `Order marked as ${orderStatusConfig[newStatus].label}.` });
      fetchRestaurantAndOrders(); 
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message || "Could not update order status." });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleSort = (key: keyof ClientOrder) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending',
    }));
  };
  
  const getItemsSummary = (items: OrderItem[]) => {
    if (!items || items.length === 0) return "No items";
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    return `${totalQuantity} item${totalQuantity > 1 ? 's' : ''}`;
  };

  if (authLoading || (pageLoading && !restaurant)) {
    return <div className="flex h-full items-center justify-center"><LoadingSpinner className="h-10 w-10 text-primary" /></div>;
  }
  if (!restaurant) {
    return <Card><CardHeader><CardTitle>Error</CardTitle></CardHeader><CardContent><p>Restaurant data could not be loaded.</p></CardContent></Card>;
  }
  
  const SortableTableHead = ({ columnKey, children }: { columnKey: keyof ClientOrder, children: React.ReactNode }) => (
    <TableHead onClick={() => handleSort(columnKey)} className="cursor-pointer hover:bg-muted/50">
      <div className="flex items-center gap-2">
        {children}
        {sortConfig.key === columnKey && <ArrowUpDown className={`h-3 w-3 ${sortConfig.direction === 'descending' ? 'rotate-180' : ''}`} />}
      </div>
    </TableHead>
  );


  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-4 md:mb-0">
              <CardTitle className="text-2xl md:text-3xl flex items-center"> <ShoppingCart className="mr-3 h-7 w-7 text-primary" /> Order Management </CardTitle>
              <CardDescription> View and manage orders for {restaurant.name}. {tableIdFilter ? `(Filtered for Table ${allFetchedOrders.find(o => o.tableId === tableIdFilter)?.tableNumber || tableIdFilter})` : ''} </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-4">
            <Tabs value={activeMainTab} onValueChange={(value) => { setActiveMainTab(value as MainTabValue); setDetailedStatusFilter(null); fetchRestaurantAndOrders(); }} className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:flex sm:flex-wrap">
                {MAIN_TABS.map(tab => ( <TabsTrigger key={tab.value} value={tab.value} className="text-xs px-2 py-1.5 h-auto sm:flex-initial"> {tab.label} </TabsTrigger> ))}
              </TabsList>
            </Tabs>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div className="space-y-1">
                <label htmlFor="detailed-status-filter" className="text-sm font-medium text-muted-foreground">Filter by Specific Status</label>
                <Select 
                  value={detailedStatusFilter || ALL_STATUSES_VALUE} 
                  onValueChange={(value) => {
                    if (value === ALL_STATUSES_VALUE) {
                      setDetailedStatusFilter(null);
                    } else {
                      setDetailedStatusFilter(value as OrderStatusType);
                    }
                    // Trigger fetch on change
                    // Consider debouncing or a separate apply button if performance is an issue
                    // For now, direct fetch:
                    // fetchRestaurantAndOrders(); // This might be too frequent, handled by main useEffect on detailedStatusFilter change
                  }}
                >
                  <SelectTrigger id="detailed-status-filter" className="h-10"><SelectValue placeholder="Select status..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_STATUSES_VALUE}>All Specific Statuses</SelectItem>
                    {DETAILED_STATUS_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Filter by Date Range</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal h-10", !dateRange && "text-muted-foreground")} >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>) : (format(dateRange.from, "LLL dd, y"))) : (<span>Pick a date range</span>)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2}/></PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1">
                 <label className="text-sm font-medium text-muted-foreground">Filter by Price Range</label>
                 <div className="flex gap-2">
                    <Input type="number" placeholder="Min $" value={priceRange.min} onChange={e => setPriceRange(p => ({...p, min: e.target.value}))} className="h-10" />
                    <Input type="number" placeholder="Max $" value={priceRange.max} onChange={e => setPriceRange(p => ({...p, max: e.target.value}))} className="h-10" />
                 </div>
              </div>
              <Button onClick={() => {setDetailedStatusFilter(null); setDateRange(undefined); setPriceRange({min:'', max:''}); setActiveMainTab('active'); fetchRestaurantAndOrders();}} variant="outline" className="h-10 self-end">
                <Filter className="mr-2 h-4 w-4"/> Clear Filters &amp; Reload
              </Button>
            </div>
          </div>

          {(pageLoading && displayedOrders.length === 0) ? (
            <div className="text-center py-10"><LoadingSpinner className="h-8 w-8 text-primary" /></div>
          ) : displayedOrders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead columnKey="id">Order ID</SortableTableHead>
                  <SortableTableHead columnKey="tableNumber">Table</SortableTableHead>
                  <SortableTableHead columnKey="createdAt">Created</SortableTableHead>
                  <TableHead>Items</TableHead>
                  <SortableTableHead columnKey="totalAmount">Total</SortableTableHead>
                  <SortableTableHead columnKey="status">Status</SortableTableHead>
                  <TableHead className="text-right w-[180px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedOrders.map(order => {
                  const StatusIcon = orderStatusConfig[order.status]?.icon;
                  return (
                    <TableRow key={order.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium text-xs">#{order.id.substring(0, 6)}...</TableCell>
                      <TableCell>{order.tableNumber || 'N/A'}</TableCell>
                      <TableCell className="text-xs">{format(parseISO(order.createdAt), 'MMM d, p')}</TableCell>
                      <TableCell className="text-xs">{getItemsSummary(order.items)}</TableCell>
                      <TableCell className="text-right font-medium">${order.totalAmount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className={`${orderStatusConfig[order.status].color} text-xs whitespace-nowrap`}>
                          {StatusIcon && <StatusIcon className="h-3 w-3 mr-1.5" />}
                          {orderStatusConfig[order.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Select value={order.status} onValueChange={(newStatus) => handleStatusChange(order.id, newStatus as OrderStatusType)} disabled={updatingOrderId === order.id || (possibleNextStatuses[order.status]?.length === 0 && order.status !== 'completed')} >
                            <SelectTrigger id={`status-${order.id}`} className="h-8 text-xs w-[130px] bg-card"> <SelectValue placeholder="Update..." /> </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={order.status} disabled className="text-xs">{orderStatusConfig[order.status].shortLabel || orderStatusConfig[order.status].label} (Current)</SelectItem>
                              {possibleNextStatuses[order.status]?.map(nextStatus => (<SelectItem key={nextStatus} value={nextStatus} className="text-xs">{orderStatusConfig[nextStatus].label}</SelectItem>))}
                              {!['completed', 'cancelled_by_customer', 'cancelled_by_restaurant'].includes(order.status) && (<SelectItem value="completed" className="text-xs">{orderStatusConfig.completed.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" disabled={updatingOrderId === order.id}><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Order Actions</span></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end"> <DropdownMenuItem onClick={() => toast({ title: "Feature Coming Soon", description: `Details for Order #${order.id.substring(0,6)} will be shown here.`})}><Eye className="mr-2 h-4 w-4" /> View Details </DropdownMenuItem> </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10 border-2 border-dashed rounded-lg bg-muted/30">
              <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Orders Found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or check back later.</p>
              <Image src="https://picsum.photos/seed/noordersfilter/300/200" alt="No orders illustration" width={300} height={200} className="mt-6 mx-auto rounded-md opacity-70" data-ai-hint="empty plate filter"/>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
