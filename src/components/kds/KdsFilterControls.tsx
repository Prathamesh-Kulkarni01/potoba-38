

'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, Search, XCircle } from 'lucide-react';
import { type OrderStatus as OverallOrderStatus } from '@/types'; // Assuming OrderStatus is the overall order status
import { Card, CardContent } from '@/components/ui/card';


interface KdsFilterControlsProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  selectedStatus: OverallOrderStatus | 'all';
  onStatusChange: (status: OverallOrderStatus | 'all') => void;
  onClearFilters: () => void;
  availableStatuses: { value: OverallOrderStatus | 'all', label: string }[];
}

export default function KdsFilterControls({
  searchTerm,
  onSearchTermChange,
  selectedStatus,
  onStatusChange,
  onClearFilters,
  availableStatuses
}: KdsFilterControlsProps) {
  return (
    <Card className="mb-4 sticky top-0 z-10 bg-background/95 backdrop-blur-sm shadow-sm">
      <CardContent className="p-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div className="relative sm:col-span-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search Table#, Order#, Item..."
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              className="pl-8 h-9 text-sm w-full"
            />
          </div>
          
          <Select value={selectedStatus} onValueChange={(value) => onStatusChange(value as OverallOrderStatus | 'all')}>
            <SelectTrigger className="h-9 text-sm">
              <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Filter by status..." />
            </SelectTrigger>
            <SelectContent>
              {availableStatuses.map(statusOpt => (
                <SelectItem key={statusOpt.value} value={statusOpt.value} className="text-sm">
                  {statusOpt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={onClearFilters} variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground hover:text-foreground justify-self-start sm:justify-self-end">
            <XCircle className="mr-1.5 h-4 w-4" /> Clear Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Note: This component is currently not used in the main KDS page as the filtering is handled by Tabs.
// It's provided as a base for more advanced filtering if needed in the future.
// To use it, you'd integrate it into `KitchenDisplaySystemPage` and manage its state there.
// For example:
// const [searchTerm, setSearchTerm] = useState('');
// const [selectedStatusFilter, setSelectedStatusFilter] = useState<OverallOrderStatus | 'all'>('all');
// const availableStatusesForFilter = [
//   { value: 'all', label: 'All Kitchen Statuses' },
//   { value: 'pending_kitchen', label: 'Pending Kitchen' },
//   { value: 'confirmed_by_kitchen', label: 'Confirmed' },
//   { value: 'preparing', label: 'Preparing' },
//   { value: 'ready_for_pickup', label: 'Ready for Pickup' },
// ];
// const handleClearAllFilters = () => {
//   setSearchTerm('');
//   setSelectedStatusFilter('all');
// };
// And then pass these to KdsFilterControls.
// The filtering logic in `filteredOrders` useMemo hook would also need to consider `selectedStatusFilter` and `searchTerm`.

    