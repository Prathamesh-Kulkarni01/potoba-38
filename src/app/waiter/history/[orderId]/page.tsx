
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useOrders } from '@/contexts/waiter/OrderContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Hash, CalendarDays, Users, CreditCard, StickyNote, ShoppingBag, Package } from 'lucide-react';
import { format } from 'date-fns';
import { TABLES_DATA } from '@/data/waiter/tables';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

export default function HistoricalOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { getHistoricalOrderById } = useOrders();

  const orderId = params.orderId as string;
  const historicalOrder = getHistoricalOrderById(orderId);

  if (!historicalOrder) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold text-destructive mb-4">Order Not Found</h1>
        <p className="text-muted-foreground mb-6">The historical order ID specified does not exist.</p>
        <Button onClick={() => router.push('/waiter/tables-status')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Orders List
        </Button>
      </div>
    );
  }

  const tableDetails = TABLES_DATA.find(t => t.id === historicalOrder.originalTableId);
  const tableName = tableDetails ? tableDetails.name : `Table ${historicalOrder.originalTableId?.replace('t', '') || 'N/A'}`;

  const paymentMethodText = (method?: string) => {
    if (!method) return 'N/A';
    return method.charAt(0).toUpperCase() + method.slice(1);
  };

  return (
    <div className="space-y-6 pb-10">
      <Button variant="outline" onClick={() => router.push('/waiter/tables-status')} className="mb-4 rounded-full">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Orders List
      </Button>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
            <Package size={28} className="text-primary" />
            Completed Order Details
          </CardTitle>
          <CardDescription>Review the specifics of this past order.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Hash size={16} className="text-muted-foreground" />
              <strong>Order ID:</strong>
              <span className="text-muted-foreground truncate">{historicalOrder.id}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={16} className="text-muted-foreground" />
              <strong>Table:</strong>
              <span className="text-muted-foreground">{tableName}</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-muted-foreground" />
              <strong>Completed:</strong>
              <span className="text-muted-foreground">{format(new Date(historicalOrder.completedAt), "MMM d, yyyy 'at' h:mm a")}</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard size={16} className="text-muted-foreground" />
              <strong>Payment Method:</strong>
              <span className="text-muted-foreground">{paymentMethodText(historicalOrder.paymentMethod)}</span>
            </div>
          </div>

          {historicalOrder.paymentNote && (
            <div className="flex items-start gap-2 pt-2">
              <StickyNote size={16} className="text-muted-foreground mt-0.5" />
              <div>
                <strong>Payment Note:</strong>
                <p className="text-muted-foreground text-xs bg-muted/50 p-2 rounded-md mt-1">{historicalOrder.paymentNote}</p>
              </div>
            </div>
          )}
          
          <Separator className="my-4" />

          <div>
            <h4 className="text-md font-semibold mb-2 flex items-center gap-2">
                <ShoppingBag size={18} className="text-primary"/> Items Ordered ({historicalOrder.items.reduce((sum, item) => sum + item.quantity, 0)})
            </h4>
            <div className="space-y-3">
              {historicalOrder.items.map((item, index) => (
                <div key={item.uniqueId || index} className="p-3 border rounded-md bg-background hover:bg-muted/20">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-foreground">{item.menuItem.name} <Badge variant="secondary" className="font-normal">x {item.quantity}</Badge></p>
                      <p className="text-xs text-muted-foreground">₹{(item.menuItem.price || 0).toFixed(2)} each</p>
                    </div>
                    <p className="font-semibold text-foreground">₹{((item.menuItem.price || 0) * item.quantity).toFixed(2)}</p>
                  </div>
                  {item.instructions && (
                    <p className="text-xs text-accent-foreground bg-accent/10 px-2 py-1 rounded-md mt-1.5 inline-block">
                      Note: {item.instructions}
                    </p>
                  )}
                   {item.groupId && (
                    <p className="text-xs text-muted-foreground/80 mt-1">
                      (Group: {item.groupId})
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/30 p-4 mt-4 rounded-b-lg">
          <div className="flex justify-end items-center w-full">
            <span className="text-lg font-bold text-primary">
              Grand Total: ₹{historicalOrder.totalAmount.toFixed(2)}
            </span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
