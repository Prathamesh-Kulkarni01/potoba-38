
// src/app/dashboard/orders/[restaurantId]/page.tsx
'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { getRestaurant } from '@/lib/firebase/firestore';
import { updateOrder, createOrder } from '@/lib/firebase/orders';
import { getOrdersCollectionPath, convertFirebaseTimestampToString } from '@/lib/firebase/utils';
import { getMenuItems as fetchMenuItemsFirebase, getMenuCategories, getMenuSubcategories } from '@/lib/firebase/menu';
import type { RestaurantProfile, OrderStatus as OrderStatusType, OrderItem, ClientOrder, MenuItem as MenuItemType, MenuCategory, MenuSubcategory } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Tabs, TabsContent } from "@/components/ui/tabs"; // TabsList and TabsTrigger moved to OrderFilters
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import type { DateRange } from "react-day-picker";
import { cn } from '@/lib/utils';
import { collection, query, where, orderBy, onSnapshot, Timestamp, QueryConstraint } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import MenuSelectionForBill from '@/components/table-management/menu-selection-for-bill';
import BillingPanel from '@/components/shared/billing-panel';

import OrderPageHeader from '@/components/dashboard/orders/OrderPageHeader';
import OrderFilters from '@/components/dashboard/orders/OrderFilters';
import OrderList from '@/components/dashboard/orders/OrderList';

const orderStatusConfig: Record<OrderStatusType, { label: string; icon?: React.ElementType; color: string; shortLabel?: string }> = {
  pending_customer_confirmation: { label: 'Pending Customer Confirmation', shortLabel: 'Pending Cust.', icon: undefined, color: 'text-yellow-600' },
  pending_kitchen: { label: 'Pending Kitchen Acceptance', shortLabel: 'Pending Kitchen', icon: undefined, color: 'text-yellow-600' },
  confirmed_by_kitchen: { label: 'Kitchen Confirmed', shortLabel: 'Kitchen Confirmed', icon: undefined, color: 'text-blue-600' },
  preparing: { label: 'Preparing', shortLabel: 'Preparing', icon: undefined, color: 'text-blue-600' },
  ready_for_pickup: { label: 'Ready for Pickup', shortLabel: 'Ready Pickup', icon: undefined, color: 'text-orange-600' },
  served: { label: 'Served', shortLabel: 'Served', icon: undefined, color: 'text-green-600' },
  payment_pending: { label: 'Payment Pending', shortLabel: 'Payment Pend.', icon: undefined, color: 'text-red-600' },
  completed: { label: 'Completed', shortLabel: 'Completed', icon: undefined, color: 'text-green-700' },
  cancelled_by_customer: { label: 'Cancelled by Customer', shortLabel: 'Cancelled (Cust)', icon: undefined, color: 'text-gray-500' },
  cancelled_by_restaurant: { label: 'Cancelled by Restaurant', shortLabel: 'Cancelled (Rest)', icon: undefined, color: 'text-gray-500' },
};

const ALL_STATUSES_VALUE = "_all_";

const DETAILED_STATUS_OPTIONS = (Object.keys(orderStatusConfig) as OrderStatusType[]).map(status => ({
  value: status,
  label: orderStatusConfig[status].label,
}));

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
    customerWhatsapp: typeof data.customerWhatsapp === 'string' ? data.customerWhatsapp : undefined, 
    email: typeof data.email === 'string' ? data.email : undefined, 
    groupId: typeof data.groupId === 'string' ? data.groupId : null,
    taxBreakup: data.taxBreakup || null,
  };
  return { id: docId, ...orderBase, createdAt: convertFirebaseTimestampToString(data.createdAt), updatedAt: convertFirebaseTimestampToString(data.updatedAt) };
};

type MainTabValue = 'active' | 'all' | 'pending_kitchen' | 'cancelled';
const MAIN_TABS: { value: MainTabValue; label: string; statuses?: OrderStatusType[] }[] = [
  { value: 'all', label: 'All Orders' },
  { value: 'active', label: 'Active', statuses: ['pending_customer_confirmation', 'pending_kitchen', 'confirmed_by_kitchen', 'preparing', 'ready_for_pickup', 'served', 'payment_pending'] },
  { value: 'pending_kitchen', label: 'Pending Kitchen', statuses: ['pending_kitchen', 'confirmed_by_kitchen'] }, 
  { value: 'cancelled', label: 'Cancelled', statuses: ['cancelled_by_customer', 'cancelled_by_restaurant'] },
];

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
  const [activeOrderEditTab, setActiveOrderEditTab] = useState<'bill' | 'details'>('bill');
  
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
    if (dateRange?.from) queryConstraints.push(where('createdAt', '>=', Timestamp.fromDate(startOfDay(dateRange.from))));
    if (dateRange?.to) queryConstraints.push(where('createdAt', '<=', Timestamp.fromDate(endOfDay(dateRange.to))));
    
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
    resetBillingPanelStates();
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
    setDiscountValue(order.discountAmount || 0);
    setDiscountType(order.discountAmount && order.totalAmount > 0 && order.subtotal > 0 ? ( (order.discountAmount / order.subtotal * 100) % 1 === 0 ? 'percentage' : 'amount' ) : 'amount' );
    setServiceChargeValue(order.serviceCharge || 0);
    setEditingMode('edit');
    setActiveOrderEditTab('bill');
    setIsOrderEditPanelVisible(true);
    setIsMenuSelectionForOrderOpen(false);
  };

  const handleOpenNewOrderPanel = () => {
    resetBillingPanelStates();
    setSelectedOrderToEdit(null);
    setEditingMode('new');
    setActiveOrderEditTab('details');
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
          uniqueId: `${menuItem.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
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
          subtotal: 0, 
          totalAmount: 0, 
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
              <OrderPageHeader
                restaurantName={restaurant?.name}
                tableIdFilter={tableIdFilter}
                onOpenNewOrderPanel={handleOpenNewOrderPanel}
                allFetchedOrders={allFetchedOrders} // Pass for table number display in description
                orderCount={displayedOrders.length}
              />
            </CardHeader>
            <CardContent className="flex-grow">
              <OrderFilters
                activeMainTab={activeMainTab}
                onActiveMainTabChange={setActiveMainTab}
                mainTabs={MAIN_TABS}
                detailedStatusFilter={detailedStatusFilter}
                onDetailedStatusFilterChange={setDetailedStatusFilter}
                detailedStatusOptions={DETAILED_STATUS_OPTIONS}
                allStatusesValue={ALL_STATUSES_VALUE}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                priceRange={priceRange}
                onPriceRangeChange={setPriceRange}
                onClearFilters={handleClearFilters}
                showFilters={showFilters}
                onToggleShowFilters={() => setShowFilters(!showFilters)}
              />
              <OrderList
                orders={displayedOrders}
                orderStatusConfig={orderStatusConfig}
                possibleNextStatuses={possibleNextStatuses}
                onOpenEditPanel={handleOpenEditPanel}
                onUpdateStatus={handleStatusChange}
                updatingOrderId={updatingOrderId}
                isLoading={pageLoading && displayedOrders.length === 0}
                sortConfig={sortConfig}
                onSort={handleSort}
              />
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
