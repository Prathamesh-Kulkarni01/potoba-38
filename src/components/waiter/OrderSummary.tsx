
"use client";

import type { OrderItem, MenuItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Plus, Minus, Trash2, CheckCircle, Circle, ShoppingBag, Edit3, ChefHat, Bell, RotateCcw, PlusCircle, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { EditInstructionsDialog } from './EditInstructionsDialog';
import Link from 'next/link'; // Import Link


interface OrderSummaryProps {
  tableId: string;
  orderItems: OrderItem[];
  onUpdateQuantity: (tableId: string, menuItemId: string, quantity: number, itemInstructions?: string, itemUniqueId?: string) => void;
  onRemoveItem: (tableId: string, menuItemId: string, itemUniqueId?: string) => void;
  onUpdateStatus: (tableId: string, menuItemId: string, status: OrderItem['status'], itemUniqueId?: string) => void;
  onUpdateInstructions: (tableId: string, menuItemId: string, instructions: string, itemUniqueId?: string) => void;
  onAddItem: (tableId: string, menuItem: MenuItem, quantity: number, instructions?: string, groupId?: string) => void;
  isPaying: boolean;
}

const getStatusInfo = (status: OrderItem['status']) => {
  switch (status) {
    case 'pending':
      return { text: 'Pending', color: 'text-yellow-600', iconColor: 'fill-yellow-500 text-yellow-500', Icon: Circle };
    case 'sent_to_kitchen':
      return { text: 'Sent to Kitchen', color: 'text-blue-600', iconColor: 'fill-blue-500 text-blue-500', Icon: Circle };
    case 'ready_for_pickup':
      return { text: 'Ready for Pickup', color: 'text-purple-600', iconColor: 'fill-purple-500 text-purple-500', Icon: Bell };
    case 'served':
      return { text: 'Served', color: 'text-green-600', iconColor: 'fill-green-500 text-green-100', Icon: CheckCircle };
    default:
      return { text: 'Unknown', color: 'text-gray-500', iconColor: 'fill-gray-400 text-gray-400', Icon: Circle };
  }
};


export function OrderSummary({
    tableId,
    orderItems,
    onUpdateQuantity,
    onRemoveItem,
    onUpdateStatus,
    onUpdateInstructions,
    onAddItem,
    isPaying,
}: OrderSummaryProps) {
  const { toast } = useToast();
  const [isInstructionsDialogOpen, setIsInstructionsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null);

  if (orderItems.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <ShoppingBag className="mx-auto h-12 w-12 opacity-50 mb-2" />
        No items in the order yet. <br/> Start by adding items to this table.
      </div>
    );
  }

  const handleUpdateQuantityInternal = (item: OrderItem, change: number) => {
    if (isPaying || item.status !== 'pending') return;
    const newQuantity = item.quantity + change;
    if (newQuantity >= 0) {
      onUpdateQuantity(tableId, item.menuItem.id, newQuantity, item.instructions, item.uniqueId);
      if (newQuantity === 0) {
        toast({
          title: "Item Removed",
          description: `${item.menuItem?.name || 'Item'} removed from order.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Quantity Updated",
          description: `Quantity for ${item.menuItem?.name || 'Item'} set to ${newQuantity}.`,
        });
      }
    }
  };

  const handleRemoveItemInternal = (item: OrderItem) => {
    if (isPaying || item.status !== 'pending') return;
    onRemoveItem(tableId, item.menuItem.id, item.uniqueId);
    toast({
      title: "Item Removed",
      description: `${item.menuItem?.name || 'Item'} removed from order.`,
      variant: "destructive"
    });
  };

  const handleUpdateStatusInternal = (item: OrderItem, newStatus: OrderItem['status']) => {
    if (isPaying) return;
    onUpdateStatus(tableId, item.menuItem.id, newStatus, item.uniqueId);
    toast({
      title: "Status Updated",
      description: `${item.menuItem?.name || 'Item'} marked as ${getStatusInfo(newStatus).text.toLowerCase()}.`,
    });
  };

  const openEditInstructionsDialog = (item: OrderItem) => {
    if (isPaying || item.status !== 'pending') return;
    setEditingItem(item);
    setIsInstructionsDialogOpen(true);
  };

  const handleSaveInstructions = (instructions: string) => {
    if (editingItem) {
      onUpdateInstructions(tableId, editingItem.menuItem.id, instructions, editingItem.uniqueId);
      toast({
        title: "Instructions Updated",
        description: `Instructions for ${editingItem.menuItem?.name || 'Item'} saved.`,
      });
    }
    setEditingItem(null);
  };

  const handleRepeatItemClick = (itemToRepeat: OrderItem) => {
    if (isPaying) return;
    onAddItem(tableId, itemToRepeat.menuItem, 1, itemToRepeat.instructions, itemToRepeat.groupId);
    toast({
      title: "Item Repeated",
      description: `${itemToRepeat.menuItem?.name || 'Item'} (x1) added to order ${itemToRepeat.groupId ? `for group ${itemToRepeat.groupId}` : ''}.`,
    });
  };

  const groupedItems = orderItems.reduce((acc, item) => {
    const groupId = item.groupId || 'general';
    if (!acc[groupId]) {
      acc[groupId] = [];
    }
    acc[groupId].push(item);
    return acc;
  }, {} as Record<string, OrderItem[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedItems).map(([groupId, itemsInGroup]) => (
        <Card key={groupId} className="shadow-md overflow-hidden">
          <CardHeader className="bg-muted/30 p-3 border-b flex flex-row justify-between items-center">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users size={16} className="text-accent"/>
              {groupId === 'general' ? 'General Table Order' : `Group: ${groupId}`}
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="h-8 px-2.5 rounded-full text-primary hover:bg-primary/10" disabled={isPaying}>
              <Link href={`/waiter/order/${tableId}/add-item?groupId=${groupId === 'general' ? '' : groupId}`}>
                <PlusCircle size={16} className="mr-1" /> Add to Group
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-0">
              {itemsInGroup.map((item) => {
                const statusInfo = getStatusInfo(item.status);
                const canModifyItemDetails = item.status === 'pending' && !isPaying;
                const itemPrice = item.menuItem?.price ?? 0;
                const itemQuantity = item.quantity ?? 0;
                const itemName = item.menuItem?.name || 'Unknown Item';

                return (
                  <div key={item.uniqueId || `${item.menuItem?.id || 'no-id'}-${item.createdAt || Date.now()}`} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b last:border-b-0">
                    <div className="flex-grow mb-3 sm:mb-0">
                      <div className="flex justify-between items-baseline">
                        <p className="font-semibold text-foreground">{itemName}</p>
                        <p className="text-base font-semibold text-foreground sm:hidden">₹{(itemPrice * itemQuantity).toFixed(2)}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">₹{itemPrice.toFixed(2)} each</p>
                      {item.instructions && (
                        <p className="text-xs text-accent-foreground bg-accent/10 px-2 py-1 rounded-md mt-1 inline-block max-w-full break-words">
                          Note: {item.instructions}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={cn("text-xs flex items-center", statusInfo.color)}>
                            <statusInfo.Icon size={12} className={cn("mr-1", statusInfo.iconColor)} /> {statusInfo.text}
                        </span>
                        {item.status === 'pending' && !isPaying && (
                          <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-8 px-2.5 border-blue-500 text-blue-600 hover:bg-blue-500/10"
                              onClick={() => handleUpdateStatusInternal(item, 'sent_to_kitchen')}
                          >
                              Mark Sent
                          </Button>
                        )}
                        {item.status === 'sent_to_kitchen' && !isPaying && (
                          <>
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-8 px-2.5 border-purple-500 text-purple-600 hover:bg-purple-500/10"
                                onClick={() => handleUpdateStatusInternal(item, 'ready_for_pickup')}
                            >
                                <ChefHat size={12} className="mr-1" /> Mark Ready
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-8 px-2.5 text-muted-foreground hover:text-yellow-600"
                                onClick={() => handleUpdateStatusInternal(item, 'pending')}
                            >
                                <RotateCcw size={12} className="mr-1" /> Revert to Pending
                            </Button>
                          </>
                        )}
                        {item.status === 'ready_for_pickup' && !isPaying && (
                          <>
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-8 px-2.5 border-green-500 text-green-600 hover:bg-green-500/10"
                                onClick={() => handleUpdateStatusInternal(item, 'served')}
                            >
                                <CheckCircle size={12} className="mr-1" /> Mark Served
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-8 px-2.5 text-muted-foreground hover:text-blue-600"
                                onClick={() => handleUpdateStatusInternal(item, 'sent_to_kitchen')}
                            >
                                <RotateCcw size={12} className="mr-1" /> Revert to Sent
                            </Button>
                          </>
                        )}
                        {item.status === 'served' && !isPaying && (
                          <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-8 px-2.5 text-muted-foreground hover:text-purple-600"
                              onClick={() => handleUpdateStatusInternal(item, 'ready_for_pickup')}
                          >
                              <RotateCcw size={12} className="mr-1" /> Revert to Ready
                          </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => openEditInstructionsDialog(item)}
                            disabled={!canModifyItemDetails}
                            aria-label="Edit instructions"
                          >
                            <Edit3 size={14} />
                          </Button>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                        <p className="text-base font-semibold text-foreground hidden sm:block">₹{(itemPrice * itemQuantity).toFixed(2)}</p>
                        <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-full">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleUpdateQuantityInternal(item, -1)} disabled={!canModifyItemDetails || itemQuantity <= 0}> <Minus size={16}/> </Button>
                          <span className="text-sm font-medium w-5 text-center">{itemQuantity}</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleUpdateQuantityInternal(item, 1)} disabled={!canModifyItemDetails}> <Plus size={16}/> </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:text-primary/80 rounded-full"
                          onClick={() => handleRepeatItemClick(item)}
                          disabled={isPaying}
                          aria-label={`Repeat ${itemName}`}
                          title={`Add another ${itemName}`}
                        >
                          <PlusCircle size={18} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive rounded-full" onClick={() => handleRemoveItemInternal(item)} disabled={!canModifyItemDetails}> <Trash2 size={16}/> </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
      {editingItem && (
        <EditInstructionsDialog
          isOpen={isInstructionsDialogOpen}
          onOpenChange={setIsInstructionsDialogOpen}
          itemName={editingItem.menuItem?.name || 'Selected Item'}
          initialInstructions={editingItem.instructions}
          onSave={handleSaveInstructions}
        />
      )}
    </div>
  );
}
