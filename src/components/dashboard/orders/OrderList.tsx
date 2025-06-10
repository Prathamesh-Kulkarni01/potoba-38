
// src/components/dashboard/orders/OrderList.tsx
'use client';

import type { ClientOrder, OrderStatus as OrderStatusType } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import OrderRow from './OrderRow';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import { ArrowUpDown } from 'lucide-react';

interface OrderListProps {
  orders: ClientOrder[];
  orderStatusConfig: Record<OrderStatusType, { label: string; icon?: React.ElementType; color: string; shortLabel?: string }>;
  possibleNextStatuses: Record<OrderStatusType, OrderStatusType[]>;
  onOpenEditPanel: (order: ClientOrder) => void;
  onUpdateStatus: (orderId: string, newStatus: OrderStatusType) => void;
  updatingOrderId: string | null;
  isLoading: boolean;
  sortConfig: { key: keyof ClientOrder | null; direction: 'ascending' | 'descending' };
  onSort: (key: keyof ClientOrder) => void;
}

export default function OrderList({
  orders,
  orderStatusConfig,
  possibleNextStatuses,
  onOpenEditPanel,
  onUpdateStatus,
  updatingOrderId,
  isLoading,
  sortConfig,
  onSort,
}: OrderListProps) {

  const SortableTableHead = ({ columnKey, children }: { columnKey: keyof ClientOrder, children: React.ReactNode }) => (
    <TableHead onClick={() => onSort(columnKey)} className="cursor-pointer hover:bg-muted/50">
      <div className="flex items-center gap-2">
        {children}
        {sortConfig.key === columnKey && <ArrowUpDown className={`h-3 w-3 ${sortConfig.direction === 'descending' ? 'rotate-180' : ''}`} />}
      </div>
    </TableHead>
  );

  if (isLoading && orders.length === 0) {
    return (
      <div className="text-center py-10">
        <LoadingSpinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-dashed rounded-lg bg-muted/30">
        <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Orders Found</h3>
        <p className="text-muted-foreground">Try adjusting your filters or check back later.</p>
        <Image 
          src="https://picsum.photos/seed/noordersfilter/300/200" 
          alt="No orders illustration" 
          width={300} height={200} 
          className="mt-6 mx-auto rounded-md opacity-70"
          data-ai-hint="empty plate filter"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableTableHead columnKey="id">Order ID</SortableTableHead>
          <SortableTableHead columnKey="tableNumber">Table</SortableTableHead>
          <SortableTableHead columnKey="createdAt">Created</SortableTableHead>
          <TableHead>Items</TableHead>
          <SortableTableHead columnKey="totalAmount">Total</SortableTableHead>
          <SortableTableHead columnKey="status">Status</SortableTableHead>
          <TableHead className="text-right w-[200px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map(order => (
          <OrderRow
            key={order.id}
            order={order}
            orderStatusConfig={orderStatusConfig}
            possibleNextStatuses={possibleNextStatuses}
            onOpenEditPanel={onOpenEditPanel}
            onUpdateStatus={onUpdateStatus}
            updatingOrderId={updatingOrderId}
          />
        ))}
      </TableBody>
    </Table>
  );
}
