"use client";

import type { Table, OrderItem, HistoricalOrder } from '@/lib/types';
import { WAITERS_DATA } from '@/data/waiter/waiters';
import { useOrders } from '@/contexts/waiter/OrderContext';
import { OrderSummary } from '@/components/waiter/OrderSummary';
import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Users, Clock, ShoppingBag, Bookmark, UserCog, Trash2, History, Send, Percent, FileText, VenetianMask, CreditCard, Smartphone, DollarSign, StickyNote, Save, Star, ShieldQuestion } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNowStrict } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RepeatOrderDialog } from './RepeatOrderDialog';
import { cn } from '@/lib/utils';


interface OrderManagementProps {
  table: Table;
}

function formatElapsedTime(startTime: number | null): string {
  if (startTime === null) return 'N/A';
   try {
    return formatDistanceToNowStrict(new Date(startTime), { addSuffix: false, unit: 'minute' }).replace(' minutes', 'm').replace(' minute', 'm');
  } catch (error) {
    console.error("Error formatting date:", error);
    return 'N/A';
  }
}

function getTableDisplayName(table: Table | undefined | null): string {
  if (!table) return 'Unknown Table';
  if (table.name && typeof table.name === 'string' && table.name.trim() !== '') {
    return table.name.replace(/^Table\s*/i, '').trim();
  }
  if (table.tableNumber && typeof table.tableNumber === 'string' && table.tableNumber.trim() !== '') {
    return table.tableNumber;
  }
  if (table.id && typeof table.id === 'string') {
    return `ID: ${table.id.substring(0, 6)}`;
  }
  return 'Unnamed Table';
}


export function OrderManagement({ table }: OrderManagementProps) {
  const {
    getOrderForTable,
    addItemToOrder,
    updateItemQuantity,
    removeItemFromOrder,
    removeItemsByGroupId,
    updateItemStatus,
    updateItemInstructions,
    clearOrder,
    calculateTotal,
    getTableStatus,
    updateTableStatus,
    getTotalItemsForTable,
    getFirstItemAddedTime,
    assignWaiterToTable,
    clearWaiterAssignment,
    getAssignedWaiterInfo,
    archiveOrder,
    sendOrderToKitchen,
    getTableNote,
    updateTableNote,
  } = useOrders();
  const { toast } = useToast();

  const currentOrderItems = getOrderForTable(table.id);
  const tableStatus = getTableStatus(table.id);
  
  const assignedWaiterDetails = getAssignedWaiterInfo(table.id);
  const assignedWaiterId = assignedWaiterDetails?.waiterId;
  const assignedWaiter = WAITERS_DATA.find(w => w.id === assignedWaiterId);

  const isPaying = tableStatus === 'paying';


  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [showPreBillInfoStep, setShowPreBillInfoStep] = useState(false);
  const [showGroupSelectionForBill, setShowGroupSelectionForBill] = useState(false);
  const [billingScope, setBillingScope] = useState<'all' | string>('all'); 

  const [customerName, setCustomerName] = useState('');
  const [customerWhatsapp, setCustomerWhatsapp] = useState('');
  const [customerRating, setCustomerRating] = useState<number | null>(null);

  const [elapsedTime, setElapsedTime] = useState(formatElapsedTime(getFirstItemAddedTime(table.id)));
  const [showRepeatOrderDialog, setShowRepeatOrderDialog] = useState(false);

  const [taxRate, setTaxRate] = useState(10); // Default 10%
  const [serviceChargeRate, setServiceChargeRate] = useState(0); // Default 0%
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [discountValue, setDiscountValue] = useState(0);

  const [paymentOption, setPaymentOption] = useState<'single' | 'split' | 'perOrder'>('single');
  const [numberOfPersons, setNumberOfPersons] = useState(1);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<HistoricalOrder['paymentMethod']>('cash');
  const [currentTableNote, setCurrentTableNote] = useState('');


  const itemsForBilling = useMemo(() => {
    if (billingScope === 'all') {
      return currentOrderItems;
    }
    return currentOrderItems.filter(item => item.groupId === billingScope);
  }, [currentOrderItems, billingScope]);

  const subtotal = useMemo(() => calculateTotal(table.id, itemsForBilling), [table.id, itemsForBilling, calculateTotal]);
  const firstItemTime = useMemo(() => getFirstItemAddedTime(table.id), [table.id, getFirstItemAddedTime]); 

  const hasPendingItems = currentOrderItems.some(item => item.status === 'pending');
  const hasItemsSentOrFurther = currentOrderItems.some(item => item.status !== 'pending' && item.status !== 'served');


  const calculatedTaxAmount = useMemo(() => (subtotal * taxRate) / 100, [subtotal, taxRate]);
  const calculatedServiceChargeAmount = useMemo(() => (subtotal * serviceChargeRate) / 100, [subtotal, serviceChargeRate]);
  const calculatedDiscountAmount = useMemo(() => {
    if (discountType === 'percent') {
      return (subtotal * discountValue) / 100;
    }
    return discountValue;
  }, [subtotal, discountType, discountValue]);

  const grandTotal = useMemo(() => {
    return subtotal + calculatedTaxAmount + calculatedServiceChargeAmount - calculatedDiscountAmount;
  }, [subtotal, calculatedTaxAmount, calculatedServiceChargeAmount, calculatedDiscountAmount]);

  const amountPerPerson = useMemo(() => {
    if (numberOfPersons > 0 && paymentOption === 'split') {
      return grandTotal / numberOfPersons;
    }
    return grandTotal;
  }, [grandTotal, numberOfPersons, paymentOption]);


  useEffect(() => {
    if (currentOrderItems.length > 0 && (tableStatus === 'available' || tableStatus === 'reserved')) {
      updateTableStatus(table.id, 'occupied');
    }
  }, [currentOrderItems.length, table.id, tableStatus, updateTableStatus]);

  useEffect(() => {
    setElapsedTime(formatElapsedTime(firstItemTime));
    if (firstItemTime) {
      const timer = setInterval(() => {
        setElapsedTime(formatElapsedTime(firstItemTime));
      }, 1000 * 30);
      return () => clearInterval(timer);
    }
  }, [firstItemTime]);

  useEffect(() => {
    const note = getTableNote(table.id) || '';
    setCurrentTableNote(note);
  }, [table.id, getTableNote]);

  const areScopedItemsServed = (scope: 'all' | string, items: OrderItem[]): boolean => {
    const itemsInScope = scope === 'all'
        ? items
        : items.filter(item => item.groupId === scope);

    if (itemsInScope.length === 0) { 
        return false;
    }
    return itemsInScope.every(item => item.status === 'served');
  };


  const handleConfirmPayment = () => {
    const paymentNoteContent = billingScope === 'all' ? "Payment for Entire Table" : `Payment for Group: ${billingScope}`;
    archiveOrder(table.id, grandTotal, selectedPaymentMethod, paymentNoteContent);
    toast({
      title: "Payment Confirmed",
      description: `Table ${getTableDisplayName(table)} - ${paymentNoteContent}: ₹${grandTotal.toFixed(2)} via ${selectedPaymentMethod}.`,
    });

    if (billingScope === 'all') {
      clearOrder(table.id);
    } else {
      removeItemsByGroupId(table.id, billingScope);
    }

    setShowPaymentOptions(false);
    setShowPreBillInfoStep(false);
    setShowGroupSelectionForBill(false);
    setBillingScope('all');

    setTaxRate(10);
    setServiceChargeRate(0);
    setDiscountType('amount');
    setDiscountValue(0);
    setNumberOfPersons(1);
    setPaymentOption('single');
    setSelectedPaymentMethod('cash');
    setCustomerName('');
    setCustomerWhatsapp('');
    setCustomerRating(null);
  };

  const handleInitiatePayment = () => {
    if (currentOrderItems.length === 0) {
      toast({ title: "Empty Order", description: "Cannot process payment for an empty order.", variant: "destructive" });
      return;
    }

    const uniqueGroupIds = Array.from(new Set(currentOrderItems.map(item => item.groupId).filter(Boolean)));
    const hasMultipleExplicitGroups = uniqueGroupIds.length > 1;
    const hasGeneralItems = currentOrderItems.some(item => !item.groupId);
    const hasMixedGroups = (uniqueGroupIds.length >= 1 && hasGeneralItems) || hasMultipleExplicitGroups;


    if (hasMixedGroups && billingScope === 'all') { 
        setShowGroupSelectionForBill(true);
        setShowPreBillInfoStep(false);
        setShowPaymentOptions(false);
    } else {
        const currentTargetScope = billingScope === 'all' && uniqueGroupIds.length === 1 && !hasGeneralItems 
                                    ? uniqueGroupIds[0] 
                                    : billingScope;

        if (!areScopedItemsServed(currentTargetScope, currentOrderItems)) {
            toast({ title: "Unserved Items", description: `All items for ${currentTargetScope === 'all' ? 'the table' : 'group ' + currentTargetScope} must be 'served' before payment.`, variant: "destructive" });
            return;
        }
        updateTableStatus(table.id, 'paying');
        setShowGroupSelectionForBill(false); 
        setShowPreBillInfoStep(true);
        setShowPaymentOptions(false);
    }
  };

  const handleProceedFromGroupSelection = (selectedScope: 'all' | string) => {
    if (!areScopedItemsServed(selectedScope, currentOrderItems)) {
      toast({ title: "Unserved Items", description: `All items for ${selectedScope === 'all' ? 'the table' : 'group ' + selectedScope} must be 'served' before payment.`, variant: "destructive" });
      return; 
    }
    setBillingScope(selectedScope);
    updateTableStatus(table.id, 'paying'); 
    setShowGroupSelectionForBill(false);
    setShowPreBillInfoStep(true);
  };


  const handleCancelPaymentProcess = () => {
    setShowPaymentOptions(false);
    setShowPreBillInfoStep(false);
    setShowGroupSelectionForBill(false);

    const currentTableStatus = getTableStatus(table.id);
    if (currentTableStatus === 'paying') {
      if (currentOrderItems.length > 0) {
        updateTableStatus(table.id, 'occupied');
      } else if (getTableStatus(table.id) !== 'reserved') {
        updateTableStatus(table.id, 'available');
      }
    }
    setBillingScope('all'); 
    setCustomerName('');
    setCustomerWhatsapp('');
    setCustomerRating(null);
  };

  const handleProceedToBill = () => {
    console.log("Customer Info (optional):", { customerName, customerWhatsapp, customerRating });
    setShowPreBillInfoStep(false);
    setShowPaymentOptions(true);
  };


  const handleClearOrder = () => {
    clearOrder(table.id);
    toast({
        title: "Order Cleared",
        description: `All items for Table ${getTableDisplayName(table)} have been cleared.`,
    });
  };

  const handleSendToKitchen = () => {
    sendOrderToKitchen(table.id);
    toast({
      title: "Order Sent",
      description: `Pending items for Table ${getTableDisplayName(table)} sent to kitchen.`,
    });
  };

  const handleReserveToggle = () => {
    if (tableStatus === 'available' && currentOrderItems.length === 0) {
      updateTableStatus(table.id, 'reserved');
      toast({ title: `Table ${getTableDisplayName(table)} Reserved` });
    } else if (tableStatus === 'reserved' && currentOrderItems.length === 0) {
      updateTableStatus(table.id, 'available');
      toast({ title: `Table ${getTableDisplayName(table)} Unreserved` });
    }
  };

  const handleWaiterAssignmentChange = (newWaiterId: string) => {
    if (newWaiterId === "unassigned") {
      clearWaiterAssignment(table.id);
      toast({ title: `Waiter unassigned from Table ${getTableDisplayName(table)}` });
    } else {
      const selectedWaiter = WAITERS_DATA.find(w => w.id === newWaiterId);
      assignWaiterToTable(table.id, newWaiterId, selectedWaiter?.name || 'Unknown Waiter'); 
      toast({ title: `${selectedWaiter?.name || 'Waiter'} assigned to Table ${getTableDisplayName(table)}` });
    }
  };

  const handleSaveTableNote = () => {
    updateTableNote(table.id, currentTableNote);
    toast({
      title: "Note Saved",
      description: `Note for Table ${getTableDisplayName(table)} has been saved.`,
    });
  };

  const uniqueGroupIdsInOrder = Array.from(new Set(currentOrderItems.map(item => item.groupId).filter(Boolean)));


  return (
    <div className="space-y-6 pb-40">
      <div className="bg-card p-4 rounded-lg shadow grid grid-cols-2 sm:grid-cols-4 gap-2 text-center border">
        <div className="flex flex-col items-center">
          <Users size={20} className="text-accent mb-1" />
          <p className="text-xs text-muted-foreground">Guests</p>
          <p className="text-sm font-semibold text-foreground">{table.capacity} / {table.capacity}</p>
        </div>
        <div className="flex flex-col items-center">
          <Clock size={20} className="text-accent mb-1" />
          <p className="text-xs text-muted-foreground">Time</p>
          <p className="text-sm font-semibold text-foreground">{elapsedTime === 'N/A' ? '0m' : `${elapsedTime}`}</p>
        </div>
        <div className="flex flex-col items-center">
          <ShoppingBag size={20} className="text-accent mb-1" />
          <p className="text-xs text-muted-foreground">Items</p>
          <p className="text-sm font-semibold text-foreground">{getTotalItemsForTable(table.id, currentOrderItems)}</p>
        </div>
        <div className="flex flex-col items-center">
          <UserCog size={20} className="text-accent mb-1" />
           <p className="text-xs text-muted-foreground">Waiter</p>
           <Select onValueChange={handleWaiterAssignmentChange} defaultValue={assignedWaiterId || "unassigned"}>
            <SelectTrigger className="text-xs sm:text-sm h-7 px-2 border-0 focus:ring-0 shadow-none data-[placeholder]:text-muted-foreground/70 w-full max-w-[100px] truncate">
              <SelectValue placeholder="Assign Waiter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {WAITERS_DATA.map(waiter => (
                <SelectItem key={waiter.id} value={waiter.id}>{waiter.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <StickyNote size={20} className="text-accent"/> Table Notes
          </CardTitle>
          <CardDescription>Add or view special notes for this table.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="e.g., Customer prefers window seat, allergies, VIP..."
            value={currentTableNote}
            onChange={(e) => setCurrentTableNote(e.target.value)}
            className="min-h-[80px] text-sm"
          />
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveTableNote} size="sm" className="rounded-full">
            <Save size={16} className="mr-2" /> Save Note
          </Button>
        </CardFooter>
      </Card>

      <div className="flex flex-col sm:flex-row gap-2">
        {currentOrderItems.length === 0 && tableStatus === 'available' && (
            <Button onClick={handleReserveToggle} variant="outline" className="w-full rounded-full">
            <Bookmark className="mr-2 h-4 w-4" /> Reserve Table
            </Button>
        )}
        {currentOrderItems.length === 0 && tableStatus === 'reserved' && (
            <Button onClick={handleReserveToggle} variant="outline" className="w-full rounded-full">
            <Bookmark className="mr-2 h-4 w-4 fill-current" /> Unreserve Table
            </Button>
        )}
        <Button
            onClick={() => setShowRepeatOrderDialog(true)}
            variant="outline"
            className="w-full rounded-full"
            disabled={isPaying}
        >
            <History className="mr-2 h-4 w-4" /> Repeat Order
        </Button>
      </div>

      {showGroupSelectionForBill ? (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-xl flex items-center justify-center gap-2">
              <ShieldQuestion size={24} className="text-accent" /> Who is this bill for?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={billingScope}
              onValueChange={(value) => setBillingScope(value as 'all' | string)}
              className="space-y-2"
            >
              <Label
                htmlFor="bill-all"
                className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 has-[input:checked]:bg-primary/10 has-[input:checked]:border-primary transition-colors cursor-pointer"
              >
                <RadioGroupItem value="all" id="bill-all" />
                <span>Entire Table</span>
              </Label>
              {uniqueGroupIdsInOrder.map(groupId => (
                <Label
                  key={groupId}
                  htmlFor={`bill-group-${groupId}`}
                  className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 has-[input:checked]:bg-primary/10 has-[input:checked]:border-primary transition-colors cursor-pointer"
                >
                  <RadioGroupItem value={groupId} id={`bill-group-${groupId}`} />
                  <span>Group: {groupId}</span>
                </Label>
              ))}
            </RadioGroup>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button onClick={handleCancelPaymentProcess} variant="outline" className="w-full sm:w-auto rounded-full">Cancel</Button>
            <Button onClick={() => handleProceedFromGroupSelection(billingScope)} className="w-full sm:w-auto rounded-full">Proceed</Button>
          </CardFooter>
        </Card>
      ) : showPreBillInfoStep ? (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-xl">Customer Information (Optional)</CardTitle>
            <CardDescription className="text-center">Collect customer details and rating before proceeding to bill for {billingScope === 'all' ? 'the entire table' : `Group: ${billingScope}`}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="customerName">Customer Name</Label>
              <Input id="customerName" placeholder="Enter name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="mt-1 h-10" />
            </div>
            <div>
              <Label htmlFor="customerWhatsapp">WhatsApp Number</Label>
              <Input id="customerWhatsapp" type="tel" placeholder="Enter WhatsApp number" value={customerWhatsapp} onChange={(e) => setCustomerWhatsapp(e.target.value)} className="mt-1 h-10" />
            </div>
            <div>
              <Label>Quick Rating</Label>
              <div className="flex space-x-1 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "h-8 w-8 cursor-pointer",
                      customerRating && star <= customerRating ? "fill-accent text-accent" : "text-muted-foreground hover:text-accent/70"
                    )}
                    onClick={() => setCustomerRating(star)}
                  />
                ))}
                {customerRating && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 ml-2" onClick={() => setCustomerRating(null)}>
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button onClick={handleCancelPaymentProcess} variant="outline" className="w-full sm:w-auto rounded-full">Cancel</Button>
            <Button onClick={handleProceedToBill} variant="outline" className="w-full sm:w-auto rounded-full">Skip &amp; Proceed to Bill</Button>
            <Button onClick={handleProceedToBill} className="w-full sm:w-auto rounded-full">Proceed to Bill</Button>
          </CardFooter>
        </Card>
      ) : showPaymentOptions ? (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-xl flex items-center justify-center gap-2">
              <FileText size={24} /> Bill Summary - Table {getTableDisplayName(table)} {billingScope !== 'all' ? `(Group: ${billingScope})` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-40 overflow-y-auto space-y-1 border p-2 rounded-md bg-muted/30 mb-3">
                {itemsForBilling.map(item => (
                    <div key={item.uniqueId} className="flex justify-between items-center text-sm py-0.5">
                        <span className="truncate max-w-[60%]">{item.quantity}x {item.menuItem?.name || 'Unknown Item'}</span>
                        <span>₹{((item.menuItem?.price || 0) * item.quantity).toFixed(2)}</span>
                    </div>
                ))}
                 {itemsForBilling.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">No items for this selection.</p>}
            </div>

            <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                    <Label htmlFor="subtotalView">Subtotal:</Label>
                    <span id="subtotalView" className="font-medium">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Label htmlFor="taxRate" className="min-w-[120px]">Tax Rate (%):</Label>
                    <Input id="taxRate" type="number" value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} className="h-10"/>
                    <span className="text-sm min-w-[60px] text-right">₹{calculatedTaxAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Label htmlFor="serviceChargeRate" className="min-w-[120px]">Service Charge (%):</Label>
                    <Input id="serviceChargeRate" type="number" value={serviceChargeRate} onChange={e => setServiceChargeRate(parseFloat(e.target.value) || 0)} className="h-10"/>
                    <span className="text-sm min-w-[60px] text-right">₹{calculatedServiceChargeAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                      <Label htmlFor="discountType" className="min-w-[120px]">Discount:</Label>
                    <Select value={discountType} onValueChange={(value) => setDiscountType(value as 'amount' | 'percent')}>
                        <SelectTrigger className="h-10 w-[100px]"> <SelectValue /> </SelectTrigger>
                        <SelectContent> <SelectItem value="amount">₹</SelectItem> <SelectItem value="percent">%</SelectItem> </SelectContent>
                    </Select>
                    <Input id="discountValue" type="number" value={discountValue} onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)} className="h-10 flex-grow"/>
                    <span className="text-sm min-w-[60px] text-right text-red-600">-₹{calculatedDiscountAmount.toFixed(2)}</span>
                </div>
            </div>
            <Separator/>
              <div className="flex justify-between text-lg font-bold">
                <span>Grand Total:</span>
                <span>₹{grandTotal.toFixed(2)}</span>
            </div>

            <Separator/>
            <div className="pt-2 space-y-2">
                <Label className="font-semibold text-base">Payment Method</Label>
                <RadioGroup value={selectedPaymentMethod} onValueChange={(val) => setSelectedPaymentMethod(val as HistoricalOrder['paymentMethod'])} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                        { value: 'cash', label: 'Cash', icon: DollarSign },
                        { value: 'card', label: 'Card', icon: CreditCard },
                        { value: 'upi', label: 'UPI', icon: Smartphone },
                        { value: 'wallet', label: 'Wallet', icon: VenetianMask },
                    ].map(method => (
                        <div key={method.value}>
                            <RadioGroupItem value={method.value} id={`payment-${method.value}`} className="sr-only" />
                            <Label
                                htmlFor={`payment-${method.value}`}
                                className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer transition-colors h-full"
                            >
                                <method.icon className="mb-2 h-6 w-6" />
                                {method.label}
                            </Label>
                        </div>
                    ))}
                </RadioGroup>
            </div>


            <Separator/>
            <Label className="font-semibold text-base pt-2 block">Payment Splitting</Label>
            <RadioGroup defaultValue="single" value={paymentOption} onValueChange={(value) => setPaymentOption(value as 'single' | 'split' | 'perOrder')} className="space-y-2 pt-1">
                <div className="flex items-center space-x-2 p-2.5 border rounded-md hover:bg-muted/50 has-[input:checked]:bg-primary/10 has-[input:checked]:border-primary transition-colors">
                <RadioGroupItem value="single" id="single" />
                <Label htmlFor="single" className="flex-1 cursor-pointer text-sm">Single Payment</Label>
                </div>
                <div className="flex items-center space-x-2 p-2.5 border rounded-md hover:bg-muted/50 has-[input:checked]:bg-primary/10 has-[input:checked]:border-primary transition-colors">
                <RadioGroupItem value="split" id="split" />
                <Label htmlFor="split" className="flex-1 cursor-pointer text-sm">Split Equally</Label>
                </div>
                  {paymentOption === 'split' && (
                    <div className="pl-8 pt-1 pb-2 space-y-2">
                        <div className="flex items-center gap-2">
                            <Label htmlFor="numberOfPersons" className="text-sm">Number of Persons:</Label>
                            <Input id="numberOfPersons" type="number" min="1" value={numberOfPersons} onChange={e => setNumberOfPersons(parseInt(e.target.value) || 1)} className="h-10 w-20"/>
                        </div>
                        <div className="flex justify-between text-sm font-medium">
                            <span>Amount per Person:</span>
                            <span>₹{amountPerPerson.toFixed(2)}</span>
                        </div>
                    </div>
                )}
                <div className="flex items-center space-x-2 p-2.5 border rounded-md hover:bg-muted/50 has-[input:checked]:bg-primary/10 has-[input:checked]:border-primary transition-colors opacity-60 cursor-not-allowed">
                <RadioGroupItem value="perOrder" id="perOrder" disabled />
                <Label htmlFor="perOrder" className="flex-1 cursor-not-allowed text-sm">Pay as Per Order (Itemized - Coming Soon)</Label>
                </div>
            </RadioGroup>

            <div className="flex flex-col sm:flex-row gap-2 pt-3">
                <Button onClick={handleCancelPaymentProcess} variant="outline" className="w-full rounded-full" size="lg">
                    Cancel
                </Button>
                <Button onClick={handleConfirmPayment} className="w-full rounded-full" size="lg" disabled={itemsForBilling.length === 0}>
                    Finalize Payment
                </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <OrderSummary
            tableId={table.id}
            orderItems={currentOrderItems}
            onUpdateQuantity={updateItemQuantity}
            onRemoveItem={removeItemFromOrder}
            onUpdateStatus={updateItemStatus}
            onUpdateInstructions={updateItemInstructions}
            onAddItem={addItemToOrder}
            isPaying={isPaying}
        />
      )}


      {!showPreBillInfoStep && !showPaymentOptions && !showGroupSelectionForBill && (
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 bg-background p-4 border-t shadow-lg z-30">
          <div className="container mx-auto px-0 md:px-4">
            <div className="flex justify-between items-center mb-3">
                <div>
                    <span className="text-sm text-muted-foreground">Current Subtotal: </span>
                    <span className="text-lg font-semibold text-foreground">₹{calculateTotal(table.id, currentOrderItems).toFixed(2)}</span>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild variant="outline" className="flex-1 rounded-full" size="lg" disabled={isPaying || hasItemsSentOrFurther }>
                  <Link href={`/waiter/order/${table.id}/add-item`}>Add Items</Link>
                </Button>
                {hasPendingItems && !isPaying && (
                  <Button onClick={handleSendToKitchen} variant="outline" className="flex-1 rounded-full border-accent text-accent hover:bg-accent/10" size="lg">
                      <Send className="mr-2 h-4 w-4" /> Send to Kitchen
                    </Button>
                )}
                <Button onClick={handleInitiatePayment} className="flex-1 rounded-full" size="lg"
                  disabled={currentOrderItems.length === 0 || isPaying}
                >
                  Generate Bill &amp; Payment
                </Button>
            </div>
               {currentOrderItems.length > 0 && !hasItemsSentOrFurther && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                        variant="outline"
                        className="w-full rounded-full mt-2 border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={isPaying || hasItemsSentOrFurther}
                        size="lg"
                      >
                      <Trash2 className="mr-2 h-4 w-4" /> Clear Current Order
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action will remove all items from the current order for Table {getTableDisplayName(table)}. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearOrder} className="bg-destructive hover:bg-destructive/90">
                        Clear Order
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
          </div>
        </div>
      )}
      <RepeatOrderDialog
        isOpen={showRepeatOrderDialog}
        onOpenChange={setShowRepeatOrderDialog}
        tableId={table.id}
      />
    </div>
  );
}

