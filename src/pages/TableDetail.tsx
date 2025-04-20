
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Users, QrCode, Edit, History, MoreHorizontal } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import QRCodeGenerator from '../components/QRCodeGenerator';
import Navbar from '../components/Navbar';

// Sample data - in a real application, this would come from an API
const tableDetails = {
  id: 5,
  number: 5,
  capacity: 4,
  status: 'occupied',
  lastOrder: new Date().toISOString(),
  currentOrder: {
    id: 123,
    items: [
      { name: 'Classic Burger', quantity: 1, price: 12.99 },
      { name: 'French Fries', quantity: 1, price: 4.99 },
      { name: 'Iced Tea', quantity: 1, price: 2.99 }
    ],
    status: 'preparing',
    time: new Date().toISOString(),
    total: 20.97
  },
  orderHistory: [
    { 
      id: 122,
      items: [
        { name: 'Caesar Salad', quantity: 1, price: 8.99 },
        { name: 'Iced Tea', quantity: 1, price: 2.99 }
      ],
      status: 'completed',
      time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      total: 11.98
    },
    { 
      id: 120,
      items: [
        { name: 'Margherita Pizza', quantity: 1, price: 14.99 },
        { name: 'Chicken Wings', quantity: 1, price: 9.99 },
        { name: 'Iced Tea', quantity: 2, price: 5.98 }
      ],
      status: 'completed',
      time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      total: 30.96
    }
  ]
};

const statusDisplay = {
  available: { text: 'Available', class: 'table-status-available' },
  occupied: { text: 'Occupied', class: 'table-status-occupied' },
  reserved: { text: 'Reserved', class: 'table-status-reserved' }
};

const orderStatusDisplay = {
  pending: { text: 'Pending', class: 'bg-gray-100 text-gray-800' },
  preparing: { text: 'Preparing', class: 'bg-restaurant-secondary/20 text-restaurant-secondary' },
  served: { text: 'Served', class: 'bg-restaurant-accent/20 text-restaurant-accent' },
  completed: { text: 'Completed', class: 'bg-restaurant-available/20 text-restaurant-available' }
};

const TableDetail = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  
  // In a real app, you would fetch the table details based on the ID
  // For demo, we're using the sample data
  
  const formatTime = (timeString: string) => {
    const time = new Date(timeString);
    return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDate = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleDateString();
  };
  
  const statusInfo = statusDisplay[tableDetails.status as keyof typeof statusDisplay];
  
  return (
    <div className="min-h-screen bg-restaurant-background">
      <Navbar currentTenant="Demo Restaurant" />
      
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Link 
            to="/dashboard/tables" 
            className="text-muted-foreground hover:text-foreground inline-flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tables
          </Link>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Table {tableDetails.number}</h1>
              <span className={`px-2 py-1 rounded-full text-xs ${statusInfo.class}`}>
                {statusInfo.text}
              </span>
            </div>
            <p className="text-muted-foreground">Capacity: {tableDetails.capacity} people</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => setQrDialogOpen(true)}
              className="flex items-center"
            >
              <QrCode className="mr-2 h-4 w-4" />
              View QR Code
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Table
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Mark as Available
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Mark as Reserved
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  Delete Table
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="info">
              Info
            </TabsTrigger>
            <TabsTrigger value="current-order">
              Current Order
            </TabsTrigger>
            <TabsTrigger value="history">
              Order History
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="info" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    Table Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm text-muted-foreground">Table Number</div>
                    <div className="text-sm font-medium">{tableDetails.number}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm text-muted-foreground">Capacity</div>
                    <div className="text-sm font-medium">{tableDetails.capacity} people</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm text-muted-foreground">Status</div>
                    <div className="text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${statusInfo.class}`}>
                        {statusInfo.text}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="mr-2 h-5 w-5" />
                    Current Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm text-muted-foreground">Last Order</div>
                    <div className="text-sm font-medium">
                      {formatTime(tableDetails.lastOrder)}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm text-muted-foreground">Order Status</div>
                    <div className="text-sm">
                      {tableDetails.currentOrder && (
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          orderStatusDisplay[tableDetails.currentOrder.status as keyof typeof orderStatusDisplay].class
                        }`}>
                          {orderStatusDisplay[tableDetails.currentOrder.status as keyof typeof orderStatusDisplay].text}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm text-muted-foreground">Total Amount</div>
                    <div className="text-sm font-medium">
                      ${tableDetails.currentOrder?.total.toFixed(2)}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <QrCode className="mr-2 h-5 w-5" />
                    QR Code
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <QRCodeGenerator
                    value={`${window.location.origin}/order/${tableDetails.id}`}
                    size={120}
                  />
                  <p className="mt-4 text-sm text-center text-muted-foreground">
                    Scan to place an order
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4 text-sm w-full"
                    onClick={() => setQrDialogOpen(true)}
                  >
                    View Larger
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="current-order" className="mt-6">
            {tableDetails.currentOrder ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Order #{tableDetails.currentOrder.id}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      orderStatusDisplay[tableDetails.currentOrder.status as keyof typeof orderStatusDisplay].class
                    }`}>
                      {orderStatusDisplay[tableDetails.currentOrder.status as keyof typeof orderStatusDisplay].text}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-2">Order Items</h3>
                    <div className="rounded-md border">
                      <table className="min-w-full divide-y divide-border">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Item</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Quantity</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Price</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-border">
                          {tableDetails.currentOrder.items.map((item, index) => (
                            <tr key={index}>
                              <td className="px-4 py-3 text-sm">{item.name}</td>
                              <td className="px-4 py-3 text-sm">{item.quantity}</td>
                              <td className="px-4 py-3 text-sm">${item.price.toFixed(2)}</td>
                              <td className="px-4 py-3 text-sm font-medium">${(item.quantity * item.price).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-muted/30">
                          <tr>
                            <td colSpan={3} className="px-4 py-3 text-sm font-medium text-right">Total</td>
                            <td className="px-4 py-3 text-sm font-bold">${tableDetails.currentOrder.total.toFixed(2)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Order placed at {formatTime(tableDetails.currentOrder.time)} on {formatDate(tableDetails.currentOrder.time)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline">Print Receipt</Button>
                      <Button 
                        className="bg-restaurant-primary hover:bg-restaurant-primary/90"
                      >
                        Update Status
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No current order for this table</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <History className="mr-2 h-5 w-5" />
                  Order History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tableDetails.orderHistory.length > 0 ? (
                  <div className="space-y-6">
                    {tableDetails.orderHistory.map((order) => (
                      <div key={order.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <h3 className="font-medium">Order #{order.id}</h3>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(order.time)} at {formatTime(order.time)}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            orderStatusDisplay[order.status as keyof typeof orderStatusDisplay].class
                          }`}>
                            {orderStatusDisplay[order.status as keyof typeof orderStatusDisplay].text}
                          </span>
                        </div>
                        
                        <div className="rounded-md border">
                          <table className="min-w-full divide-y divide-border">
                            <thead>
                              <tr className="bg-muted/50">
                                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Item</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Quantity</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Price</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-border">
                              {order.items.map((item, index) => (
                                <tr key={index}>
                                  <td className="px-4 py-2 text-sm">{item.name}</td>
                                  <td className="px-4 py-2 text-sm">{item.quantity}</td>
                                  <td className="px-4 py-2 text-sm">${item.price.toFixed(2)}</td>
                                  <td className="px-4 py-2 text-sm font-medium">${(item.quantity * item.price).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-muted/30">
                              <tr>
                                <td colSpan={3} className="px-4 py-2 text-sm font-medium text-right">Total</td>
                                <td className="px-4 py-2 text-sm font-bold">${order.total.toFixed(2)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    No order history for this table
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* QR Code Dialog */}
        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Table {tableDetails.number} QR Code</DialogTitle>
              <DialogDescription>
                Customers can scan this QR code to place their orders
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center py-4">
              <QRCodeGenerator
                value={`${window.location.origin}/order/${tableDetails.id}`}
                size={200}
              />
              <p className="mt-4 text-sm text-center">
                Table {tableDetails.number} - Capacity: {tableDetails.capacity}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setQrDialogOpen(false)}>
                Close
              </Button>
              <Button>Download QR Code</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default TableDetail;
