
import { useState } from 'react';
import {
  CheckCircle,
  Clock,
  Filter,
  MoreHorizontal,
  Search
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";

// Sample data - in a real application, this would come from an API
const orders = [
  { 
    id: 1,
    tableNumber: 5,
    items: [
      { name: 'Classic Burger', quantity: 1, price: 12.99 },
      { name: 'French Fries', quantity: 1, price: 4.99 },
      { name: 'Iced Tea', quantity: 1, price: 2.99 }
    ],
    status: 'preparing',
    time: '2023-04-03T09:15:00Z',
    total: 20.97
  },
  { 
    id: 2,
    tableNumber: 12,
    items: [
      { name: 'Caesar Salad', quantity: 1, price: 8.99 },
      { name: 'Iced Tea', quantity: 1, price: 2.99 }
    ],
    status: 'served',
    time: '2023-04-03T09:05:00Z',
    total: 11.98
  },
  { 
    id: 3,
    tableNumber: 8,
    items: [
      { name: 'Margherita Pizza', quantity: 1, price: 14.99 },
      { name: 'Chicken Wings', quantity: 1, price: 9.99 },
      { name: 'French Fries', quantity: 1, price: 4.99 },
      { name: 'Iced Tea', quantity: 2, price: 5.98 }
    ],
    status: 'completed',
    time: '2023-04-03T08:45:00Z',
    total: 35.95
  },
  { 
    id: 4,
    tableNumber: 3,
    items: [
      { name: 'Spaghetti Carbonara', quantity: 1, price: 13.99 },
      { name: 'Caesar Salad', quantity: 1, price: 8.99 },
      { name: 'Iced Tea', quantity: 2, price: 5.98 }
    ],
    status: 'preparing',
    time: '2023-04-03T09:20:00Z',
    total: 28.96
  },
  { 
    id: 5,
    tableNumber: 10,
    items: [
      { name: 'Classic Burger', quantity: 2, price: 25.98 },
      { name: 'French Fries', quantity: 2, price: 9.98 },
      { name: 'Iced Tea', quantity: 2, price: 5.98 }
    ],
    status: 'served',
    time: '2023-04-03T08:55:00Z',
    total: 41.94
  }
];

const statusDisplay = {
  pending: { text: 'Pending', class: 'bg-gray-100 text-gray-800' },
  preparing: { text: 'Preparing', class: 'bg-restaurant-secondary/20 text-restaurant-secondary' },
  served: { text: 'Served', class: 'bg-restaurant-accent/20 text-restaurant-accent' },
  completed: { text: 'Completed', class: 'bg-restaurant-available/20 text-restaurant-available' }
};

const OrderTable = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredOrders = orders
    .filter(order => {
      // Filter by status tab
      if (activeTab !== 'all' && order.status !== activeTab) {
        return false;
      }
      
      // Filter by search query (table number)
      if (searchQuery && !order.tableNumber.toString().includes(searchQuery)) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  
  const formatTime = (timeString: string) => {
    const time = new Date(timeString);
    return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDate = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleDateString();
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-muted-foreground">View and manage customer orders</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search table..."
              className="pl-8 w-[200px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select defaultValue="today">
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Select date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="thisWeek">This Week</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Orders</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="preparing">Preparing</TabsTrigger>
          <TabsTrigger value="served">Served</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  const status = statusDisplay[order.status as keyof typeof statusDisplay];
                  
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">#{order.id}</TableCell>
                      <TableCell>Table {order.tableNumber}</TableCell>
                      <TableCell>{order.items.length} items</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{formatTime(order.time)}</span>
                          <span className="text-xs text-muted-foreground">{formatDate(order.time)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${status.class}`}>
                          {status.text}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">${order.total.toFixed(2)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            {order.status === 'preparing' && (
                              <DropdownMenuItem>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark as Served
                              </DropdownMenuItem>
                            )}
                            {order.status === 'served' && (
                              <DropdownMenuItem>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark as Completed
                              </DropdownMenuItem>
                            )}
                            {(order.status === 'pending' || order.status === 'preparing') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive">
                                  Cancel Order
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
                
                {filteredOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No orders found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4 flex items-center justify-end">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#" />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#" isActive>1</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#">2</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#">3</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext href="#" />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrderTable;
