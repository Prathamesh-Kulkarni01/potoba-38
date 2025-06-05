

'use client';

import type { ClientOrder, OrderItem, OrderItemStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNowStrict, parseISO, differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { Clock, Utensils, ArrowRight, Hash, ListChecks } from 'lucide-react';
import KitchenOrderItem from './KitchenOrderItem';

interface KitchenOrderTicketProps {
  order: ClientOrder;
  onItemStatusChange: (orderId: string, itemUniqueId: string, newStatus: OrderItemStatus) => void;
  updatingItems: Record<string, boolean>; // { itemUniqueId: true/false }
  itemStatusConfig: Record<OrderItemStatus, { label: string; color: string; nextAction?: OrderItemStatus, nextActionLabel?: string }>;
}

export default function KitchenOrderTicket({
  order,
  onItemStatusChange,
  updatingItems,
  itemStatusConfig,
}: KitchenOrderTicketProps) {

  const getElapsedTimeInfo = (createdAt: string) => {
    const createdDate = parseISO(createdAt);
    const mins = differenceInMinutes(new Date(), createdDate);
    let color = 'text-green-600';
    if (mins >= 15) color = 'text-red-500'; // Warning if > 15 mins
    else if (mins >= 7) color = 'text-yellow-500'; // Caution if > 7 mins
    return {
      text: formatDistanceToNowStrict(createdDate, { addSuffix: false }),
      color: color,
    };
  };

  const elapsedTime = getElapsedTimeInfo(order.createdAt);
  const overallStatusInfo = itemStatusConfig[order.status as OrderItemStatus] || { label: order.status, color: 'bg-gray-500 text-white' };
  const statusColorBar = overallStatusInfo.color.replace('text-', 'bg-');


  // Filter items that are relevant for KDS (not yet served or cancelled by customer)
  const kdsRelevantItems = order.items.filter(item => 
    item.status !== 'served' && item.status !== 'cancelled_by_customer'
  );

  if (kdsRelevantItems.length === 0) {
    // If all items are served/cancelled by customer, this order might not need to be on KDS.
    // This can be filtered out at the page level too.
    return null; 
  }

  return (
    <Card className={cn("shadow-lg rounded-xl overflow-hidden flex flex-col border-2", `border-${statusColorBar?.split('-')[1]}-500/50`)}>
      <div className={cn("h-2.5 w-full", statusColorBar)} />
      <CardHeader className="p-3 space-y-1">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-bold text-foreground flex items-center">
            <Utensils className="mr-2 h-5 w-5 text-primary" />
            Table {order.tableNumber || 'N/A'}
          </CardTitle>
          <Badge className={cn("text-xs px-2 py-0.5", statusColorBar, statusColorBar?.includes('white') ? 'text-black': 'text-white')}>{overallStatusInfo.label}</Badge>
        </div>
        <div className="flex justify-between items-center text-xs text-muted-foreground">
           <span className="flex items-center">
                <Hash size={12} className="mr-1"/> Order <span className="font-mono ml-1">{order.id.substring(0, 6)}</span>
            </span>
          <span className={cn("font-semibold flex items-center", elapsedTime.color)}>
            <Clock size={12} className="mr-1" /> {elapsedTime.text}
          </span>
        </div>
        {order.kitchenNotes && (
            <p className="text-xs bg-yellow-100 text-yellow-800 p-1.5 rounded border border-yellow-300">
                <strong>Kitchen Note:</strong> {order.kitchenNotes}
            </p>
        )}
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2 flex-grow overflow-y-auto max-h-[400px] thin-scrollbar">
        {kdsRelevantItems.length > 0 ? kdsRelevantItems.map(item => (
          <KitchenOrderItem
            key={item.uniqueId}
            item={item}
            orderId={order.id}
            onStatusChange={onItemStatusChange}
            isLoading={updatingItems[item.uniqueId] || false}
            itemStatusConfig={itemStatusConfig}
          />
        )) : (
             <div className="text-center py-4 text-muted-foreground">
                <ListChecks className="mx-auto h-8 w-8 mb-2 text-green-500"/>
                All items processed or served for this order.
            </div>
        )}
      </CardContent>
    </Card>
  );
}

    