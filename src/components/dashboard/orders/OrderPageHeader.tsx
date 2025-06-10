
// src/components/dashboard/orders/OrderPageHeader.tsx
'use client';

import { Button } from '@/components/ui/button';
import { CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, ListOrdered } from 'lucide-react';

interface OrderPageHeaderProps {
  restaurantName: string | undefined;
  tableIdFilter: string | null;
  onOpenNewOrderPanel: () => void;
  allFetchedOrders?: any[]; // Only for a temporary display for debugging tableIdFilter
  orderCount?: number;
}

export default function OrderPageHeader({
  restaurantName,
  tableIdFilter,
  onOpenNewOrderPanel,
  allFetchedOrders,
  orderCount,
}: OrderPageHeaderProps) {
  let descriptionText = `View, manage, and create orders for ${restaurantName || 'your restaurant'}.`;
  if (tableIdFilter && allFetchedOrders && allFetchedOrders.length > 0) {
    const tableNumber = allFetchedOrders.find(o => o.tableId === tableIdFilter)?.tableNumber;
    descriptionText += ` (Filtered for Table ${tableNumber || tableIdFilter})`;
  } else if (tableIdFilter) {
    descriptionText += ` (Filtered for Table ${tableIdFilter})`;
  }
  if (orderCount !== undefined) {
     descriptionText += ` Showing ${orderCount} orders.`;
  }


  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
      <div className="mb-4 md:mb-0">
        <CardTitle className="text-2xl md:text-3xl flex items-center">
          <ListOrdered className="mr-3 h-7 w-7 text-primary" /> Order Management
        </CardTitle>
        <CardDescription>{descriptionText}</CardDescription>
      </div>
      <Button onClick={onOpenNewOrderPanel} className="bg-accent hover:bg-accent/90 text-accent-foreground">
        <PlusCircle className="mr-2 h-4 w-4" /> New Order
      </Button>
    </div>
  );
}
