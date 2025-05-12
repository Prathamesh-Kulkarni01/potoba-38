
// src/components/orders/order-bill-panel.tsx
'use client';

import { useState, useEffect } from 'react';
import type { ClientOrder, OrderItem, OrderStatus } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Utensils, PlusCircle, MinusCircle, Trash2, X, Save, PackageOpen } from 'lucide-react';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface OrderBillPanelProps {
  restaurantId: string;
  orderToEdit: ClientOrder | null;
  mode: 'edit' | 'new';
  currentBillItems: OrderItem[];
  isLoading: boolean;
  onUpdateItemQuantity: (menuItemId: string, newQuantity: number) => void;
  onRemoveItem: (menuItemId: string) => void;
  onSaveOrder: (updatedOrderData: Partial<ClientOrder>) => Promise<void>;
  onClose: () => void;
  onToggleMenuSelection: () => void;
  isMenuSelectionOpen: boolean;
  taxRate: number;
}

const OrderBillPanel = ({
  restaurantId,
  orderToEdit,
  mode,
  currentBillItems,
  isLoading,
  onUpdateItemQuantity,
  onRemoveItem,
  onSaveOrder,
  onClose,
  onToggleMenuSelection,
  isMenuSelectionOpen,
  taxRate,
}: OrderBillPanelProps) => {
  
  const [customerName, setCustomerName] = useState(orderToEdit?.customerName || '');
  const [customerPhoneNumber, setCustomerPhoneNumber] = useState(orderToEdit?.customerPhoneNumber || '');
  const [tableNumber, setTableNumber] = useState(orderToEdit?.tableNumber || '');
  const [customerNotes, setCustomerNotes] = useState(orderToEdit?.customerNotes || '');
  const [orderStatus, setOrderStatus] = useState<OrderStatus>(orderToEdit?.status || 'pending_kitchen');

  useEffect(() => {
    if (mode === 'edit' && orderToEdit) {
      setCustomerName(orderToEdit.customerName || '');
      setCustomerPhoneNumber(orderToEdit.customerPhoneNumber || '');
      setTableNumber(orderToEdit.tableNumber || '');
      setCustomerNotes(orderToEdit.customerNotes || '');
      setOrderStatus(orderToEdit.status);
    } else if (mode === 'new') {
      setCustomerName('');
      setCustomerPhoneNumber('');
      setTableNumber('');
      setCustomerNotes('');
      setOrderStatus('pending_kitchen');
    }
  }, [orderToEdit, mode]);

  const subtotal = currentBillItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const calculatedTaxAmount = subtotal * taxRate;
  const totalAmount = subtotal + calculatedTaxAmount;

  const handleSave = () => {
    const orderDataPayload: Partial<ClientOrder> = {
      customerName: customerName || null,
      customerPhoneNumber: customerPhoneNumber || null,
      tableNumber: tableNumber || null,
      customerNotes: customerNotes || undefined,
      status: orderStatus,
      // items, subtotal, taxAmount, totalAmount will be set by parent based on currentBillItems
    };
    onSaveOrder(orderDataPayload);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 pb-2 border-b">
        <h2 className="text-xl font-semibold text-primary flex items-center">
          {mode === 'edit' ? <Save className="mr-2 h-5 w-5"/> : <PackageOpen className="mr-2 h-5 w-5"/>}
          {mode === 'edit' ? `Edit Order #${orderToEdit?.id.substring(0,6)}` : 'Create New Order'}
        </h2>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onToggleMenuSelection} className="text-sm">
              {isMenuSelectionOpen ? <X className="h-4 w-4 mr-1" /> : <Utensils className="h-4 w-4 mr-1" />}
              {isMenuSelectionOpen ? 'Close Menu' : 'Add Items'}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8"> <X className="h-5 w-5" /> </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-grow mb-4 pr-2">
        <div className="space-y-3">
            {mode === 'new' && (
                <>
                    <div><Label htmlFor="custName">Customer Name</Label><Input id="custName" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Optional" /></div>
                    <div><Label htmlFor="custPhone">Phone</Label><Input id="custPhone" type="tel" value={customerPhoneNumber} onChange={e => setCustomerPhoneNumber(e.target.value)} placeholder="Optional" /></div>
                </>
            )}
             <div><Label htmlFor="tableNum">Table Number</Label><Input id="tableNum" value={tableNumber} onChange={e => setTableNumber(e.target.value)} placeholder="e.g., T5, Patio 2 (Optional)" /></div>
             <div>
                 <Label htmlFor="ordStatus">Order Status</Label>
                 <Select value={orderStatus} onValueChange={(val) => setOrderStatus(val as OrderStatus)}>
                     <SelectTrigger id="ordStatus"><SelectValue /></SelectTrigger>
                     <SelectContent>
                         {(Object.keys(orderStatusConfig) as OrderStatus[]).map(s => (
                            <SelectItem key={s} value={s} className="capitalize text-xs">{s.replace(/_/g, ' ')}</SelectItem>
                         ))}
                     </SelectContent>
                 </Select>
             </div>
            <div><Label htmlFor="custNotes">Customer Notes</Label><Textarea id="custNotes" value={customerNotes} onChange={e => setCustomerNotes(e.target.value)} placeholder="Allergies, special requests..." rows={2}/></div>
        </div>

        <h3 className="text-md font-medium mb-1 mt-4 text-muted-foreground">Order Items</h3>
        <div className="border rounded-md p-1 bg-muted/20">
            {currentBillItems.length > 0 ? currentBillItems.map(item => (
            <Card key={item.menuItemId} className="mb-1 p-2 shadow-none border-b last:border-b-0 rounded-none bg-background">
                <div className="flex justify-between items-center">
                <div> <p className="font-medium text-sm">{item.menuItemName}</p> <p className="text-xs text-muted-foreground">${item.unitPrice.toFixed(2)} each</p> </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUpdateItemQuantity(item.menuItemId, item.quantity - 1)} disabled={item.quantity <= 1 || isLoading}><MinusCircle className="h-4 w-4"/></Button>
                    <span className="w-5 text-center text-sm">{item.quantity}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUpdateItemQuantity(item.menuItemId, item.quantity + 1)} disabled={isLoading}><PlusCircle className="h-4 w-4"/></Button>
                    <p className="w-16 text-right font-medium text-sm">${item.totalPrice.toFixed(2)}</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onRemoveItem(item.menuItemId)} disabled={isLoading}><Trash2 className="h-4 w-4"/></Button>
                </div>
                </div>
            </Card>
            )) : <p className="text-sm text-muted-foreground text-center py-6">No items added yet.</p>}
        </div>
      </ScrollArea>

      <div className="mt-auto border-t pt-4 space-y-2">
        <div className="flex justify-between text-sm font-medium"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
        <div className="flex justify-between text-sm text-muted-foreground"><span>Tax ({(taxRate * 100).toFixed(0)}%):</span><span>${calculatedTaxAmount.toFixed(2)}</span></div>
        <div className="flex justify-between text-xl font-bold text-primary"><span>Total:</span><span>${totalAmount.toFixed(2)}</span></div>
        <Button className="w-full mt-3 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleSave} disabled={isLoading || currentBillItems.length === 0}>
          {isLoading ? <LoadingSpinner className="mr-2 h-4 w-4"/> : (mode === 'edit' ? 'Save Order Changes' : 'Place New Order')}
        </Button>
      </div>
    </div>
  );
};

export default OrderBillPanel;
