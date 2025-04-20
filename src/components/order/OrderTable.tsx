import { useState } from 'react';
import {
  CheckCircle,
  Clock,
  CupSoda,
  Filter,
  Flame,
  MoreHorizontal,
  PieChart,
  Search,
  Timer,
  UtensilsCrossed
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
import { motion } from 'framer-motion';
import { toast } from "sonner";

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
  pending: { 
    text: 'Pending', 
    class: 'bg-yellow-100 text-yellow-800',
    icon: <Clock className="h-3.5 w-3.5 mr-1" /> 
  },
  preparing: { 
    text: 'Preparing', 
    class: 'bg-restaurant-secondary/20 text-restaurant-secondary',
    icon: <Flame className="h-3.5 w-3.5 mr-1" /> 
  },
  served: { 
    text: 'Served', 
    class: 'bg-restaurant-accent/20 text-restaurant-accent',
    icon: <UtensilsCrossed className="h-3.5 w-3.5 mr-1" /> 
  },
  completed: { 
    text: 'Completed', 
    class: 'bg-restaurant-available/20 text-restaurant-available',
    icon: <CheckCircle className="h-3.5 w-3.5 mr-1" /> 
  }
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

  const handleStatusUpdate = (orderId: number, newStatus: string) => {
    // In a real app, this would update the status in the database
    // For now, we'll just show a toast notification
    toast.success(`Order #${orderId} marked as ${newStatus}`);
  };

  // Count orders by status for summary cards
  const orderCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return (
    <div className="space-y-6">
      <motion.div 
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div>
          <h1 className="page-title">Orders Dashboard</h1>
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
      </motion.div>
      
      {/* Summary Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="dashboard-status-card">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-700">Total Orders</h3>
            <PieChart className="h-5 w-5 text-restaurant-primary" />
          </div>
          <p className="text-3xl font-bold mt-2">{orders.length}</p>
          <div className="mt-2 text-sm text-gray-500">All orders today</div>
        </div>
        
        <div className="dashboard-status-card">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-700">Preparing</h3>
            <Flame className="h-5 w-5 text-restaurant-secondary" />
          </div>
          <p className="text-3xl font-bold mt-2">{orderCounts.preparing || 0}</p>
          <div className="mt-2 text-sm text-gray-500">Orders in kitchen</div>
        </div>
        
        <div className="dashboard-status-card">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-700">Served</h3>
            <UtensilsCrossed className="h-5 w-5 text-restaurant-accent" />
          </div>
          <p className="text-3xl font-bold mt-2">{orderCounts.served || 0}</p>
          <div className="mt-2 text-sm text-gray-500">Awaiting payment</div>
        </div>
        
        <div className="dashboard-status-card">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-700">Completed</h3>
            <CheckCircle className="h-5 w-5 text-restaurant-available" />
          </div>
          <p className="text-3xl font-bold mt-2">{orderCounts.completed || 0}</p>
          <div className="mt-2 text-sm text-gray-500">Finished orders</div>
        </div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full max-w-full h-auto flex flex-wrap">
            <TabsTrigger value="all" className="flex-grow data-[state=active]:bg-restaurant-primary data-[state=active]:text-white">
              All Orders
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex-grow data-[state=active]:bg-yellow-500 data-[state=active]:text-white">
              <Clock className="h-4 w-4 mr-1" />
              Pending
            </TabsTrigger>
            <TabsTrigger value="preparing" className="flex-grow data-[state=active]:bg-restaurant-secondary data-[state=active]:text-white">
              <Flame className="h-4 w-4 mr-1" />
              Preparing
            </TabsTrigger>
            <TabsTrigger value="served" className="flex-grow data-[state=active]:bg-restaurant-accent data-[state=active]:text-white">
              <UtensilsCrossed className="h-4 w-4 mr-1" />
              Served
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex-grow data-[state=active]:bg-restaurant-available data-[state=active]:text-white">
              <CheckCircle className="h-4 w-4 mr-1" />
              Completed
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-6">
            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <div className="food-themed-header p-4">
                <h2 className="text-lg font-semibold">Order Details</h2>
              </div>
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="font-semibold">Order ID</TableHead>
                    <TableHead className="font-semibold">Table</TableHead>
                    <TableHead className="font-semibold">Items</TableHead>
                    <TableHead className="font-semibold">Time</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Total</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const status = statusDisplay[order.status as keyof typeof statusDisplay];
                    
                    return (
                      <TableRow key={order.id} className="table-hover-row">
                        <TableCell className="font-medium">#{order.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <div className="h-7 w-7 rounded-full bg-restaurant-primary/10 flex items-center justify-center mr-2">
                              <span className="text-xs font-semibold text-restaurant-primary">{order.tableNumber}</span>
                            </div>
                            Table {order.tableNumber}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <CupSoda className="h-4 w-4 text-restaurant-accent" />
                            <span>{order.items.length} items</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <div className="flex items-center">
                              <Timer className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                              <span className="text-sm">{formatTime(order.time)}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{formatDate(order.time)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`status-badge ${status.class}`}>
                            {status.icon}
                            {status.text}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">₹{order.total.toFixed(2)}</TableCell>
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
                              <DropdownMenuItem onClick={() => {
                                toast(`Order #${order.id} Details - ${order.items.length} items - ₹${order.total.toFixed(2)}`);
                              }}>
                                View Details
                              </DropdownMenuItem>
                              {order.status === 'preparing' && (
                                <DropdownMenuItem onClick={() => handleStatusUpdate(order.id, 'served')}>
                                  <UtensilsCrossed className="mr-2 h-4 w-4" />
                                  Mark as Served
                                </DropdownMenuItem>
                              )}
                              {order.status === 'served' && (
                                <DropdownMenuItem onClick={() => handleStatusUpdate(order.id, 'completed')}>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Mark as Completed
                                </DropdownMenuItem>
                              )}
                              {(order.status === 'pending' || order.status === 'preparing') && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => {
                                      toast.error(`Order #${order.id} has been cancelled`);
                                    }}
                                  >
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
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <CupSoda className="h-8 w-8 mb-2 opacity-50" />
                          <p>No orders found</p>
                        </div>
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
      </motion.div>
    </div>
  );
};

export default OrderTable;
