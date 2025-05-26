
'use client';

import type { Table as FirebaseTableType, TableStatus } from '@/lib/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Users, UserCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useOrders } from '@/contexts/waiter/OrderContext'; // Context for actual order data if needed here
import { formatDistanceToNowStrict } from 'date-fns';

interface TableCardProps {
  table: FirebaseTableType;
}

function formatElapsedTime(timestamp: number | null | undefined): string {
    if (!timestamp) return 'N/A';
    try {
      return formatDistanceToNowStrict(new Date(timestamp), { addSuffix: false, unit: 'minute' }).replace(' minutes', 'm').replace(' minute', 'm');
    } catch (error) {
      console.error("Error formatting date for elapsed time:", error);
      return 'N/A';
    }
  }

export function TableCard({ table }: TableCardProps) {
  const { getTotalItemsForTable, getFirstItemAddedTime, getAssignedWaiterInfo } = useOrders();
  
  const status = table.status; // Directly from Firestore table data
  const orderCount = getTotalItemsForTable(table.id); 
  const firstItemTime = getFirstItemAddedTime(table.id);
  const assignedWaiterInfo = getAssignedWaiterInfo(table.id);


  let displayStatusText = "Empty";
  let displayStatusColor = "bg-green-500";
  let textColor = "text-green-600";
  let timeDisplay = "";

  if (status === 'occupied') {
    displayStatusText = `${orderCount} Item${orderCount === 1 ? '' : 's'}`;
    displayStatusColor = "bg-orange-500";
    textColor = "text-orange-600";
    timeDisplay = firstItemTime ? formatElapsedTime(firstItemTime) + ' ago' : 'Starting...';
  } else if (status === 'paying') {
    displayStatusText = "Paying";
    displayStatusColor = "bg-yellow-400";
    textColor = "text-yellow-600";
    timeDisplay = firstItemTime ? formatElapsedTime(firstItemTime) + ' ago' : '';
  } else if (status === 'reserved') {
    displayStatusText = "Reserved";
    displayStatusColor = "bg-blue-500";
    textColor = "text-blue-600";
  } else if (status === 'needs_cleaning') {
    displayStatusText = "Cleaning";
    displayStatusColor = "bg-purple-500"; // Example color
    textColor = "text-purple-600";
  }


  return (
    <Card
      className={cn(
        "transition-all duration-200 ease-in-out shadow-md hover:shadow-lg border-border/60 rounded-xl overflow-hidden flex flex-col",
        {
          'ring-2 ring-primary/70 shadow-xl': status === 'occupied' && orderCount > 0,
          'opacity-80': status === 'available' && orderCount === 0,
        }
      )}
    >
      <Link href={`/waiter/order/${table.id}`} className="block flex-grow">
        <CardContent className="p-3 space-y-1.5 flex flex-col h-full">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-semibold text-foreground">{table.tableNumber}</h3>
             <div className={cn("w-3 h-3 rounded-full shrink-0 mt-1", displayStatusColor)} title={status.replace('_', ' ')} />
          </div>
          <div className="text-xs text-muted-foreground flex items-center">
            <Users size={14} className="mr-1" /> {table.capacity} Guests
          </div>
          <div className={cn("text-sm font-medium flex-grow", textColor)}>
            {displayStatusText}
          </div>
          {timeDisplay && (
             <div className="text-xs text-muted-foreground flex items-center mt-auto pt-1">
                <Clock size={12} className="mr-1"/> {timeDisplay}
            </div>
          )}
        </CardContent>
      </Link>
      {assignedWaiterInfo?.waiterName && (
        <CardFooter className="p-2 border-t bg-muted/30">
            <div className="flex items-center gap-1.5 w-full">
                <UserCircle size={14} className="text-muted-foreground" />
                <p className="text-xs text-muted-foreground truncate">{assignedWaiterInfo.waiterName}</p>
            </div>
        </CardFooter>
      )}
    </Card>
  );
}
