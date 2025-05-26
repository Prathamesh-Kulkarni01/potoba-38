
'use client';

import type { Table, TableStatus, Waiter } from '@/lib/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Users, UserCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useOrders } from '@/contexts/waiter/OrderContext';
import { WAITERS_DATA } from '@/data/waiter/waiters';

interface TableCardProps {
  table: Table;
}

export function TableCard({ table }: TableCardProps) {
  const { getTableStatus, getOrderForTable, getAssignedWaiterId } = useOrders();
  const status = getTableStatus(table.id);
  const orderItems = getOrderForTable(table.id);
  const orderCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const assignedWaiterId = getAssignedWaiterId(table.id);
  const assignedWaiter = WAITERS_DATA.find(w => w.id === assignedWaiterId);


  let displayStatusText = "Empty";
  let displayStatusColor = "bg-green-500";
  let textColor = "text-green-600";

  if (status === 'occupied') {
    displayStatusText = `${orderCount} Item${orderCount === 1 ? '' : 's'}`;
    displayStatusColor = "bg-orange-500";
    textColor = "text-orange-600";
  } else if (status === 'paying') {
    displayStatusText = "Paying";
    displayStatusColor = "bg-yellow-400";
    textColor = "text-yellow-600";
  } else if (status === 'reserved') {
    displayStatusText = "Reserved";
    displayStatusColor = "bg-blue-500";
    textColor = "text-blue-600";
  }


  return (
    <Card
      className={cn(
        "transition-all duration-200 ease-in-out shadow-md hover:shadow-lg border-border/60 rounded-xl overflow-hidden flex flex-col"
      )}
    >
      <Link href={`/waiter/order/${table.id}`} className="block flex-grow">
        <CardContent className="p-3 space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-foreground">{table.name.replace('Table ', '')}</h3>
             <div className={cn("w-3 h-3 rounded-full", displayStatusColor)} />
          </div>
          <div className="text-xs text-muted-foreground flex items-center">
            <Users size={14} className="mr-1" /> {table.capacity} Guests
          </div>
          <p className={cn(
            "text-sm font-medium",
            textColor
          )}>
            {displayStatusText}
          </p>
        </CardContent>
      </Link>
      {assignedWaiter && (
        <CardFooter className="p-2 border-t bg-muted/30">
            <div className="flex items-center gap-1.5 w-full">
                <UserCircle size={14} className="text-muted-foreground" />
                <p className="text-xs text-muted-foreground truncate">{assignedWaiter.name}</p>
            </div>
        </CardFooter>
      )}
    </Card>
  );
}
