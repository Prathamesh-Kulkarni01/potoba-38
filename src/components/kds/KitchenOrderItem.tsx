

'use client';

import type { OrderItem, OrderItemStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Loader2, ArrowRight, Check, X } from 'lucide-react'; // Added X for cancel

interface KitchenOrderItemProps {
  item: OrderItem;
  orderId: string;
  onStatusChange: (orderId: string, itemUniqueId: string, newStatus: OrderItemStatus) => void;
  isLoading: boolean;
  itemStatusConfig: Record<OrderItemStatus, { label: string; color: string; nextAction?: OrderItemStatus, nextActionLabel?: string }>;
}

export default function KitchenOrderItem({
  item,
  orderId,
  onStatusChange,
  isLoading,
  itemStatusConfig,
}: KitchenOrderItemProps) {
  const statusInfo = itemStatusConfig[item.status] || { label: item.status, color: 'bg-gray-400 text-gray-800' };
  const nextActionStatus = itemStatusConfig[item.status]?.nextAction;
  const nextActionLabel = itemStatusConfig[item.status]?.nextActionLabel;

  return (
    <div className="bg-background p-2.5 rounded-lg border border-border/70 shadow-sm space-y-1.5">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-semibold text-sm text-foreground leading-tight">{item.menuItemName}</p>
          <p className="text-primary font-bold text-sm">x {item.quantity}</p>
        </div>
        <Badge className={cn("text-xs px-2 py-0.5 whitespace-nowrap self-start", statusInfo.color, statusInfo.color?.includes('white') ? 'text-black' : 'text-white')}>
          {statusInfo.label}
        </Badge>
      </div>
      
      {item.variantChoices && item.variantChoices.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {item.variantChoices.map(vc => `${vc.variantName}: ${vc.optionName}`).join(' • ')}
        </div>
      )}

      {item.instructions && (
        <p className="text-xs text-accent bg-accent/10 p-1.5 rounded italic">
          Note: {item.instructions}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        {nextActionStatus && nextActionLabel && (
          <Button
            size="xs"
            variant="outline"
            className={cn("flex-grow h-8 text-xs", statusInfo.color?.replace('bg-','border-') ?? 'border-primary', statusInfo.color?.replace('bg-','text-') ?? 'text-primary', `hover:${statusInfo.color}`,'hover:text-white')}
            onClick={() => onStatusChange(orderId, item.uniqueId, nextActionStatus)}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 
            <>
                {nextActionLabel} <ArrowRight className="ml-1.5 h-3.5 w-3.5"/>
            </>
            }
          </Button>
        )}
        {/* Allow cancellation if item is not too far in progress and not already cancelled */}
        {(item.status === 'sent_to_kitchen' || item.status === 'confirmed_by_kitchen') && (
            <Button
                size="xs"
                variant="ghost"
                className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onStatusChange(orderId, item.uniqueId, 'cancelled_by_kitchen')}
                disabled={isLoading}
                title="Cancel Item"
            >
                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <X className="h-4 w-4"/>}
            </Button>
        )}
      </div>
    </div>
  );
}

    