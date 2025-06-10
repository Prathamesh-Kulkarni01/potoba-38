
// src/components/dashboard/orders/OrderFilters.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, Filter as FilterIcon, FilterXIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { OrderStatus as OrderStatusType } from '@/types';
import type { DateRange } from 'react-day-picker';

type MainTabValue = 'active' | 'all' | 'pending_kitchen' | 'cancelled';

interface OrderFiltersProps {
  activeMainTab: MainTabValue;
  onActiveMainTabChange: (value: MainTabValue) => void;
  mainTabs: { value: MainTabValue; label: string; statuses?: OrderStatusType[] }[];
  detailedStatusFilter: OrderStatusType | null;
  onDetailedStatusFilterChange: (value: OrderStatusType | null) => void;
  detailedStatusOptions: { value: OrderStatusType; label: string }[];
  allStatusesValue: string;
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  priceRange: { min: string; max: string };
  onPriceRangeChange: (range: { min: string; max: string }) => void;
  onClearFilters: () => void;
  showFilters: boolean;
  onToggleShowFilters: () => void;
}

export default function OrderFilters({
  activeMainTab,
  onActiveMainTabChange,
  mainTabs,
  detailedStatusFilter,
  onDetailedStatusFilterChange,
  detailedStatusOptions,
  allStatusesValue,
  dateRange,
  onDateRangeChange,
  priceRange,
  onPriceRangeChange,
  onClearFilters,
  showFilters,
  onToggleShowFilters,
}: OrderFiltersProps) {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-center justify-between border rounded-md ">
        <Tabs value={activeMainTab} onValueChange={onActiveMainTabChange} className="w-full">
          <TabsList className="flex overflow-x-auto m-1 flex-nowrap overflow-y-hidden">
            {mainTabs.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs px-2 py-1.5 h-auto sm:flex-initial">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="md:hidden ml-1">
          <Button variant="outline" className="w-full" onClick={onToggleShowFilters}>
            {showFilters ? <FilterXIcon className="mr-2 h-4 w-4" /> : <FilterIcon className="mr-2 h-4 w-4" />}
          </Button>
        </div>
      </div>
      <div className={`${showFilters ? 'block' : 'hidden'} md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end`}>
        <div className="space-y-1">
          <label htmlFor="detailed-status-filter" className="text-sm font-medium text-muted-foreground">Specific Status</label>
          <Select
            value={detailedStatusFilter || allStatusesValue}
            onValueChange={(value) => onDetailedStatusFilterChange(value === allStatusesValue ? null : value as OrderStatusType)}
          >
            <SelectTrigger id="detailed-status-filter" className="h-10"><SelectValue placeholder="Select status..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value={allStatusesValue}>All Specific Statuses</SelectItem>
              {detailedStatusOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">Date Range</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal h-10", !dateRange && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <span>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</span>
                  ) : (
                    <span>{format(dateRange.from, "LLL dd, y")}</span>
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={onDateRangeChange} numberOfMonths={2} />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">Price Range</label>
          <div className="flex gap-2">
            <Input type="number" placeholder="Min $" value={priceRange.min} onChange={e => onPriceRangeChange({ ...priceRange, min: e.target.value })} className="h-10" />
            <Input type="number" placeholder="Max $" value={priceRange.max} onChange={e => onPriceRangeChange({ ...priceRange, max: e.target.value })} className="h-10" />
          </div>
        </div>
        <Button onClick={onClearFilters} variant="outline" className="h-10 self-end">
          <FilterIcon className="mr-2 h-4 w-4" /> Clear Filters
        </Button>
      </div>
    </div>
  );
}
