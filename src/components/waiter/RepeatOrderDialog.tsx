
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { HistoricalOrder, OrderItem, MenuItem } from "@/lib/types";
import { format } from 'date-fns';
import { useOrders } from "@/contexts/waiter/OrderContext";
import { useToast } from "@/hooks/use-toast";
// Removed: import { ToastAction } from "@/components/ui/toast";
import { Clock, ShoppingCart, ListRestart, PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
// Removed: import { SUGGESTIONS_MAP } from '@/data/waiter/suggestions';
// Removed: import { MENU_ITEMS as ALL_MENU_ITEMS } from '@/data/waiter/menu';

interface RepeatOrderDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  tableId: string;
}

export function RepeatOrderDialog({
  isOpen,
  onOpenChange,
  tableId,
}: RepeatOrderDialogProps) {
  const { getHistoricalOrdersForTable, repeatOrder, addItemToOrder } = useOrders();
  const { toast } = useToast(); 
  const historicalOrders = getHistoricalOrdersForTable(tableId);

  // Removed showSuggestion function

  const handleRepeatEntireOrder = (items: OrderItem[]) => {
    repeatOrder(tableId, items); 
    toast({
      title: "Entire Order Repeated",
      description: "All items from the selected previous order have been added.",
    });
    // Suggestions are now handled in OrderForm, so removing suggestion logic here.
    onOpenChange(false); 
  };

  const handleAddSpecificItem = (item: OrderItem) => {
    addItemToOrder(tableId, item.menuItem, item.quantity, item.instructions, item.groupId);
    toast({
      title: "Item Added",
      description: `${item.menuItem.name} (x${item.quantity}) added to current order.`,
    });
    // Suggestions are now handled in OrderForm, so removing suggestion logic here.
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle>Repeat Previous Order</DialogTitle>
          <DialogDescription>
            Select a past order for Table {tableId.replace('t','')} to add its items or specific items to the current order.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] my-4">
          <div className="space-y-4 pr-4">
            {historicalOrders.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No previous orders found for this table.
              </p>
            ) : (
              historicalOrders.map((histOrder) => (
                <div key={histOrder.id} className="p-3 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {format(new Date(histOrder.completedAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total: ₹{histOrder.totalAmount.toFixed(2)} ({histOrder.items.reduce((acc, item) => acc + item.quantity, 0)} items)
                      </p>
                    </div>
                    <Button 
                      onClick={() => handleRepeatEntireOrder(histOrder.items)} 
                      size="sm" 
                      variant="outline"
                      className="rounded-full text-xs"
                    >
                      <ListRestart size={14} className="mr-1.5"/> Repeat All
                    </Button>
                  </div>
                  
                  <div className="space-y-2 mt-2 pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Items in this order:</p>
                    {histOrder.items.map((item, itemIdx) => (
                      <div key={`${histOrder.id}-item-${item.menuItem.id}-${itemIdx}`} className="flex justify-between items-center p-2 rounded-md bg-muted/30 hover:bg-muted/50">
                        <div>
                          <span className="text-sm text-foreground">{item.menuItem.name}</span>
                          <Badge variant="secondary" className="ml-1.5 text-xs">Qty: {item.quantity}</Badge>
                          {item.instructions && (
                            <p className="text-xs text-accent-foreground bg-accent/10 px-1.5 py-0.5 rounded inline-block mt-0.5 ml-1">
                              Note: {item.instructions}
                            </p>
                          )}
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 px-2 rounded-full text-primary hover:bg-primary/10"
                          onClick={() => handleAddSpecificItem(item)}
                          title={`Add ${item.menuItem.name} (x${item.quantity}) to current order`}
                        >
                          <PlusCircle size={16} className="mr-1"/> Add
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="w-full sm:w-auto rounded-full">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
