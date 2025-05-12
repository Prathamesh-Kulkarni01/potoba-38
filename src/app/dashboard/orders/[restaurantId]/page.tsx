
// src/app/dashboard/orders/[restaurantId]/page.tsx
'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth/context';
import { getRestaurant } from '@/lib/firebase/firestore';
import { updateOrder, createOrder } from '@/lib/firebase/orders';
import { getOrdersCollectionPath, getTablesCollectionPath, convertFirebaseTimestampToString } from '@/lib/firebase/utils';
import { getMenuItems as fetchMenuItemsFirebase, getMenuCategories, getMenuSubcategories } from '@/lib/firebase/menu';
import type { RestaurantProfile, OrderStatus as OrderStatusType, OrderItem, ClientOrder, MenuItem as MenuItemType, MenuCategory, MenuSubcategory, Table as FirebaseTableType } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Eye, MoreHorizontal, Clock, Utensils, CheckCircle, XCircle, Send, CalendarIcon, Filter, ArrowUpDown, PlusCircle, ListOrdered, Hourglass, FilterIcon, FilterXIcon } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import { cn } from '@/lib/utils';
import { collection, query, where, orderBy, onSnapshot, Timestamp, QueryConstraint, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import MenuSelectionForBill from '@/components/table-management/menu-selection-for-bill';
import OrderBillPanel from '@/components/orders/order-bill-panel';

const orderStatusConfig: Record<OrderStatusType, { label: string; icon?: React.ElementType, shortLabel?: string }> = {
  pending_customer_confirmation: { label: 'Pending Customer Confirmation', shortLabel: 'Pending Cust.', icon: Hourglass },
  pending_kitchen: { label: 'Pending Kitchen Acceptance', shortLabel: 'Pending Kitchen', icon: Hourglass },
  confirmed_by_kitchen: { label: 'Kitchen Confirmed', shortLabel: 'Kitchen Confirmed', icon: Utensils },
  preparing: { label: 'Preparing', shortLabel: 'Preparing', icon: Utensils },
  ready_for_pickup: { label: 'Ready for Pickup', shortLabel: 'Ready Pickup', icon: ShoppingCart },
  served: { label: 'Served', shortLabel: 'Served', icon: CheckCircle },
  payment_pending: { label: 'Payment Pending', shortLabel: 'Payment Pend.', icon: Clock },
  completed: { label: 'Completed', shortLabel: 'Completed', icon: CheckCircle },
  cancelled_by_customer: { label: 'Cancelled by Customer', shortLabel: 'Cancelled (Cust)', icon: XCircle },
  cancelled_by_restaurant: { label: 'Cancelled by Restaurant', shortLabel: 'Cancelled (Rest)', icon: XCircle },
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

// Used DollarSignIcon from page.tsx as lucide-react doesn't have a direct one, or use specific one if available
function DollarSignIcon(props: React.SVGProps<SVGSVGElement>) {
  return (<svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" > <line x1="12" x2="12" y1="2" y2="22" /> <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /> </svg>);
}

type MainTabValue = 'active' | 'all' | 'pending_kitchen' | 'cancelled';
const MAIN_TABS: { value: MainTabValue; label: string; statuses?: OrderStatusType[] }[] = [
  { value: 'all', label: 'All Orders' },
  { value: 'active', label: 'Active', statuses: ['pending_customer_confirmation', 'pending_kitchen', 'confirmed_by_kitchen', 'preparing', 'ready_for_pickup', 'served', 'payment_pending'] },
  { value: 'pending_kitchen', label: 'Pending Kitchen', statuses: ['pending_kitchen', 'confirmed_by_kitchen'] }, // Example custom tab
  { value: 'cancelled', label: 'Cancelled', statuses: ['cancelled_by_customer', 'cancelled_by_restaurant'] },
];
const DETAILED_STATUS_OPTIONS = (Object.keys(orderStatusConfig) as OrderStatusType[]).map(status => ({ value: status, label: orderStatusConfig[status].label }));
const ALL_STATUSES_VALUE = "_all_";

const toClientOrder = (docId: string, data: any): ClientOrder => {
  const orderBase: Omit<ClientOrder, 'id' | 'createdAt' | 'updatedAt'> = {
    restaurantId: data.restaurantId, userId: data.userId, tableId: data.tableId || null, tableNumber: data.tableNumber || null,
    items: data.items as OrderItem[], subtotal: data.subtotal, totalAmount: data.totalAmount, status: data.status as OrderStatusType,
    taxAmount: typeof data.taxAmount === 'number' ? data.taxAmount : undefined, serviceCharge: typeof data.serviceCharge === 'number' ? data.serviceCharge : undefined,
    discountAmount: typeof data.discountAmount === 'number' ? data.discountAmount : undefined, customerNotes: typeof data.customerNotes === 'string' ? data.customerNotes : undefined,
    kitchenNotes: typeof data.kitchenNotes === 'string' ? data.kitchenNotes : undefined, paymentMethod: typeof data.paymentMethod === 'string' ? data.paymentMethod : undefined,
    transactionId: typeof data.transactionId === 'string' ? data.transactionId : undefined, customerName: typeof data.customerName === 'string' ? data.customerName : undefined,
    customerPhoneNumber: typeof data.customerPhoneNumber === 'string' ? data.customerPhoneNumber : undefined,
  };
  return { id: docId, ...orderBase, createdAt: convertFirebaseTimestampToString(data.createdAt), updatedAt: convertFirebaseTimestampToString(data.updatedAt) };
};

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
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [activeMainTab, setActiveMainTab] = useState<MainTabValue>('active');
  const [detailedStatusFilter, setDetailedStatusFilter] = useState<OrderStatusType | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [sortConfig, setSortConfig] = useState<{ key: keyof ClientOrder | null; direction: 'ascending' | 'descending' }>({ key: 'createdAt', direction: 'descending' });
  const tableIdFilter = useMemo(() => searchParamsHook.get('tableId'), [searchParamsHook]);

  const [selectedOrderToEdit, setSelectedOrderToEdit] = useState<ClientOrder | null>(null);
  const [isOrderEditPanelVisible, setIsOrderEditPanelVisible] = useState(false);
  const [isMenuSelectionForOrderOpen, setIsMenuSelectionForOrderOpen] = useState(false);
  const [currentOrderBillItems, setCurrentOrderBillItems] = useState<OrderItem[]>([]);
  const [editingMode, setEditingMode] = useState<'edit' | 'new' | null>(null);

  const [menuItems, setMenuItemsState] = useState<MenuItemType[]>([]);
  const [categories, setCategoriesState] = useState<MenuCategory[]>([]);
  const [subcategories, setSubcategoriesState] = useState<MenuSubcategory[]>([]);

  const [showFilters, setShowFilters] = useState(false);

  // Fetch restaurant and menu data
  useEffect(() => {
    if (!restaurantId || !user) return;
    setPageLoading(true);
    Promise.all([
      getRestaurant(restaurantId),
      fetchMenuItemsFirebase(restaurantId),
      getMenuCategories(restaurantId),
      getMenuSubcategories(restaurantId)
    ]).then(([restaurantData, fetchedMenuItems, fetchedCategories, fetchedSubcategories]) => {
      if (restaurantData && (restaurantData.ownerId === user.uid || (role === 'staff' && user.restaurantId === restaurantId))) {
        setRestaurant(restaurantData);
        setMenuItemsState(fetchedMenuItems);
        setCategoriesState(fetchedCategories.sort((a, b) => a.order - b.order));
        setSubcategoriesState(fetchedSubcategories.sort((a, b) => a.order - b.order));
      } else {
        toast({ variant: "destructive", title: "Access Denied", description: "Restaurant not found or you don't have permission." });
        router.replace('/dashboard');
      }
    }).catch(error => {
      console.error("Error fetching initial data:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load initial restaurant or menu data." });
    }).finally(() => {
      // Page loading will be set to false by orders listener
    });
  }, [restaurantId, user, role, router, toast]);

  // Real-time orders listener
  useEffect(() => {
    if (!restaurantId || !user || !db) return;
    setPageLoading(true);
    const ordersColRef = collection(db, getOrdersCollectionPath(restaurantId));
    const queryConstraints: QueryConstraint[] = [];

    // Determine which status filter to apply
    let statusFilterToUse: OrderStatusType[] | undefined = undefined;
    if (detailedStatusFilter) {
      statusFilterToUse = [detailedStatusFilter];
    } else if (activeMainTab !== 'all') {
      statusFilterToUse = MAIN_TABS.find(tab => tab.value === activeMainTab)?.statuses;
    }

    if (statusFilterToUse && statusFilterToUse.length > 0) {
      queryConstraints.push(where('status', 'in', statusFilterToUse));
    }

    if (dateRange?.from) {
      queryConstraints.push(where('createdAt', '>=', Timestamp.fromDate(dateRange.from)));
    }
    if (dateRange?.to) {
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999); // Include the whole 'to' day
      queryConstraints.push(where('createdAt', '<=', Timestamp.fromDate(toDate)));
    }

    if (tableIdFilter) {
      queryConstraints.push(where('tableId', '==', tableIdFilter));
    }

    queryConstraints.push(orderBy('createdAt', 'desc'));

    const q = query(ordersColRef, ...queryConstraints);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(docSnap => toClientOrder(docSnap.id, docSnap.data()));
      setAllFetchedOrders(fetchedOrders);
      setPageLoading(false); // Data loaded, stop page loading
    }, (error) => {
      console.error("Error listening to orders:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load live order data." });
      setPageLoading(false);
    });

    return () => unsubscribe();
  }, [restaurantId, user, activeMainTab, detailedStatusFilter, dateRange, tableIdFilter, toast]);

  // Client-side filtering for price and sorting
  useEffect(() => {
    let filtered = [...allFetchedOrders];

    // Price Range Filter
    const minPrice = parseFloat(priceRange.min);
    const maxPrice = parseFloat(priceRange.max);
    if (!isNaN(minPrice)) {
      filtered = filtered.filter(order => order.totalAmount >= minPrice);
    }
    if (!isNaN(maxPrice)) {
      filtered = filtered.filter(order => order.totalAmount <= maxPrice);
    }

    // Sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const valA = a[sortConfig.key!];
        const valB = b[sortConfig.key!];
        let comparison = 0;
        if (typeof valA === 'string' && typeof valB === 'string') {
          if ((sortConfig.key === 'createdAt' || sortConfig.key === 'updatedAt')) {
            // Assuming createdAt and updatedAt are ISO strings
            comparison = new Date(valA).getTime() - new Date(valB).getTime();
          } else {
            comparison = valA.localeCompare(valB);
          }
        } else if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        }
        // Handle null or undefined values if necessary
        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }
    setDisplayedOrders(filtered);
  }, [allFetchedOrders, priceRange, sortConfig]);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatusType) => {
    setUpdatingOrderId(orderId);
    try {
      await updateOrder(restaurantId, orderId, { status: newStatus });
      toast({ title: "Order Status Updated", description: `Order marked as ${orderStatusConfig[newStatus].label}.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message || "Could not update order status." });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleSort = (key: keyof ClientOrder) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending'
    }));
  };

  const getItemsSummary = (items: OrderItem[]) => {
    if (!items || items.length === 0) return "No items";
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    return `${totalQuantity} item${totalQuantity > 1 ? 's' : ''}`;
  };

  const handleClearFilters = () => {
    setActiveMainTab('active');
    setDetailedStatusFilter(null);
    setDateRange(undefined);
    setPriceRange({ min: '', max: '' });
    // Optionally reset sort config: setSortConfig({ key: 'createdAt', direction: 'descending' });
  };

  const handleOpenEditPanel = (order: ClientOrder) => {
    setSelectedOrderToEdit(order);
    setCurrentOrderBillItems([...order.items]); // Deep copy
    setEditingMode('edit');
    setIsOrderEditPanelVisible(true);
    setIsMenuSelectionForOrderOpen(false); // Close menu selection if open
  };

  const handleOpenNewOrderPanel = () => {
    setSelectedOrderToEdit(null); // Clear any existing edit state
    setCurrentOrderBillItems([]);
    setEditingMode('new');
    setIsOrderEditPanelVisible(true);
    setIsMenuSelectionForOrderOpen(false);
  };

  const handleAddItemToOrderBill = (menuItem: MenuItemType, quantity: number = 1) => {
    setCurrentOrderBillItems(prevBillItems => {
      const existingItem = prevBillItems.find(bi => bi.menuItemId === menuItem.id);
      if (existingItem) {
        return prevBillItems.map(bi =>
          bi.menuItemId === menuItem.id
            ? { ...bi, quantity: bi.quantity + quantity, totalPrice: (bi.quantity + quantity) * bi.unitPrice }
            : bi
        );
      } else {
        return [...prevBillItems, {
          menuItemId: menuItem.id,
          menuItemName: menuItem.name,
          quantity,
          unitPrice: menuItem.price,
          totalPrice: quantity * menuItem.price,
          // variantChoices: [] // Handle variants if applicable
        }];
      }
    });
    toast({ title: "Item Added", description: `${menuItem.name} added to current order draft.` });
  };

  const handleUpdateItemQuantityInOrderBill = (menuItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      // Remove item if quantity is 0 or less
      setCurrentOrderBillItems(currentOrderBillItems.filter(bi => bi.menuItemId !== menuItemId));
    } else {
      setCurrentOrderBillItems(currentOrderBillItems.map(bi =>
        bi.menuItemId === menuItemId
          ? { ...bi, quantity: newQuantity, totalPrice: newQuantity * bi.unitPrice }
          : bi
      ));
    }
  };

  const handleRemoveItemFromOrderBill = (menuItemId: string) => {
    setCurrentOrderBillItems(currentOrderBillItems.filter(bi => bi.menuItemId !== menuItemId));
  };

  const handleSaveOrderChanges = async (updatedOrderData: Partial<ClientOrder>) => {
    if (!selectedOrderToEdit && editingMode !== 'new') {
      toast({ variant: "destructive", title: "Error", description: "No order selected to update." });
      return;
    }

    setFormSubmitting(true);
    try {
      // Calculate subtotal, tax, and total based on currentOrderBillItems
      const subtotal = currentOrderBillItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const taxRate = restaurant?.taxRate ?? 0.10; // Use restaurant-specific tax rate or default
      const taxAmount = subtotal * taxRate;
      const totalAmount = subtotal + taxAmount;

      if (editingMode === 'edit' && selectedOrderToEdit) {
        await updateOrder(restaurantId, selectedOrderToEdit.id, {
          items: currentOrderBillItems,
          subtotal, taxAmount, totalAmount,
          ...updatedOrderData // Pass other fields like customerName, notes, status
        });
        toast({ title: "Order Updated", description: `Order #${selectedOrderToEdit.id.substring(0, 6)} updated.` });
      } else if (editingMode === 'new') {
        // Construct the full new order payload
        const newOrderPayload: Omit<ClientOrder, 'id' | 'createdAt' | 'updatedAt'> = {
          restaurantId, // Essential
          items: currentOrderBillItems,
          subtotal, taxAmount, totalAmount,
          status: updatedOrderData.status || 'pending_kitchen', // Default status
          userId: user?.uid, // Can be null if not logged in/anonymous
          ...updatedOrderData // Other fields
        };
        await createOrder(restaurantId, newOrderPayload);
        toast({ title: "New Order Placed", description: `New order created.` });
      }

      setIsOrderEditPanelVisible(false); // Close panel on success
      setSelectedOrderToEdit(null);
      setEditingMode(null);
      // Data will refresh via onSnapshot listener
    } catch (error: any) {
      toast({ variant: "destructive", title: "Operation Failed", description: error.message || "Could not save order." });
    } finally {
      setFormSubmitting(false);
    }
  };


  if (authLoading || (pageLoading && !restaurant && allFetchedOrders.length === 0)) {
    return <div className="flex h-full items-center justify-center"><LoadingSpinner className="h-10 w-10 text-primary" /></div>;
  }
  if (!restaurant && !pageLoading) { // Added !pageLoading to ensure this only shows after initial load attempt
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

  // Dynamic classes for layout adjustment
  const orderListPanelClasses = cn(
    "p-4 overflow-y-auto transition-all duration-300 ease-in-out flex-grow",
    isOrderEditPanelVisible ? "w-full md:w-3/5" : "w-full" // Take full width if edit panel is hidden
  );

  const orderEditPanelClasses = cn(
    "absolute top-0 right-0 h-full bg-card shadow-xl z-20 transition-transform duration-300 ease-in-out overflow-y-auto ",
    "w-full sm:w-[350px] md:w-[320px] lg:w-[380px]", // Adjust widths as needed
    isOrderEditPanelVisible ? "transform translate-x-0" : "transform -translate-x-full"
  );

  const menuSelectionPanelClasses = cn(
    "absolute top-0 left-0 h-full bg-card shadow-xl z-20 transition-transform duration-300 ease-in-out overflow-y-auto border-r",
    "w-full sm:w-[350px] md:w-[320px] lg:w-[380px]", // Adjust widths as needed
    isMenuSelectionForOrderOpen ? "transform translate-x-0" : "transform -translate-x-full"
  );


  return (
    <div className="flex h-[calc(100vh-theme(spacing.16)-130px)] overflow-hidden relative"> {/* Ensure parent has fixed height */}
      {/* Menu Selection Panel (conditionally rendered, slides in from left) */}
      {isOrderEditPanelVisible && ( // Only show menu selection if edit panel itself is visible
        <div className={menuSelectionPanelClasses}>
          {isMenuSelectionForOrderOpen && ( // This inner condition controls the slide-in
            <MenuSelectionForBill
              menuItems={menuItems}
              categories={categories}
              subcategories={subcategories}
              onAddItemToBill={handleAddItemToOrderBill}
              onClosePanel={() => setIsMenuSelectionForOrderOpen(false)}
            />
          )}
        </div>
      )}

      {/* Main Content Area (Order List + Order Edit/New Panel) */}
      <div className="flex flex-1 overflow-hidden"> {/* Flex container for list and edit panel */}
        {/* Order List Panel */}
        <div className={orderListPanelClasses}>
          <Card className="shadow-xl h-full flex flex-col"> {/* Ensure card takes full height of its container */}
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-end items-end md:items-center">
                {/* <div className="mb-4 md:mb-0"> */}
                {/* <CardTitle className="text-2xl md:text-3xl flex items-center">
                    <ListOrdered className="mr-3 h-7 w-7 text-primary" /> Order Management
                  </CardTitle> */}
                {/* <CardDescription>
                    View, manage, and create orders for {restaurant?.name || 'your restaurant'}.
                    {tableIdFilter ? `(Filtered for Table ${allFetchedOrders.find(o => o.tableId === tableIdFilter)?.tableNumber || tableIdFilter})` : ''}
                  </CardDescription> */}
                {/* </div> */}
                <Button onClick={handleOpenNewOrderPanel} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <PlusCircle className="mr-2 h-4 w-4" /> New Order
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-grow"> {/* flex-grow to take available space */}
              {/* Filters Section */}

              <div className="mb-6 space-y-4">
                <div className="flex items-center justify-between border rounded-md ">
                  <Tabs value={activeMainTab} onValueChange={(value) => setActiveMainTab(value as MainTabValue)} className="w-full">
                    <TabsList className="flex  overflow-x-auto m-1 flex-nowrap overflow-y-hidden">
                    {MAIN_TABS.map(tab => (
                      <TabsTrigger key={tab.value} value={tab.value} className="text-xs px-2 py-1.5 h-auto sm:flex-initial">
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
                <div className="md:hidden ml-1">
                  <Button variant="outline" className="w-full" onClick={() => setShowFilters(!showFilters)}>
                    {showFilters ?<FilterXIcon className="mr-2 h-4 w-4" /> : <FilterIcon className="mr-2 h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="md:block">
                  {/* Toggle button for mobile */}

                  {/* Filter section (collapsible on mobile) */}
                  <div className={`${showFilters ? "block" : "hidden"} md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end`}>
                    <div className="space-y-1">
                      <label htmlFor="detailed-status-filter" className="text-sm font-medium text-muted-foreground">Specific Status</label>
                      <Select value={detailedStatusFilter || ALL_STATUSES_VALUE} onValueChange={(value) => setDetailedStatusFilter(value === ALL_STATUSES_VALUE ? null : value as OrderStatusType)}>
                        <SelectTrigger id="detailed-status-filter" className="h-10"><SelectValue placeholder="Select status..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL_STATUSES_VALUE}>All Specific Statuses</SelectItem>
                          {DETAILED_STATUS_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">Date Range</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal h-10", !dateRange && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                              dateRange.to ? (
                                <span>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</span>
                              ) : (
                                <span>{format(dateRange.from, "LLL dd, y")}</span>
                              )
                            ) : (
                              <span>Pick a date range</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">Price Range</label>
                      <div className="flex gap-2">
                        <Input type="number" placeholder="Min $" value={priceRange.min} onChange={e => setPriceRange(p => ({ ...p, min: e.target.value }))} className="h-10" />
                        <Input type="number" placeholder="Max $" value={priceRange.max} onChange={e => setPriceRange(p => ({ ...p, max: e.target.value }))} className="h-10" />
                      </div>
                    </div>

                    <Button onClick={handleClearFilters} variant="outline" className="h-10 self-end">
                      <Filter className="mr-2 h-4 w-4" /> Clear Filters
                    </Button>
                  </div>
                </div>
              </div>

              {/* Orders Table or Message */}
              {(pageLoading && displayedOrders.length === 0) ? (
                <div className="text-center py-10"><LoadingSpinner className="h-8 w-8 text-primary" /></div>
              ) : displayedOrders.length > 0 ? (
                <Table>
                  <TableHeader><TableRow>
                    <SortableTableHead columnKey="id">Order ID</SortableTableHead>
                    <SortableTableHead columnKey="tableNumber">Table</SortableTableHead>
                    <SortableTableHead columnKey="createdAt">Created</SortableTableHead>
                    <TableHead>Items</TableHead>
                    <SortableTableHead columnKey="totalAmount">Total</SortableTableHead>
                    <SortableTableHead columnKey="status">Status</SortableTableHead>
                    <TableHead className="text-right w-[200px]">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {displayedOrders.map(order => {
                      const StatusIcon = orderStatusConfig[order.status]?.icon;
                      return (
                        <TableRow key={order.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => handleOpenEditPanel(order)}>
                          <TableCell className="font-medium text-xs">#{order.id.substring(0, 6)}...</TableCell>
                          <TableCell>{order.tableNumber || 'N/A'}</TableCell>
                          <TableCell className="text-xs">{format(parseISO(order.createdAt), 'MMM d, p')}</TableCell>
                          <TableCell className="text-xs">{getItemsSummary(order.items)}</TableCell>
                          <TableCell className="text-right font-medium">${order.totalAmount.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={cn("text-xs whitespace-nowrap", orderStatusConfig[order.status]?.color ? orderStatusConfig[order.status]?.color.replace('text-', 'bg-') + " text-white" : "bg-gray-500 text-white")}>
                              {StatusIcon && <StatusIcon className="h-3 w-3 mr-1.5" />}
                              {orderStatusConfig[order.status].label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <Select
                                value={order.status}
                                onValueChange={(newStatus) => handleStatusChange(order.id, newStatus as OrderStatusType)}
                                onClick={(e) => e.stopPropagation()} // Prevent row click when changing status
                                disabled={updatingOrderId === order.id || (possibleNextStatuses[order.status]?.length === 0 && order.status !== 'completed')}
                              >
                                <SelectTrigger id={`status-${order.id}`} className="h-8 text-xs w-[130px] bg-card">
                                  <SelectValue placeholder="Update..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={order.status} disabled className="text-xs">
                                    {orderStatusConfig[order.status].shortLabel || orderStatusConfig[order.status].label} (Current)
                                  </SelectItem>
                                  {possibleNextStatuses[order.status]?.map(nextStatus => (
                                    <SelectItem key={nextStatus} value={nextStatus} className="text-xs">
                                      {orderStatusConfig[nextStatus].label}
                                    </SelectItem>
                                  ))}
                                  {!['completed', 'cancelled_by_customer', 'cancelled_by_restaurant'].includes(order.status) && (
                                    <SelectItem value="completed" className="text-xs">{orderStatusConfig.completed.label}</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={(e) => { e.stopPropagation(); handleOpenEditPanel(order); }}>Edit</Button>
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
                  <Image src="https://picsum.photos/seed/noordersfilter/300/200" alt="No orders illustration" width={300} height={200} className="mt-6 mx-auto rounded-md opacity-70" data-ai-hint="empty plate filter" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        {/* Order Edit/New Panel (conditionally rendered) */}
        {isOrderEditPanelVisible && (
          <div className={orderEditPanelClasses}>
            <OrderBillPanel
              restaurantId={restaurantId}
              orderToEdit={selectedOrderToEdit}
              mode={editingMode || 'new'}
              currentBillItems={currentOrderBillItems}
              isLoading={formSubmitting}
              onUpdateItemQuantity={handleUpdateItemQuantityInOrderBill}
              onRemoveItem={handleRemoveItemFromOrderBill}
              onSaveOrder={handleSaveOrderChanges}
              onClose={() => { setIsOrderEditPanelVisible(false); setSelectedOrderToEdit(null); setEditingMode(null); }}
              onToggleMenuSelection={() => setIsMenuSelectionForOrderOpen(!isMenuSelectionForOrderOpen)}
              isMenuSelectionOpen={isMenuSelectionForOrderOpen}
              taxRate={restaurant?.taxRate || 0.10}
              orderStatusConfig={orderStatusConfig}
            />
          </div>
        )}
      </div>
    </div>
  );
}
