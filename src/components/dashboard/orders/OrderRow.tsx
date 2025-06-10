
// src/components/dashboard/orders/OrderRow.tsx
'use client';

import type { ClientOrder, OrderItem, OrderStatus as OrderStatusType } from '@/types';
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface OrderRowProps {
  order: ClientOrder;
  orderStatusConfig: Record<OrderStatusType, { label: string; icon?: React.ElementType; color: string; shortLabel?: string }>;
  possibleNextStatuses: Record<OrderStatusType, OrderStatusType[]>;
  onOpenEditPanel: (order: ClientOrder) => void;
  onUpdateStatus: (orderId: string, newStatus: OrderStatusType) => void;
  updatingOrderId: string | null;
}

const getItemsSummary = (items: OrderItem[]) => {
  if (!items || items.length === 0) return "No items";
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  return `${totalQuantity} item${totalQuantity > 1 ? 's' : ''}`;
};

export default function OrderRow({
  order,
  orderStatusConfig,
  possibleNextStatuses,
  onOpenEditPanel,
  onUpdateStatus,
  updatingOrderId,
}: OrderRowProps) {
  const StatusIcon = orderStatusConfig[order.status]?.icon;

  return (
    <TableRow key={order.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => onOpenEditPanel(order)}>
      <TableCell className="font-medium text-xs">#{order.id.substring(0, 6)}...</TableCell>
      <TableCell>{order.tableNumber || 'N/A'}</TableCell>
      <TableCell className="text-xs">{format(parseISO(order.createdAt), 'MMM d, p')}</TableCell>
      <TableCell className="text-xs">{getItemsSummary(order.items)}</TableCell>
      <TableCell className="text-right font-medium">${order.totalAmount.toFixed(2)}</TableCell>
      <TableCell>
        <Badge className={cn(
          "text-xs whitespace-nowrap",
          orderStatusConfig[order.status]?.color ? orderStatusConfig[order.status]?.color.replace('text-', 'bg-') + " text-white" : "bg-gray-500 text-white"
        )}>
          {StatusIcon && <StatusIcon className="h-3 w-3 mr-1.5" />}
          {orderStatusConfig[order.status]?.label || order.status}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end space-x-1">
          <Select
            value={order.status}
            onValueChange={(newStatus) => onUpdateStatus(order.id, newStatus as OrderStatusType)}
            onClick={(e) => e.stopPropagation()}
            disabled={updatingOrderId === order.id || (possibleNextStatuses[order.status]?.length === 0 && order.status !== 'completed')}
          >
            <SelectTrigger id={`status-${order.id}`} className="h-8 text-xs w-[130px] bg-card">
              <SelectValue placeholder="Update..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={order.status} disabled className="text-xs">
                {orderStatusConfig[order.status].shortLabel || orderStatusConfig[order.status].label} (Current)
              </SelectItem>
              {possibleNextStatuses[order.status]?.map(nextStatus => (
                <SelectItem key={nextStatus} value={nextStatus} className="text-xs">
                  {orderStatusConfig[nextStatus].label}
                </SelectItem>
              ))}
              {!['completed', 'cancelled_by_customer', 'cancelled_by_restaurant'].includes(order.status) && (
                <SelectItem value="completed" className="text-xs">
                  {orderStatusConfig.completed.label}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={(e) => { e.stopPropagation(); onOpenEditPanel(order); }}
          >
            Edit
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
