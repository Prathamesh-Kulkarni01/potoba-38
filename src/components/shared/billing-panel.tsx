import { useState } from 'react';
import type { OrderItem, RestaurantProfile, MenuCategory, ClientOrder, OrderStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { MinusCircle, PlusCircle, Trash2, X, Utensils, ChevronDown, ChevronUp, Save, PackageOpen } from 'lucide-react';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface BillingPanelProps {
  billItems: OrderItem[];
  restaurant: RestaurantProfile | null;
  categoryMap: Record<string, MenuCategory>;
  isLoading: boolean;
  onUpdateItemQuantity: (menuItemId: string, newQuantity: number) => void;
  onRemoveItem: (menuItemId: string) => void;
  onFinalize: () => void;
  onClose?: () => void;
  onToggleMenuSelection?: () => void;
  isMenuSelectionOpen?: boolean;
  mode?: 'edit' | 'new';
  panelTitle?: string;
  showMenuButton?: boolean;
  showCloseButton?: boolean;
  finalizeLabel?: string;
  customerName?: string;
  setCustomerName?: (v: string) => void;
  customerPhoneNumber?: string;
  setCustomerPhoneNumber?: (v: string) => void;
  tableNumber?: string;
  setTableNumber?: (v: string) => void;
  customerNotes?: string;
  setCustomerNotes?: (v: string) => void;
  orderStatus?: OrderStatus;
  setOrderStatus?: (v: OrderStatus) => void;
  orderStatusConfig?: Record<OrderStatus, { label: string; icon?: React.ElementType; color: string; shortLabel?: string }>;
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
  customerName,
  setCustomerName,
  customerPhoneNumber,
  setCustomerPhoneNumber,
  tableNumber,
  setTableNumber,
  customerNotes,
  setCustomerNotes,
  orderStatus,
  setOrderStatus,
  orderStatusConfig,
  view = 'bill',
}: BillingPanelProps) {
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);
  const subtotal = billItems.reduce((sum, item) => sum + item.totalPrice, 0);
  let taxBreakup: any[] = [];
  let totalTax = 0;
  let totalAmount = subtotal;

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
    const result = calculateOrderTaxes({ items: itemsForTax, restaurant, categoryMap });
    taxBreakup = result.taxBreakup;
    totalTax = result.totalTax;
    totalAmount = result.total;
  }

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
        // Only show customer details form
        (setCustomerName || setCustomerPhoneNumber || setTableNumber || setCustomerNotes || setOrderStatus) && (
          <div className="space-y-3 mb-2">
            {setCustomerName && (
              <div><label className="text-xs">Customer Name</label><Input value={customerName || ''} onChange={e => setCustomerName(e.target.value)} placeholder="Optional" /></div>
            )}
            {setCustomerPhoneNumber && (
              <div><label className="text-xs">Phone</label><Input value={customerPhoneNumber || ''} onChange={e => setCustomerPhoneNumber(e.target.value)} placeholder="Optional" /></div>
            )}
            {setTableNumber && (
              <div><label className="text-xs">Table Number</label><Input value={tableNumber || ''} onChange={e => setTableNumber(e.target.value)} placeholder="e.g., T5, Patio 2 (Optional)" /></div>
            )}
            {setOrderStatus && orderStatusConfig && (
              <div>
                <label className="text-xs">Order Status</label>
                <select className="input input-sm w-full" value={orderStatus} onChange={e => setOrderStatus(e.target.value as OrderStatus)}>
                  {Object.keys(orderStatusConfig).map(s => (
                    <option key={s} value={s}>{orderStatusConfig[s as OrderStatus].label}</option>
                  ))}
                </select>
              </div>
            )}
            {setCustomerNotes && (
              <div><label className="text-xs">Customer Notes</label><Textarea value={customerNotes || ''} onChange={e => setCustomerNotes(e.target.value)} placeholder="Allergies, special requests..." rows={2} /></div>
            )}
          </div>
        )
      ) : (
        // Only show bill
        <>
          <h3 className="text-lg font-medium mb-2 mt-2">Current Bill Items</h3>
          <ScrollArea className="flex-grow mb-4 border rounded-md p-1 bg-muted/20">
            {billItems.length > 0 ? billItems.map(item => (
              <Card key={item.menuItemId} className="mb-1 p-2 shadow-none border-b last:border-b-0 rounded-none bg-background">
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
          <div className="mt-auto border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm font-medium"><span>Subtotal:</span><span>₹{subtotal.toFixed(2)}</span></div>
            {/* Collapsible Tax Breakup UI */}
            {taxBreakup && taxBreakup.length > 0 ? (
              <div className="flex flex-col gap-1 my-1">
                <button
                  type="button"
                  className="flex justify-between items-center w-full text-xs text-muted-foreground font-semibold focus:outline-none"
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
                  <div className="flex flex-col gap-1 mt-1 border-l pl-3">
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
              <div className="flex justify-between text-sm text-muted-foreground"><span>Tax:</span><span>₹0.00</span></div>
            )}
            <div className="flex justify-between text-xl font-bold text-primary"><span>Total:</span><span>₹{totalAmount.toFixed(2)}</span></div>
            <Button className="w-full mt-3 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={onFinalize} disabled={isLoading || billItems.length === 0}>
              {isLoading ? <LoadingSpinner className="mr-2 h-4 w-4" /> : finalizeLabel}
            </Button>
          </div>
        </>
      )}
    </div>
  );
} 