
import type { OrderItemStatus, OrderStatus as OverallOrderStatus } from '@/types';
import { BellRing, Utensils, CheckCircle, type LucideIcon } from 'lucide-react';

export const KDS_ITEM_STATUS_CONFIG: Record<OrderItemStatus, { label: string; color: string; nextAction?: OrderItemStatus, nextActionLabel?: string }> = {
  pending: { label: 'Pending Send', color: 'bg-gray-400 text-gray-800', nextAction: 'sent_to_kitchen', nextActionLabel: 'Send to Kitchen' },
  sent_to_kitchen: { label: 'New', color: 'bg-blue-500 text-white', nextAction: 'confirmed_by_kitchen', nextActionLabel: 'Confirm Item' },
  confirmed_by_kitchen: { label: 'Confirmed', color: 'bg-sky-500 text-white', nextAction: 'preparing', nextActionLabel: 'Start Preparing' },
  preparing: { label: 'Preparing', color: 'bg-yellow-500 text-black', nextAction: 'ready_for_pickup', nextActionLabel: 'Mark Ready' },
  ready_for_pickup: { label: 'Ready', color: 'bg-green-500 text-white', nextAction: 'served', nextActionLabel: 'Mark Served' },
  served: { label: 'Served', color: 'bg-teal-600 text-white' },
  cancelled_by_kitchen: { label: 'Cancelled (Kitchen)', color: 'bg-red-500 text-white' },
  cancelled_by_customer: { label: 'Cancelled (Cust)', color: 'bg-red-600 text-white' },
};

export const KDS_OVERALL_STATUS_TABS_CONFIG: Record<string, { label: string; shortLabel?: string; icon: LucideIcon; statuses: OverallOrderStatus[] }> = {
  new: {
    label: "New Orders",
    shortLabel: "New",
    icon: BellRing,
    statuses: ['pending_kitchen', 'confirmed_by_kitchen']
  },
  preparing: {
    label: "Preparing",
    shortLabel: "Prep",
    icon: Utensils,
    statuses: ['preparing']
  },
  ready: {
    label: "Ready for Pickup",
    shortLabel: "Ready",
    icon: CheckCircle,
    statuses: ['ready_for_pickup']
  },
};
