
// src/components/shared/billing-panel.tsx
import { useState, useMemo } from 'react';
import type { OrderItem, RestaurantProfile, MenuCategory, ClientOrder, OrderStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { MinusCircle, PlusCircle, Trash2, X, Utensils, ChevronDown, ChevronUp, Save, PackageOpen, Percent, Tag, Info } from 'lucide-react';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

interface BillingPanelProps {
  billItems: OrderItem[];
  restaurant: RestaurantProfile | null;
  categoryMap: Record<string, MenuCategory>;
  isLoading: boolean;
  onUpdateItemQuantity: (menuItemId: string, newQuantity: number) => void;
  onRemoveItem: (menuItemId: string) => void;
  onFinalize: (orderData: Partial<Pick<ClientOrder, 'customerName' | 'customerPhoneNumber' | 'customerWhatsapp' | 'email' | 'customerNotes' | 'kitchenNotes' | 'status' | 'tableNumber' | 'discountAmount' | 'serviceCharge' >> & { discountType?: 'percentage' | 'amount' }) => void;
  onClose?: () => void;
  onToggleMenuSelection?: () => void;
  isMenuSelectionOpen?: boolean;
  mode?: 'edit' | 'new';
  panelTitle?: string;
  showMenuButton?: boolean;
  showCloseButton?: boolean;
  finalizeLabel?: string;
  
  orderId?: string | null;
  orderCreatedAt?: string | null; 
  customerName?: string;
  setCustomerName?: (v: string) => void;
  customerPhoneNumber?: string;
  setCustomerPhoneNumber?: (v: string) => void;
  customerWhatsapp?: string;
  setCustomerWhatsapp?: (v: string) => void;
  email?: string;
  setEmail?: (v: string) => void;
  tableNumber?: string;
  setTableNumber?: (v: string) => void;
  customerNotes?: string;
  setCustomerNotes?: (v: string) => void;
  kitchenNotes?: string;
  setKitchenNotes?: (v: string) => void;
  orderStatus?: OrderStatus;
  setOrderStatus?: (v: OrderStatus) => void;
  orderStatusConfig?: Record<OrderStatus, { label: string; icon?: React.ElementType; color: string; shortLabel?: string }>;
  
  discountType?: 'percentage' | 'amount';
  setDiscountType?: (v: 'percentage' | 'amount') => void;
  discountValue?: number;
  setDiscountValue?: (v: number) => void;
  serviceChargeValue?: number;
  setServiceChargeValue?: (v: number) => void;
  
  view?: 'bill' | 'details';
}

import { calculateOrderTaxes } from '@/lib/taxEngine';

export default function BillingPanel({
  billItems,
  restaurant,
  categoryMap,
  isLoading,
  onUpdateItemQuantity,
  onRemoveItem,
  onFinalize,
  onClose,
  onToggleMenuSelection,
  isMenuSelectionOpen,
  mode = 'new',
  panelTitle = 'Bill',
  showMenuButton = true,
  showCloseButton = true,
  finalizeLabel = 'Finalize Bill',
  orderId,
  orderCreatedAt,
  customerName,
  setCustomerName,
  customerPhoneNumber,
  setCustomerPhoneNumber,
  customerWhatsapp,
  setCustomerWhatsapp,
  email,
  setEmail,
  tableNumber,
  setTableNumber,
  customerNotes,
  setCustomerNotes,
  kitchenNotes,
  setKitchenNotes,
  orderStatus,
  setOrderStatus,
  orderStatusConfig,
  discountType = 'amount', // Default discount type
  setDiscountType,
  discountValue = 0, // Default discount value
  setDiscountValue,
  serviceChargeValue = 0, // Default service charge
  setServiceChargeValue,
  view = 'bill',
}: BillingPanelProps) {
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);

  const subtotalFromItems = useMemo(() => billItems.reduce((sum, item) => sum + item.totalPrice, 0), [billItems]);

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
    if (restaurant && billItems.length > 0) {
      const itemsForTax = billItems.map(item => ({
        item: {
          id: item.menuItemId,
          itemIdString: item.menuItemId, 
          restaurantId: restaurant.id,
          categoryId: (item as any).categoryId || '',
          name: item.menuItemName,
          description: '',
          price: item.unitPrice, 
          availability: true,
          order: 0,
          createdAt: new Date() as any, 
          updatedAt: new Date() as any, 
          taxOverrides: (item as any).taxOverrides || undefined,
        },
        quantity: item.quantity,
      }));
      return calculateOrderTaxes({ items: itemsForTax, restaurant, categoryMap });
    }
    return { subtotal: 0, taxBreakup: [], totalTax: 0, total: 0 };
  }, [billItems, restaurant, categoryMap]);

  const finalGrandTotal = subtotalFromItems - calculatedDiscountAmount + calculatedServiceChargeAmount + totalTax;
  
  const handleFinalizeClick = () => {
    onFinalize({
      customerName,
      customerPhoneNumber,
      customerWhatsapp,
      email,
      customerNotes,
      kitchenNotes,
      status: orderStatus,
      tableNumber,
      discountAmount: calculatedDiscountAmount,
      serviceCharge: calculatedServiceChargeAmount,
      discountType: discountType,
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 pb-2 border-b">
        <h2 className="text-xl font-semibold text-primary">{panelTitle}</h2>
        <div className="flex items-center gap-2">
          {showMenuButton && onToggleMenuSelection && (
            <Button variant="outline" size="sm" onClick={onToggleMenuSelection} className="text-sm">
              {isMenuSelectionOpen ? <X className="h-4 w-4 mr-1" /> : <Utensils className="h-4 w-4 mr-1" />}
              {isMenuSelectionOpen ? 'Close Menu' : 'Add Items'}
            </Button>
          )}
          {showCloseButton && onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden">
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {view === 'details' ? (
        <ScrollArea className="flex-grow pr-1 mb-4">
        <div className="space-y-4">
          {orderId && (
            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
              <p><strong>Order ID:</strong> {orderId.substring(0,8)}...</p>
              {orderCreatedAt && <p><strong>Created:</strong> {orderCreatedAt}</p>}
            </div>
          )}
          {setCustomerName && (
            <div><Label htmlFor="customerName">Customer Name</Label><Input id="customerName" value={customerName || ''} onChange={e => setCustomerName(e.target.value)} placeholder="Optional" /></div>
          )}
          {setCustomerPhoneNumber && (
            <div><Label htmlFor="customerPhone">Phone</Label><Input id="customerPhone" value={customerPhoneNumber || ''} onChange={e => setCustomerPhoneNumber(e.target.value)} placeholder="Optional" /></div>
          )}
          {setCustomerWhatsapp && (
            <div><Label htmlFor="customerWhatsapp">WhatsApp</Label><Input id="customerWhatsapp" value={customerWhatsapp || ''} onChange={e => setCustomerWhatsapp(e.target.value)} placeholder="Optional (for updates)" /></div>
          )}
           {setEmail && (
            <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email || ''} onChange={e => setEmail(e.target.value)} placeholder="Optional (for receipt)" /></div>
          )}
          {setTableNumber && (
            <div><Label htmlFor="tableNumber">Table Number</Label><Input id="tableNumber" value={tableNumber || ''} onChange={e => setTableNumber(e.target.value)} placeholder="e.g., T5, Patio 2 (Optional)" /></div>
          )}
          {setOrderStatus && orderStatusConfig && (
            <div>
              <Label htmlFor="orderStatus">Order Status</Label>
              <Select value={orderStatus} onValueChange={(value) => setOrderStatus(value as OrderStatus)} disabled={isLoading}>
                <SelectTrigger id="orderStatus"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(orderStatusConfig).map(s => (
                    <SelectItem key={s} value={s}>{orderStatusConfig[s as OrderStatus].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {setCustomerNotes && (
            <div><Label htmlFor="customerNotes">Customer Notes</Label><Textarea id="customerNotes" value={customerNotes || ''} onChange={e => setCustomerNotes(e.target.value)} placeholder="Allergies, special requests for the order..." rows={2} /></div>
          )}
          {setKitchenNotes && (
            <div><Label htmlFor="kitchenNotes">Kitchen Notes</Label><Textarea id="kitchenNotes" value={kitchenNotes || ''} onChange={e => setKitchenNotes(e.target.value)} placeholder="Instructions for the kitchen team regarding this order..." rows={2} /></div>
          )}
          
          <Separator className="my-3"/>
          <h4 className="text-md font-semibold pt-2">Bill Adjustments</h4>
          {setDiscountType && setDiscountValue && (
            <div className="space-y-2 p-3 border rounded-md bg-background">
              <Label className="text-sm font-medium">Discount</Label>
              <div className="flex gap-2 items-center">
                <Select value={discountType || 'amount'} onValueChange={(v) => setDiscountType(v as 'percentage' | 'amount')} disabled={isLoading}>
                  <SelectTrigger className="h-9 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amount" className="text-xs">Amount (₹)</SelectItem>
                    <SelectItem value="percentage" className="text-xs">Percentage (%)</SelectItem>
                  </SelectContent>
                </Select>
                <Input 
                  type="number" 
                  value={discountValue || ''} 
                  onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)} 
                  placeholder="0" 
                  disabled={isLoading}
                  min="0"
                  step={discountType === 'percentage' ? '0.1' : '0.01'}
                  className="h-9 text-sm flex-grow"
                />
              </div>
              {calculatedDiscountAmount > 0 && <p className="text-xs text-green-600 pt-1">Discount Applied: -₹{calculatedDiscountAmount.toFixed(2)}</p>}
            </div>
          )}
          {setServiceChargeValue && (
            <div className="space-y-2 p-3 border rounded-md bg-background">
              <Label htmlFor="serviceCharge" className="text-sm font-medium">Service Charge (₹)</Label>
              <Input 
                id="serviceCharge" 
                type="number" 
                value={serviceChargeValue || ''} 
                onChange={e => setServiceChargeValue(parseFloat(e.target.value) || 0)} 
                placeholder="0.00" 
                disabled={isLoading}
                min="0"
                step="0.01"
                className="h-9 text-sm"
              />
               {calculatedServiceChargeAmount > 0 && <p className="text-xs text-blue-600 pt-1">Service Charge Added: +₹{calculatedServiceChargeAmount.toFixed(2)}</p>}
            </div>
          )}
           <div className="flex items-start p-3 border border-yellow-300 bg-yellow-50 rounded-md text-yellow-700 text-xs gap-2 mt-2">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Note: Tax is calculated on item prices. Order-level discounts and service charges are applied to the subtotal before/after tax based on restaurant settings (currently applied after item subtotal, before tax for discount, and then service charge & tax on items are summed).</span>
          </div>
        </div>
        </ScrollArea>
      ) : (
        <>
          <h3 className="text-lg font-medium mb-2 mt-2">Bill Items</h3>
          <ScrollArea className="flex-grow mb-4 border rounded-md p-1 bg-muted/20">
            {billItems.length > 0 ? billItems.map(item => (
              <Card key={item.uniqueId || item.menuItemId} className="mb-1 p-2 shadow-none border-b last:border-b-0 rounded-none bg-background">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{item.menuItemName}</p>
                    <p className="text-xs text-muted-foreground">₹{item.unitPrice.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUpdateItemQuantity(item.menuItemId, item.quantity - 1)} disabled={item.quantity <= 1 || isLoading}><MinusCircle className="h-4 w-4"/></Button>
                    <span className="w-5 text-center text-sm">{item.quantity}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUpdateItemQuantity(item.menuItemId, item.quantity + 1)} disabled={isLoading}><PlusCircle className="h-4 w-4"/></Button>
                    <p className="w-16 text-right font-medium text-sm">₹{item.totalPrice.toFixed(2)}</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onRemoveItem(item.menuItemId)} disabled={isLoading}><Trash2 className="h-4 w-4"/></Button>
                  </div>
                </div>
              </Card>
            )) : <p className="text-sm text-muted-foreground text-center py-8">No items in the bill yet.</p>}
          </ScrollArea>
        </>
      )}

      <div className="mt-auto border-t pt-4 space-y-2">
        <div className="flex justify-between text-sm font-medium"><span>Subtotal (Items):</span><span>₹{subtotalFromItems.toFixed(2)}</span></div>
        {calculatedDiscountAmount > 0 && (
          <div className="flex justify-between text-sm text-green-600"><span>Discount:</span><span>-₹{calculatedDiscountAmount.toFixed(2)}</span></div>
        )}
        {calculatedServiceChargeAmount > 0 && (
          <div className="flex justify-between text-sm text-blue-600"><span>Service Charge:</span><span>+₹{calculatedServiceChargeAmount.toFixed(2)}</span></div>
        )}

        {taxBreakup && taxBreakup.length > 0 ? (
          <div className="text-xs text-muted-foreground">
            <button
              type="button"
              className="flex justify-between items-center w-full font-semibold focus:outline-none"
              onClick={() => setShowTaxBreakdown(v => !v)}
              aria-expanded={showTaxBreakdown}
            >
              <span>Taxes</span>
              <span className="flex items-center gap-1">
                Total: ₹{totalTax.toFixed(2)}
                {showTaxBreakdown ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
              </span>
            </button>
            {showTaxBreakdown && (
              <div className="flex flex-col gap-0.5 mt-1 border-l pl-3">
                {taxBreakup.map((tax, idx) => (
                  <div key={tax.taxId + idx} className="flex justify-between text-xs text-muted-foreground">
                    <span>{tax.name} ({tax.rate}{tax.name.includes('GST') ? '%' : ''})</span>
                    <span>₹{tax.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-between text-sm text-muted-foreground"><span>Tax (Est.):</span><span>₹{totalTax.toFixed(2)}</span></div>
        )}
        <Separator className="my-2"/>
        <div className="flex justify-between text-xl font-bold text-primary"><span>Grand Total:</span><span>₹{finalGrandTotal.toFixed(2)}</span></div>
        
        <Button className="w-full mt-3 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleFinalizeClick} disabled={isLoading || (view === 'bill' && billItems.length === 0)}>
          {isLoading ? <LoadingSpinner className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
          {finalizeLabel}
        </Button>
      </div>
    </div>
  );
}
