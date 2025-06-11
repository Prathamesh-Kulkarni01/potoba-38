
// src/components/shared/billing-panel.tsx
import { useState, useMemo, useEffect } from 'react';
import type { OrderItem, RestaurantProfile, MenuCategory, ClientOrder, OrderStatus, Table as FirebaseTableType, BillableSession, Waiter, OrderItemStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MinusCircle, PlusCircle, Trash2, X, Utensils, ChevronDown, ChevronUp, Save, Send, Eye, Info, Settings, Printer, Edit3, Tag } from 'lucide-react';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { calculateOrderTaxes } from '@/lib/taxEngine';
import { cn } from '@/lib/utils';
import { WAITERS_DATA } from '@/data/waiter/waiters'; 
import { EditInstructionsDialog } from '@/components/waiter/EditInstructionsDialog'; // Assuming this exists

interface BillingPanelProps {
  // Session and Item Data
  billableSessions?: BillableSession[];
  activeBillSessionKey: string | null;
  onSelectSession?: (sessionKey: string) => void;
  itemsForActiveSession: OrderItem[];
  restaurant: RestaurantProfile | null;
  categoryMap: Record<string, MenuCategory>;
  
  // Item Interaction Callbacks
  onUpdateItemQuantity: (menuItemId: string, newQuantity: number, itemUniqueId?: string) => void;
  onRemoveItem: (menuItemId: string, itemUniqueId?: string) => void;
  onEditItemInstructions: (item: OrderItem) => void; 

  // Order Lifecycle Callbacks
  onFinalize: (orderData: Partial<Pick<ClientOrder, 'customerName' | 'customerPhoneNumber' | 'customerWhatsapp' | 'email' | 'customerNotes' | 'kitchenNotes' | 'status' | 'tableNumber' | 'discountAmount' | 'serviceCharge' | 'paymentMethod' | 'transactionId'>> & { discountType?: 'percentage' | 'amount' }) => void;
  onSendToKOT?: () => void; 

  // UI Control
  isLoading: boolean;
  onClose?: () => void;
  onToggleMenuSelection?: () => void;
  isMenuSelectionOpen?: boolean;
  showMenuButton?: boolean;
  showCloseButton?: boolean;
  finalizeLabel?: string; 
  
  // Order/Customer Details (for the active session)
  customerName?: string;
  setCustomerName?: (v: string) => void;
  customerPhoneNumber?: string;
  setCustomerPhoneNumber?: (v: string) => void;
  customerWhatsapp?: string;
  setCustomerWhatsapp?: (v: string) => void;
  email?: string;
  setEmail?: (v: string) => void;
  
  // Notes
  customerNotes?: string;
  setCustomerNotes?: (v: string) => void;
  kitchenNotes?: string;
  setKitchenNotes?: (v: string) => void;
  
  // Financial Adjustments
  discountType?: 'percentage' | 'amount';
  setDiscountType?: (v: 'percentage' | 'amount') => void;
  discountValue?: number;
  setDiscountValue?: (v: number) => void;
  serviceChargeValue?: number;
  setServiceChargeValue?: (v: number) => void;
  paymentMethod?: ClientOrder['paymentMethod'];
  setPaymentMethod?: (v: ClientOrder['paymentMethod']) => void;
  transactionId?: string;
  setTransactionId?: (v: string) => void;

  // Table/Order Configuration (for 'Configure' tab)
  selectedTable?: FirebaseTableType | null;
  onUpdateTableStatus?: (tableId: string, newStatus: FirebaseTableType['status']) => void;
  onAssignWaiter?: (tableId: string, waiterId: string | null, waiterName: string | null) => void; // Updated to include name
  orderStatus?: OrderStatus | null; 
  setOrderStatus?: (v: OrderStatus) => void;
  orderStatusConfig?: Record<OrderStatus, { label: string; icon?: React.ElementType; color: string; shortLabel?: string }>;
  possibleNextStatuses?: OrderStatus[];
}


export default function BillingPanel({
  billableSessions,
  activeBillSessionKey,
  onSelectSession,
  itemsForActiveSession,
  restaurant,
  categoryMap,
  isLoading,
  onUpdateItemQuantity,
  onRemoveItem,
  onEditItemInstructions,
  onFinalize,
  onSendToKOT,
  onClose,
  onToggleMenuSelection,
  isMenuSelectionOpen,
  showMenuButton = true,
  showCloseButton = true,
  finalizeLabel = 'Settle Bill',
  customerName, setCustomerName,
  customerPhoneNumber, setCustomerPhoneNumber,
  customerWhatsapp, setCustomerWhatsapp,
  email, setEmail,
  customerNotes, setCustomerNotes,
  kitchenNotes, setKitchenNotes,
  discountType = 'amount', setDiscountType,
  discountValue = 0, setDiscountValue,
  serviceChargeValue = 0, setServiceChargeValue,
  paymentMethod, setPaymentMethod,
  transactionId, setTransactionId,
  selectedTable,
  onUpdateTableStatus,
  onAssignWaiter,
  orderStatus,
  setOrderStatus,
  orderStatusConfig,
  possibleNextStatuses,
}: BillingPanelProps) {
  const [activeMainTab, setActiveMainTab] = useState<'bill' | 'customer' | 'configure'>('bill');
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);

  const activeSessionData = useMemo(() => billableSessions?.find(s => s.key === activeBillSessionKey), [billableSessions, activeBillSessionKey]);

  const subtotalFromItems = useMemo(() => itemsForActiveSession.reduce((sum, item) => sum + item.totalPrice, 0), [itemsForActiveSession]);

  const calculatedDiscountAmount = useMemo(() => {
    if (discountType === 'percentage' && typeof discountValue === 'number') {
      return (subtotalFromItems * discountValue) / 100;
    }
    return typeof discountValue === 'number' ? discountValue : 0;
  }, [subtotalFromItems, discountType, discountValue]);
  
  const calculatedServiceChargeAmount = useMemo(() => {
    return typeof serviceChargeValue === 'number' ? serviceChargeValue : 0;
  }, [serviceChargeValue]);

  const { taxBreakup, totalTax } = useMemo(() => {
    if (restaurant && itemsForActiveSession.length > 0) {
      const itemsForTax = itemsForActiveSession.map(item => ({
        item: {
          id: item.menuItemId,
          itemIdString: item.menuItemId, 
          restaurantId: restaurant.id,
          categoryId: item.categoryId || '',
          name: item.menuItemName,
          description: '',
          price: item.unitPrice, 
          availability: true,
          order: 0,
          createdAt: new Date() as any, 
          updatedAt: new Date() as any, 
          taxOverrides: item.taxOverrides || undefined,
        },
        quantity: item.quantity,
      }));
      return calculateOrderTaxes({ items: itemsForTax, restaurant, categoryMap });
    }
    return { subtotal: 0, taxBreakup: [], totalTax: 0, total: 0 };
  }, [itemsForActiveSession, restaurant, categoryMap]);

  const finalGrandTotal = subtotalFromItems - calculatedDiscountAmount + calculatedServiceChargeAmount + totalTax;
  
  const handleFinalizeClick = () => {
    onFinalize({
      customerName, customerPhoneNumber, customerWhatsapp, email,
      customerNotes, kitchenNotes, status: orderStatus || undefined,
      tableNumber: selectedTable?.tableNumber, 
      discountAmount: calculatedDiscountAmount, serviceCharge: calculatedServiceChargeAmount,
      discountType: discountType, paymentMethod, transactionId
    });
  };

  return (
    <div className="flex flex-col h-full p-1 md:p-0">
      {showCloseButton && onClose && (
        <Button variant="ghost" size="icon" onClick={onClose} className="absolute top-3 right-3 md:hidden z-50">
            <X className="h-5 w-5" />
        </Button>
      )}
      {billableSessions && billableSessions.length > 1 && onSelectSession && (
        <ScrollArea className="w-full whitespace-nowrap pb-2 mb-2 border-b -mx-1 px-1">
            <div className="flex space-x-1.5">
            {billableSessions.map(session => (
                <Button
                key={session.key}
                variant={activeBillSessionKey === session.key ? "default" : "outline"}
                size="sm"
                onClick={() => onSelectSession(session.key)}
                className={cn("h-auto py-1 px-2 text-xs rounded-md leading-tight", activeBillSessionKey === session.key && "bg-primary text-primary-foreground")}
                >
                  <p className="font-semibold">{session.displayName}</p>
                  {session.orderId && <p className="text-xs opacity-80">ID: {session.orderId.substring(0,4)}...</p>}
                  <p className="text-xs opacity-80">₹{session.items.reduce((sum, i) => sum + i.totalPrice, 0).toFixed(2)}</p>
                </Button>
            ))}
            </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
      
      <div className="mb-2">
        <h2 className="text-lg font-semibold text-primary truncate">
            {activeSessionData?.displayName || (selectedTable ? `Table ${selectedTable.tableNumber}` : 'Current Order')}
        </h2>
        {activeSessionData?.orderId && <p className="text-xs text-muted-foreground">Order ID: {activeSessionData.orderId.substring(0,6)}...</p>}
        {activeSessionData?.createdAt && <p className="text-xs text-muted-foreground">Created: {typeof activeSessionData.createdAt === 'number' ? new Date(activeSessionData.createdAt).toLocaleTimeString() : activeSessionData.createdAt?.toString()}</p>}
      </div>


      <Tabs value={activeMainTab} onValueChange={(val) => setActiveMainTab(val as any)} className="w-full flex-grow flex flex-col">
        <TabsList className="grid w-full grid-cols-3 mb-2 h-9">
          <TabsTrigger value="bill" className="text-xs h-full">Bill ({itemsForActiveSession.length})</TabsTrigger>
          <TabsTrigger value="customer" className="text-xs h-full">Customer</TabsTrigger>
          <TabsTrigger value="configure" className="text-xs h-full">Configure</TabsTrigger>
        </TabsList>

        <TabsContent value="bill" className="flex-grow flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-sm font-medium">Items</h3>
            {showMenuButton && onToggleMenuSelection && (
              <Button variant="outline" size="xs" onClick={onToggleMenuSelection} className="h-7 px-2 text-xs">
                {isMenuSelectionOpen ? <X className="h-3 w-3 mr-1" /> : <Utensils className="h-3 w-3 mr-1" />}
                {isMenuSelectionOpen ? 'Close Menu' : 'Add Items'}
              </Button>
            )}
          </div>
          <ScrollArea className="flex-grow mb-2 border rounded-md p-1 bg-muted/20">
            {itemsForActiveSession.length > 0 ? itemsForActiveSession.map(item => (
              <Card key={item.uniqueId || item.menuItemId} className="mb-1 p-2 shadow-none border-b last:border-b-0 rounded-none bg-background">
                <div className="flex justify-between items-start">
                  <div className="flex-grow mr-2">
                    <p className="font-medium text-sm leading-tight">{item.menuItemName}</p>
                    <p className="text-xs text-muted-foreground">₹{item.unitPrice.toFixed(2)} each</p>
                    {item.variantChoices && item.variantChoices.length > 0 && (
                      <div className="text-xs text-muted-foreground/80 mt-0.5">
                        {item.variantChoices.map(vc => vc.optionName).join(' • ')}
                      </div>
                    )}
                    {item.dietaryTags && item.dietaryTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.dietaryTags.map(tag => (<Badge key={tag} variant="outline" className="text-xs px-1 py-0">{tag}</Badge>))}
                      </div>
                    )}
                    {item.instructions && (
                      <p className="text-xs text-accent bg-accent/10 px-1.5 py-0.5 rounded-sm mt-1 max-w-full break-words">
                        Note: {item.instructions}
                      </p>
                    )}
                  </div>
                  <p className="font-medium text-sm text-right min-w-[50px]">₹{item.totalPrice.toFixed(2)}</p>
                </div>
                <div className="flex items-center justify-end gap-0.5 mt-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => onEditItemInstructions?.(item)} title="Edit instructions"><Edit3 className="h-3.5 w-3.5"/></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUpdateItemQuantity(item.menuItemId, (item.quantity || 0) - 1, item.uniqueId)} disabled={(item.quantity || 0) <= 1 || isLoading}><MinusCircle className="h-4 w-4"/></Button>
                    <span className="w-5 text-center text-xs font-medium">{item.quantity}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUpdateItemQuantity(item.menuItemId, (item.quantity || 0) + 1, item.uniqueId)} disabled={isLoading}><PlusCircle className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onRemoveItem(item.menuItemId, item.uniqueId)} disabled={isLoading}><Trash2 className="h-4 w-4"/></Button>
                </div>
              </Card>
            )) : <p className="text-xs text-muted-foreground text-center py-4">No items in this session yet.</p>}
          </ScrollArea>
           <div className="space-y-1 text-sm mt-1">
            <div className="flex justify-between font-medium"><span>Subtotal:</span><span>₹{subtotalFromItems.toFixed(2)}</span></div>
            {setDiscountType && setDiscountValue && (
              <div className="flex items-center justify-between gap-1 text-xs">
                <Label htmlFor="discount-type-bill" className="whitespace-nowrap">Discount:</Label>
                <div className="flex items-center gap-1 flex-grow">
                  <Select value={discountType || 'amount'} onValueChange={(v) => setDiscountType(v as 'percentage' | 'amount')} disabled={isLoading}>
                    <SelectTrigger className="h-6 w-[70px] text-xs px-1 py-0"><SelectValue /></SelectTrigger>
                    <SelectContent> <SelectItem value="amount" className="text-xs">₹</SelectItem> <SelectItem value="percentage" className="text-xs">%</SelectItem> </SelectContent>
                  </Select>
                  <Input type="number" value={discountValue || ''} onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)} placeholder="0" disabled={isLoading} min="0" step={discountType === 'percentage' ? '0.1' : '0.01'} className="h-6 text-xs flex-grow"/>
                </div>
                <span className="text-xs text-green-600 min-w-[45px] text-right">-₹{calculatedDiscountAmount.toFixed(2)}</span>
              </div>
            )}
            {setServiceChargeValue && (
              <div className="flex items-center justify-between gap-1 text-xs">
                <Label htmlFor="service-charge-bill" className="whitespace-nowrap">Service Charge:</Label>
                <Input id="service-charge-bill" type="number" value={serviceChargeValue || ''} onChange={e => setServiceChargeValue(parseFloat(e.target.value) || 0)} placeholder="0.00" disabled={isLoading} min="0" step="0.01" className="h-6 text-xs flex-grow"/>
                <span className="text-xs text-blue-600 min-w-[45px] text-right">+₹{calculatedServiceChargeAmount.toFixed(2)}</span>
              </div>
            )}
             {taxBreakup && taxBreakup.length > 0 ? (
              <div className="text-xs">
                <button type="button" className="flex justify-between items-center w-full font-medium text-muted-foreground focus:outline-none" onClick={() => setShowTaxBreakdown(v => !v)} aria-expanded={showTaxBreakdown}>
                  <span>Taxes</span>
                  <span className="flex items-center gap-0.5">Total: ₹{totalTax.toFixed(2)}{showTaxBreakdown ? <ChevronUp className="h-3 w-3 ml-0.5" /> : <ChevronDown className="h-3 w-3 ml-0.5" />}</span>
                </button>
                {showTaxBreakdown && ( <div className="flex flex-col gap-0 mt-0.5 border-l pl-1.5 ml-0.5 text-[0.65rem]"> {taxBreakup.map((tax, idx) => ( <div key={tax.taxId + idx} className="flex justify-between text-muted-foreground/80"><span>{tax.name} ({tax.rate}{tax.name.includes('GST') ? '%' : ''})</span><span>₹{tax.amount.toFixed(2)}</span> </div> ))} </div> )}
              </div>
            ) : ( <div className="flex justify-between text-xs text-muted-foreground"><span>Tax (Est.):</span><span>₹{totalTax.toFixed(2)}</span></div> )}
            <Separator className="my-1"/>
            <div className="flex justify-between text-md font-bold text-primary"><span>Grand Total:</span><span>₹{finalGrandTotal.toFixed(2)}</span></div>
          </div>
          <div className="mt-2 space-y-1.5">
            <Label htmlFor="panelCustomerNotes" className="text-xs">Customer Notes</Label>
            <Textarea id="panelCustomerNotes" value={customerNotes || ''} onChange={e => setCustomerNotes?.(e.target.value)} placeholder="Order-specific requests from customer..." rows={1} className="text-xs leading-tight"/>
            <Label htmlFor="panelKitchenNotes" className="text-xs">Kitchen Notes</Label>
            <Textarea id="panelKitchenNotes" value={kitchenNotes || ''} onChange={e => setKitchenNotes?.(e.target.value)} placeholder="Internal notes for kitchen staff..." rows={1} className="text-xs leading-tight"/>
          </div>
        </TabsContent>

        <TabsContent value="customer" className="flex-grow overflow-y-auto pr-1 space-y-3">
            <h3 className="text-sm font-medium mb-1">Customer Details</h3>
            {setCustomerName && ( <div><Label htmlFor="panelCustomerName" className="text-xs">Name</Label><Input id="panelCustomerName" value={customerName || ''} onChange={e => setCustomerName(e.target.value)} placeholder="Optional" className="h-8 text-xs"/></div> )}
            {setCustomerPhoneNumber && ( <div><Label htmlFor="panelCustomerPhone" className="text-xs">Phone</Label><Input id="panelCustomerPhone" type="tel" value={customerPhoneNumber || ''} onChange={e => setCustomerPhoneNumber(e.target.value)} placeholder="Optional" className="h-8 text-xs"/></div> )}
            {setCustomerWhatsapp && ( <div><Label htmlFor="panelCustomerWhatsapp" className="text-xs">WhatsApp</Label><Input id="panelCustomerWhatsapp" type="tel" value={customerWhatsapp || ''} onChange={e => setCustomerWhatsapp(e.target.value)} placeholder="Optional (for updates)" className="h-8 text-xs"/></div> )}
            {setEmail && ( <div><Label htmlFor="panelEmail" className="text-xs">Email</Label><Input id="panelEmail" type="email" value={email || ''} onChange={e => setEmail(e.target.value)} placeholder="Optional (for receipt)" className="h-8 text-xs"/></div> )}
        </TabsContent>

        <TabsContent value="configure" className="flex-grow overflow-y-auto pr-1 space-y-3">
            <h3 className="text-sm font-medium mb-1">Order & Table Configuration</h3>
            {selectedTable && ( <div><Label className="text-xs">Table</Label><Input value={selectedTable.tableNumber} disabled className="h-8 text-xs bg-muted/50"/></div> )}
            {selectedTable && onUpdateTableStatus && (
                <div><Label htmlFor="tableStatusBill" className="text-xs">Table Status</Label>
                <Select value={selectedTable.status} onValueChange={(val) => onUpdateTableStatus(selectedTable.id, val as FirebaseTableType['status'])} disabled={isLoading}>
                    <SelectTrigger id="tableStatusBill" className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {(['available', 'occupied', 'reserved', 'needs_cleaning', 'paying'] as FirebaseTableType['status'][]).map(s => <SelectItem key={s} value={s} className="text-xs capitalize">{s.replace('_',' ')}</SelectItem>)}
                    </SelectContent>
                </Select></div>
            )}
            {selectedTable && onAssignWaiter && (
                <div><Label htmlFor="assignWaiterBill" className="text-xs">Assign Waiter</Label>
                <Select value={selectedTable.assignedWaiterId || "unassigned"} onValueChange={(val) => onAssignWaiter(selectedTable.id, val === "unassigned" ? null : val, WAITERS_DATA.find(w=>w.id===val)?.name || null)} disabled={isLoading}>
                    <SelectTrigger id="assignWaiterBill" className="h-8 text-xs"><SelectValue placeholder="Assign..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="unassigned" className="text-xs">Unassigned</SelectItem>
                        {WAITERS_DATA.map(w => <SelectItem key={w.id} value={w.id} className="text-xs">{w.name}</SelectItem>)}
                    </SelectContent>
                </Select></div>
            )}
            {activeSessionData?.orderId && orderStatus && setOrderStatus && orderStatusConfig && possibleNextStatuses && (
                <div><Label htmlFor="orderSessionStatusBill" className="text-xs">Order Session Status</Label>
                <Select value={orderStatus} onValueChange={(val) => setOrderStatus(val as OrderStatus)} disabled={isLoading || (possibleNextStatuses?.length === 0 && orderStatus !== 'completed')}>
                    <SelectTrigger id="orderSessionStatusBill" className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value={orderStatus} disabled className="text-xs">{orderStatusConfig[orderStatus]?.label} (Current)</SelectItem>
                        {possibleNextStatuses?.map(nextSt => <SelectItem key={nextSt} value={nextSt} className="text-xs">{orderStatusConfig[nextSt]?.label}</SelectItem>)}
                         {!['completed', 'cancelled_by_customer', 'cancelled_by_restaurant'].includes(orderStatus) && orderStatusConfig.completed && (
                            <SelectItem value="completed" className="text-xs">{orderStatusConfig.completed.label}</SelectItem>
                        )}
                    </SelectContent>
                </Select></div>
            )}
        </TabsContent>
      </Tabs>
      
      <div className="mt-auto border-t pt-2 space-y-1.5">
        <div className="grid grid-cols-2 gap-1.5">
            {onSendToKOT && <Button variant="outline" onClick={onSendToKOT} disabled={isLoading || !itemsForActiveSession.some(it => it.status === 'pending')} className="text-xs h-8 border-orange-500 text-orange-600 hover:bg-orange-50"><Send className="mr-1"/>Send to KOT</Button>}
            <Button variant="outline" disabled={isLoading} className="text-xs h-8"><Eye className="mr-1"/>View Bill</Button>
        </div>
        <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm h-10" onClick={handleFinalizeClick} disabled={isLoading || itemsForActiveSession.length === 0}>
          {isLoading ? <LoadingSpinner className="mr-1.5 h-4 w-4" /> : <Save className="mr-1.5 h-4 w-4" />}
          {finalizeLabel}
        </Button>
      </div>
    </div>
  );
}

    