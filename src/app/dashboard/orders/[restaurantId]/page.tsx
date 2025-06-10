
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import BillingPanel from '@/components/shared/billing-panel';

const orderStatusConfig: Record<OrderStatusType, { label: string; icon?: React.ElementType; color: string; shortLabel?: string }> = {
  pending_customer_confirmation: { label: 'Pending Customer Confirmation', shortLabel: 'Pending Cust.', icon: Hourglass, color: 'text-yellow-600' },
  pending_kitchen: { label: 'Pending Kitchen Acceptance', shortLabel: 'Pending Kitchen', icon: Hourglass, color: 'text-yellow-600' },
  confirmed_by_kitchen: { label: 'Kitchen Confirmed', shortLabel: 'Kitchen Confirmed', icon: Utensils, color: 'text-blue-600' },
  preparing: { label: 'Preparing', shortLabel: 'Preparing', icon: Utensils, color: 'text-blue-600' },
  ready_for_pickup: { label: 'Ready for Pickup', shortLabel: 'Ready Pickup', icon: ShoppingCart, color: 'text-orange-600' },
  served: { label: 'Served', shortLabel: 'Served', icon: CheckCircle, color: 'text-green-600' },
  payment_pending: { label: 'Payment Pending', shortLabel: 'Payment Pend.', icon: Clock, color: 'text-red-600' },
  completed: { label: 'Completed', shortLabel: 'Completed', icon: CheckCircle, color: 'text-green-700' },
  cancelled_by_customer: { label: 'Cancelled by Customer', shortLabel: 'Cancelled (Cust)', icon: XCircle, color: 'text-gray-500' },
  cancelled_by_restaurant: { label: 'Cancelled by Restaurant', shortLabel: 'Cancelled (Rest)', icon: XCircle, color: 'text-gray-500' },
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

const toClientOrder = (docId: string, data: any): ClientOrder => {
  const orderBase: Omit<ClientOrder, 'id' | 'createdAt' | 'updatedAt'> = {
    restaurantId: data.restaurantId, userId: data.userId, tableId: data.tableId || null, tableNumber: data.tableNumber || null,
    items: data.items as OrderItem[], subtotal: data.subtotal, totalAmount: data.totalAmount, status: data.status as OrderStatusType,
    taxAmount: typeof data.taxAmount === 'number' ? data.taxAmount : undefined, serviceCharge: typeof data.serviceCharge === 'number' ? data.serviceCharge : undefined,
    discountAmount: typeof data.discountAmount === 'number' ? data.discountAmount : undefined, customerNotes: typeof data.customerNotes === 'string' ? data.customerNotes : undefined,
    kitchenNotes: typeof data.kitchenNotes === 'string' ? data.kitchenNotes : undefined, paymentMethod: typeof data.paymentMethod === 'string' ? data.paymentMethod : undefined,
    transactionId: typeof data.transactionId === 'string' ? data.transactionId : undefined, customerName: typeof data.customerName === 'string' ? data.customerName : undefined,
    customerPhoneNumber: typeof data.customerPhoneNumber === 'string' ? data.customerPhoneNumber : undefined,
    customerWhatsapp: typeof data.customerWhatsapp === 'string' ? data.customerWhatsapp : undefined, // New
    email: typeof data.email === 'string' ? data.email : undefined, // New
    groupId: typeof data.groupId === 'string' ? data.groupId : null,
    taxBreakup: data.taxBreakup || null,
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
  const [subcategories, setSubcategoriesState] = useState<MenuSubcategory[]>([]); // Not used in this file directly but fetched

  const [showFilters, setShowFilters] = useState(false);
  const [activeOrderEditTab, setActiveOrderEditTab] = useState<'bill' | 'details'>('bill');
  
  // State for new BillingPanel fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhoneNumber, setCustomerPhoneNumber] = useState('');
  const [customerWhatsapp, setCustomerWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [currentTableNumber, setCurrentTableNumber] = useState('');
  const [currentCustomerNotes, setCurrentCustomerNotes] = useState('');
  const [currentKitchenNotes, setCurrentKitchenNotes] = useState('');
  const [currentOrderStatus, setCurrentOrderStatus] = useState<OrderStatusType>('pending_kitchen');
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('amount');
  const [discountValue, setDiscountValue] = useState(0);
  const [serviceChargeValue, setServiceChargeValue] = useState(0);


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

  // Real-time orders listener (existing logic)
  useEffect(() => {
    if (!restaurantId || !user || !db) return;
    setPageLoading(true);
    const ordersColRef = collection(db, getOrdersCollectionPath(restaurantId));
    const queryConstraints: QueryConstraint[] = [];

    let statusFilterToUse: OrderStatusType[] | undefined = undefined;
    if (detailedStatusFilter) {
      statusFilterToUse = [detailedStatusFilter];
    } else if (activeMainTab !== 'all') {
      statusFilterToUse = MAIN_TABS.find(tab => tab.value === activeMainTab)?.statuses;
    }

    if (statusFilterToUse && statusFilterToUse.length > 0) {
      queryConstraints.push(where('status', 'in', statusFilterToUse));
    }
    if (dateRange?.from) queryConstraints.push(where('createdAt', '>=', Timestamp.fromDate(dateRange.from)));
    if (dateRange?.to) {
      const toDate = new Date(dateRange.to); toDate.setHours(23, 59, 59, 999);
      queryConstraints.push(where('createdAt', '<=', Timestamp.fromDate(toDate)));
    }
    if (tableIdFilter) queryConstraints.push(where('tableId', '==', tableIdFilter));
    queryConstraints.push(orderBy('createdAt', 'desc'));

    const q = query(ordersColRef, ...queryConstraints);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(docSnap => toClientOrder(docSnap.id, docSnap.data()));
      setAllFetchedOrders(fetchedOrders);
      setPageLoading(false);
    }, (error) => {
      console.error("Error listening to orders:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load live order data." });
      setPageLoading(false);
    });
    return () => unsubscribe();
  }, [restaurantId, user, activeMainTab, detailedStatusFilter, dateRange, tableIdFilter, toast]);

  // Client-side filtering (existing logic)
  useEffect(() => {
    let filtered = [...allFetchedOrders];
    const minPrice = parseFloat(priceRange.min); const maxPrice = parseFloat(priceRange.max);
    if (!isNaN(minPrice)) filtered = filtered.filter(order => order.totalAmount >= minPrice);
    if (!isNaN(maxPrice)) filtered = filtered.filter(order => order.totalAmount <= maxPrice);
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const valA = a[sortConfig.key!]; const valB = b[sortConfig.key!];
        let comparison = 0;
        if (typeof valA === 'string' && typeof valB === 'string') {
          if ((sortConfig.key === 'createdAt' || sortConfig.key === 'updatedAt')) {
            comparison = new Date(valA).getTime() - new Date(valB).getTime();
          } else { comparison = valA.localeCompare(valB); }
        } else if (typeof valA === 'number' && typeof valB === 'number') { comparison = valA - valB; }
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
    } finally { setUpdatingOrderId(null); }
  };

  const handleSort = (key: keyof ClientOrder) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending' }));
  };

  const getItemsSummary = (items: OrderItem[]) => {
    if (!items || items.length === 0) return "No items";
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    return `${totalQuantity} item${totalQuantity > 1 ? 's' : ''}`;
  };

  const handleClearFilters = () => {
    setActiveMainTab('active'); setDetailedStatusFilter(null); setDateRange(undefined); setPriceRange({ min: '', max: '' });
  };

  const resetBillingPanelStates = () => {
    setCustomerName(''); setCustomerPhoneNumber(''); setCustomerWhatsapp(''); setEmail('');
    setCurrentTableNumber(''); setCurrentCustomerNotes(''); setCurrentKitchenNotes('');
    setCurrentOrderStatus('pending_kitchen'); setDiscountType('amount'); setDiscountValue(0);
    setServiceChargeValue(0); setCurrentOrderBillItems([]);
  };

  const handleOpenEditPanel = (order: ClientOrder) => {
    resetBillingPanelStates(); // Reset before populating
    const enrichedItems = order.items.map(item => {
      const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
      return { ...item, categoryId: menuItem?.categoryId, taxOverrides: menuItem?.taxOverrides };
    });
    setSelectedOrderToEdit(order);
    setCurrentOrderBillItems(enrichedItems);
    setCustomerName(order.customerName || '');
    setCustomerPhoneNumber(order.customerPhoneNumber || '');
    setCustomerWhatsapp(order.customerWhatsapp || '');
    setEmail(order.email || '');
    setCurrentTableNumber(order.tableNumber || '');
    setCurrentCustomerNotes(order.customerNotes || '');
    setCurrentKitchenNotes(order.kitchenNotes || '');
    setCurrentOrderStatus(order.status);
    // For discount and service charge, we might need to calculate them if they are stored as percentages
    // For now, assume they are stored as final amounts, or need to be re-entered if edited.
    setDiscountValue(order.discountAmount || 0); // Assuming discountAmount is the direct value
    setDiscountType(order.discountAmount && order.totalAmount > 0 && order.subtotal > 0 ? ( (order.discountAmount / order.subtotal * 100) % 1 === 0 ? 'percentage' : 'amount' ) : 'amount' ); // Basic heuristic for type
    setServiceChargeValue(order.serviceCharge || 0);

    setEditingMode('edit');
    setActiveOrderEditTab('bill'); // Default to bill view first
    setIsOrderEditPanelVisible(true);
    setIsMenuSelectionForOrderOpen(false);
  };

  const handleOpenNewOrderPanel = () => {
    resetBillingPanelStates(); // Reset for new order
    setSelectedOrderToEdit(null);
    setEditingMode('new');
    setActiveOrderEditTab('details'); // Default to details view for new order
    setIsOrderEditPanelVisible(true);
    setIsMenuSelectionForOrderOpen(false);
  };
  
  const handleAddItemToOrderBill = (menuItem: MenuItemType, quantity: number = 1) => {
    setCurrentOrderBillItems(prevBillItems => {
      const existingItem = prevBillItems.find(bi => bi.menuItemId === menuItem.id);
      if (existingItem) {
        return prevBillItems.map(bi =>
          bi.menuItemId === menuItem.id
            ? { ...bi, quantity: bi.quantity + quantity, totalPrice: (bi.quantity + quantity) * bi.unitPrice } : bi
        );
      } else {
        return [...prevBillItems, {
          menuItemId: menuItem.id, menuItemName: menuItem.name, quantity, unitPrice: menuItem.price,
          totalPrice: quantity * menuItem.price, categoryId: menuItem.categoryId, taxOverrides: menuItem.taxOverrides,
          uniqueId: `${menuItem.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`, // Ensure uniqueId
          status: 'pending_kitchen', createdAt: Date.now()
        }];
      }
    });
    toast({ title: "Item Added", description: `${menuItem.name} added to current order draft.` });
  };

  const handleUpdateItemQuantityInOrderBill = (menuItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) setCurrentOrderBillItems(currentOrderBillItems.filter(bi => bi.menuItemId !== menuItemId));
    else setCurrentOrderBillItems(currentOrderBillItems.map(bi => bi.menuItemId === menuItemId ? { ...bi, quantity: newQuantity, totalPrice: newQuantity * bi.unitPrice } : bi));
  };
  
  const handleRemoveItemFromOrderBill = (menuItemId: string) => setCurrentOrderBillItems(currentOrderBillItems.filter(bi => bi.menuItemId !== menuItemId));

  const handleSaveOrderChanges = async (
    finalizedOrderData: Partial<Pick<ClientOrder, 'customerName' | 'customerPhoneNumber' | 'customerWhatsapp' | 'email' | 'customerNotes' | 'kitchenNotes' | 'status' | 'tableNumber' | 'discountAmount' | 'serviceCharge'>> & { discountType?: 'percentage' | 'amount' }
  ) => {
    setFormSubmitting(true);
    try {
      const payload: Partial<ClientOrder> = {
        items: currentOrderBillItems,
        ...finalizedOrderData,
        // subtotal, taxAmount, totalAmount will be recalculated by createOrder/updateOrder based on items, discount, SC
      };
      if (editingMode === 'edit' && selectedOrderToEdit) {
        await updateOrder(restaurantId, selectedOrderToEdit.id, payload);
        toast({ title: "Order Updated", description: `Order #${selectedOrderToEdit.id.substring(0, 6)} updated.` });
      } else if (editingMode === 'new') {
        const newOrderPayload: Omit<ClientOrder, 'id' | 'createdAt' | 'updatedAt'> = {
          restaurantId,
          items: currentOrderBillItems,
          status: currentOrderStatus || 'pending_kitchen',
          userId: user?.uid,
          customerName: customerName || null,
          customerPhoneNumber: customerPhoneNumber || null,
          customerWhatsapp: customerWhatsapp || null,
          email: email || null,
          tableNumber: currentTableNumber || null,
          customerNotes: currentCustomerNotes || undefined,
          kitchenNotes: currentKitchenNotes || undefined,
          discountAmount: finalizedOrderData.discountAmount || 0,
          serviceCharge: finalizedOrderData.serviceCharge || 0,
          subtotal: 0, // Will be recalc'd
          totalAmount: 0, // Will be recalc'd
        };
        await createOrder(restaurantId, newOrderPayload);
        toast({ title: "New Order Created", description: `New order placed.` });
      }
      setIsOrderEditPanelVisible(false); setSelectedOrderToEdit(null); setEditingMode(null); resetBillingPanelStates();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Operation Failed", description: error.message || "Could not save order." });
    } finally { setFormSubmitting(false); }
  };

  if (authLoading || (pageLoading && !restaurant && allFetchedOrders.length === 0)) return <div className="flex h-full items-center justify-center"><LoadingSpinner className="h-10 w-10 text-primary" /></div>;
  if (!restaurant && !pageLoading) return <Card><CardHeader><CardTitle>Error</CardTitle></CardHeader><CardContent><p>Restaurant data could not be loaded.</p></CardContent></Card>;

  const SortableTableHead = ({ columnKey, children }: { columnKey: keyof ClientOrder, children: React.ReactNode }) => (
    <TableHead onClick={() => handleSort(columnKey)} className="cursor-pointer hover:bg-muted/50">
      <div className="flex items-center gap-2">{children}{sortConfig.key === columnKey && <ArrowUpDown className={`h-3 w-3 ${sortConfig.direction === 'descending' ? 'rotate-180' : ''}`} />}</div>
    </TableHead>
  );

  const orderListPanelClasses = cn("p-4 overflow-y-auto transition-all duration-300 ease-in-out flex-grow", isOrderEditPanelVisible ? "w-full md:w-3/5" : "w-full");
  const orderEditPanelClasses = cn("absolute top-0 right-0 h-full bg-card shadow-xl z-20 transition-transform duration-300 ease-in-out overflow-y-auto ", "w-full sm:w-[380px] md:w-[420px] lg:w-[450px]", isOrderEditPanelVisible ? "transform translate-x-0" : "transform translate-x-full");
  const menuSelectionPanelClasses = cn("absolute top-0 left-0 h-full bg-card shadow-xl z-20 transition-transform duration-300 ease-in-out overflow-y-auto border-r", "w-full sm:w-[380px] md:w-[420px] lg:w-[450px]", isMenuSelectionForOrderOpen ? "transform translate-x-0" : "transform -translate-x-full");

  return (
    <div className="flex h-[calc(100vh-theme(spacing.16)-80px)] overflow-hidden relative">
      {isOrderEditPanelVisible && (
        <div className={menuSelectionPanelClasses}>
          {isMenuSelectionForOrderOpen && (
            <MenuSelectionForBill menuItems={menuItems} categories={categories} subcategories={subcategories} onAddItemToBill={handleAddItemToOrderBill} onClosePanel={() => setIsMenuSelectionForOrderOpen(false)} />
          )}
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <div className={orderListPanelClasses}>
          <Card className="shadow-xl h-full flex flex-col">
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                 <div className="mb-4 md:mb-0">
                  <CardTitle className="text-2xl md:text-3xl flex items-center">
                    <ListOrdered className="mr-3 h-7 w-7 text-primary" /> Order Management
                  </CardTitle>
                  <CardDescription>
                    View, manage, and create orders for {restaurant?.name || 'your restaurant'}.
                    {tableIdFilter ? `(Filtered for Table ${allFetchedOrders.find(o => o.tableId === tableIdFilter)?.tableNumber || tableIdFilter})` : ''}
                  </CardDescription>
                </div>
                <Button onClick={handleOpenNewOrderPanel} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <PlusCircle className="mr-2 h-4 w-4" /> New Order
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="mb-6 space-y-4">
                <div className="flex items-center justify-between border rounded-md ">
                  <Tabs value={activeMainTab} onValueChange={(value) => setActiveMainTab(value as MainTabValue)} className="w-full">
                    <TabsList className="flex overflow-x-auto m-1 flex-nowrap overflow-y-hidden">
                    {MAIN_TABS.map(tab => (<TabsTrigger key={tab.value} value={tab.value} className="text-xs px-2 py-1.5 h-auto sm:flex-initial">{tab.label}</TabsTrigger>))}
                  </TabsList></Tabs>
                  <div className="md:hidden ml-1"><Button variant="outline" className="w-full" onClick={() => setShowFilters(!showFilters)}>{showFilters ?<FilterXIcon className="mr-2 h-4 w-4" /> : <FilterIcon className="mr-2 h-4 w-4" />}</Button></div>
                </div>
                <div className={`${showFilters ? "block" : "hidden"} md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end`}>
                  <div className="space-y-1">
                    <label htmlFor="detailed-status-filter" className="text-sm font-medium text-muted-foreground">Specific Status</label>
                    <Select value={detailedStatusFilter || ALL_STATUSES_VALUE} onValueChange={(value) => setDetailedStatusFilter(value === ALL_STATUSES_VALUE ? null : value as OrderStatusType)}>
                      <SelectTrigger id="detailed-status-filter" className="h-10"><SelectValue placeholder="Select status..." /></SelectTrigger>
                      <SelectContent><SelectItem value={ALL_STATUSES_VALUE}>All Specific Statuses</SelectItem>{DETAILED_STATUS_OPTIONS.map(opt => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">Date Range</label>
                    <Popover><PopoverTrigger asChild><Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal h-10", !dateRange && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{dateRange?.from ? (dateRange.to ? (<span>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</span>) : (<span>{format(dateRange.from, "LLL dd, y")}</span>)) : (<span>Pick a date range</span>)}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} /></PopoverContent></Popover>
                  </div>
                  <div className="space-y-1"><label className="text-sm font-medium text-muted-foreground">Price Range</label><div className="flex gap-2"><Input type="number" placeholder="Min $" value={priceRange.min} onChange={e => setPriceRange(p => ({ ...p, min: e.target.value }))} className="h-10" /><Input type="number" placeholder="Max $" value={priceRange.max} onChange={e => setPriceRange(p => ({ ...p, max: e.target.value }))} className="h-10" /></div></div>
                  <Button onClick={handleClearFilters} variant="outline" className="h-10 self-end"><Filter className="mr-2 h-4 w-4" /> Clear Filters</Button>
                </div>
              </div>
              {(pageLoading && displayedOrders.length === 0) ? (<div className="text-center py-10"><LoadingSpinner className="h-8 w-8 text-primary" /></div>
              ) : displayedOrders.length > 0 ? (
                <Table><TableHeader><TableRow><SortableTableHead columnKey="id">Order ID</SortableTableHead><SortableTableHead columnKey="tableNumber">Table</SortableTableHead><SortableTableHead columnKey="createdAt">Created</SortableTableHead><TableHead>Items</TableHead><SortableTableHead columnKey="totalAmount">Total</SortableTableHead><SortableTableHead columnKey="status">Status</SortableTableHead><TableHead className="text-right w-[200px]">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>{displayedOrders.map(order => { const StatusIcon = orderStatusConfig[order.status]?.icon; return (
                        <TableRow key={order.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => handleOpenEditPanel(order)}><TableCell className="font-medium text-xs">#{order.id.substring(0, 6)}...</TableCell><TableCell>{order.tableNumber || 'N/A'}</TableCell><TableCell className="text-xs">{format(parseISO(order.createdAt), 'MMM d, p')}</TableCell><TableCell className="text-xs">{getItemsSummary(order.items)}</TableCell><TableCell className="text-right font-medium">${order.totalAmount.toFixed(2)}</TableCell><TableCell><Badge className={cn("text-xs whitespace-nowrap", orderStatusConfig[order.status]?.color ? orderStatusConfig[order.status]?.color.replace('text-', 'bg-') + " text-white" : "bg-gray-500 text-white")}>{StatusIcon && <StatusIcon className="h-3 w-3 mr-1.5" />}{orderStatusConfig[order.status]?.label || order.status}</Badge></TableCell>
                          <TableCell className="text-right"><div className="flex items-center justify-end space-x-1">
                              <Select value={order.status} onValueChange={(newStatus) => handleStatusChange(order.id, newStatus as OrderStatusType)} onClick={(e) => e.stopPropagation()} disabled={updatingOrderId === order.id || (possibleNextStatuses[order.status]?.length === 0 && order.status !== 'completed')}><SelectTrigger id={`status-${order.id}`} className="h-8 text-xs w-[130px] bg-card"><SelectValue placeholder="Update..." /></SelectTrigger><SelectContent><SelectItem value={order.status} disabled className="text-xs">{orderStatusConfig[order.status].shortLabel || orderStatusConfig[order.status].label} (Current)</SelectItem>{possibleNextStatuses[order.status]?.map(nextStatus => (<SelectItem key={nextStatus} value={nextStatus} className="text-xs">{orderStatusConfig[nextStatus].label}</SelectItem>))}{!['completed', 'cancelled_by_customer', 'cancelled_by_restaurant'].includes(order.status) && (<SelectItem value="completed" className="text-xs">{orderStatusConfig.completed.label}</SelectItem>)}</SelectContent></Select>
                              <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={(e) => { e.stopPropagation(); handleOpenEditPanel(order); }}>Edit</Button>
                          </div></TableCell></TableRow>);})}
                  </TableBody></Table>
              ) : (<div className="text-center py-10 border-2 border-dashed rounded-lg bg-muted/30"><ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-4" /><h3 className="text-xl font-semibold mb-2">No Orders Found</h3><p className="text-muted-foreground">Try adjusting your filters or check back later.</p><Image src="https://picsum.photos/seed/noordersfilter/300/200" alt="No orders illustration" width={300} height={200} className="mt-6 mx-auto rounded-md opacity-70" data-ai-hint="empty plate filter"/></div>)}
            </CardContent>
          </Card>
        </div>
        {isOrderEditPanelVisible && (
          <div className={orderEditPanelClasses}>
            <Tabs value={activeOrderEditTab} onValueChange={(val) => setActiveOrderEditTab(val as 'bill' | 'details')} className="w-full">
              <TabsList className="mb-4 overflow-x-auto flex-nowrap whitespace-nowrap">
                <TabsTrigger value="details">Details & Adjust</TabsTrigger>
                <TabsTrigger value="bill">Bill Items</TabsTrigger>
              </TabsList>
              <TabsContent value="details">
                <BillingPanel
                  orderId={selectedOrderToEdit?.id}
                  orderCreatedAt={selectedOrderToEdit?.createdAt}
                  billItems={currentOrderBillItems} restaurant={restaurant} categoryMap={categories.reduce((acc, cat) => { acc[cat.id] = cat; return acc; }, {} as Record<string, MenuCategory>)}
                  isLoading={formSubmitting} onUpdateItemQuantity={handleUpdateItemQuantityInOrderBill} onRemoveItem={handleRemoveItemFromOrderBill}
                  onFinalize={handleSaveOrderChanges} onClose={() => { setIsOrderEditPanelVisible(false); setSelectedOrderToEdit(null); setEditingMode(null); resetBillingPanelStates(); }}
                  onToggleMenuSelection={() => setIsMenuSelectionForOrderOpen(!isMenuSelectionForOrderOpen)} isMenuSelectionOpen={isMenuSelectionForOrderOpen}
                  mode={editingMode || 'new'} panelTitle={editingMode === 'edit' && selectedOrderToEdit ? `Order #${selectedOrderToEdit.id.substring(0,6)}` : 'New Order'}
                  finalizeLabel={editingMode === 'edit' ? 'Save Order Changes' : 'Create Order'} showMenuButton={false} showCloseButton
                  customerName={customerName} setCustomerName={setCustomerName}
                  customerPhoneNumber={customerPhoneNumber} setCustomerPhoneNumber={setCustomerPhoneNumber}
                  customerWhatsapp={customerWhatsapp} setCustomerWhatsapp={setCustomerWhatsapp}
                  email={email} setEmail={setEmail}
                  tableNumber={currentTableNumber} setTableNumber={setCurrentTableNumber}
                  customerNotes={currentCustomerNotes} setCustomerNotes={setCurrentCustomerNotes}
                  kitchenNotes={currentKitchenNotes} setKitchenNotes={setCurrentKitchenNotes}
                  orderStatus={currentOrderStatus} setOrderStatus={setCurrentOrderStatus} orderStatusConfig={orderStatusConfig}
                  discountType={discountType} setDiscountType={setDiscountType} discountValue={discountValue} setDiscountValue={setDiscountValue}
                  serviceChargeValue={serviceChargeValue} setServiceChargeValue={setServiceChargeValue}
                  view="details"
                />
              </TabsContent>
              <TabsContent value="bill">
                <BillingPanel
                  orderId={selectedOrderToEdit?.id}
                  orderCreatedAt={selectedOrderToEdit?.createdAt}
                  billItems={currentOrderBillItems} restaurant={restaurant} categoryMap={categories.reduce((acc, cat) => { acc[cat.id] = cat; return acc; }, {} as Record<string, MenuCategory>)}
                  isLoading={formSubmitting} onUpdateItemQuantity={handleUpdateItemQuantityInOrderBill} onRemoveItem={handleRemoveItemFromOrderBill}
                  onFinalize={handleSaveOrderChanges} onClose={() => { setIsOrderEditPanelVisible(false); setSelectedOrderToEdit(null); setEditingMode(null); resetBillingPanelStates(); }}
                  onToggleMenuSelection={() => setIsMenuSelectionForOrderOpen(!isMenuSelectionForOrderOpen)} isMenuSelectionOpen={isMenuSelectionForOrderOpen}
                  mode={editingMode || 'new'} panelTitle={editingMode === 'edit' && selectedOrderToEdit ? `Bill for Order #${selectedOrderToEdit.id.substring(0,6)}` : 'New Order Bill'}
                  finalizeLabel={editingMode === 'edit' ? 'Save Changes' : 'Create Order'} showMenuButton showCloseButton
                  discountType={discountType} discountValue={discountValue} serviceChargeValue={serviceChargeValue}
                  view="bill"
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}

// Added for MAIN_TABS type
type MainTabValue = 'active' | 'all' | 'pending_kitchen' | 'cancelled';
const MAIN_TABS: { value: MainTabValue; label: string; statuses?: OrderStatusType[] }[] = [
  { value: 'all', label: 'All Orders' },
  { value: 'active', label: 'Active', statuses: ['pending_customer_confirmation', 'pending_kitchen', 'confirmed_by_kitchen', 'preparing', 'ready_for_pickup', 'served', 'payment_pending'] },
  { value: 'pending_kitchen', label: 'Pending Kitchen', statuses: ['pending_kitchen', 'confirmed_by_kitchen'] }, 
  { value: 'cancelled', label: 'Cancelled', statuses: ['cancelled_by_customer', 'cancelled_by_restaurant'] },
];
const ALL_STATUSES_VALUE = "_all_";

