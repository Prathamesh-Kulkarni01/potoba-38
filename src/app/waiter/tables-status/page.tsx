
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOrders } from '@/contexts/waiter/OrderContext';
// import { TABLES_DATA } from '@/data/waiter/tables'; // Removed static import
import Link from 'next/link';
import { ChevronRight, Clock, CheckCircle, ListChecks } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { formatDistanceToNowStrict, format } from 'date-fns';
import type { OrderItem, HistoricalOrder, Table as FirebaseTableType } from '@/lib/types';

function formatElapsedTime(startTime: number | null): string {
  if (startTime === null) return 'N/A';
  try {
    return formatDistanceToNowStrict(new Date(startTime), { addSuffix: false, unit: 'minute' }).replace(' minutes', 'm').replace(' minute', 'm');
  } catch (error) {
    console.error("Error formatting date:", error);
    return 'N/A';
  }
}

export default function TablesStatusPage() {
  const { orders, getOrderForTable, getFirstItemAddedTime, orderHistory, tables } = useOrders();
  const [, setCurrentTime] = useState(Date.now()); 

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000 * 30); 
    return () => clearInterval(timer);
  }, []);
  
  const allTableIdsWithActiveOrders = useMemo(() => {
    if (!orders) {
      console.error("OrderContext: 'orders' (activeOrders from context) is undefined in TablesStatusPage's useMemo for allTableIdsWithActiveOrders. This should not happen. Defaulting to empty array.");
      return []; // Safeguard against orders being undefined
    }
    return Array.from(orders.keys());
  }, [orders]);

  // For "Ongoing" Tab
  const getOngoingItemsCount = (tableId: string) => {
    const items = getOrderForTable(tableId);
    return items.filter(item => item.status === 'pending' || item.status === 'sent_to_kitchen' || item.status === 'ready_for_pickup').reduce((acc, item) => acc + item.quantity, 0);
  };
  const tablesWithOngoingItems = useMemo(() => {
    return allTableIdsWithActiveOrders.filter(tableId => getOngoingItemsCount(tableId) > 0);
  }, [allTableIdsWithActiveOrders, getOngoingItemsCount]);


  // For "Preparing" Tab
  const getPreparingItemsCount = (tableId: string) => {
    const items = getOrderForTable(tableId);
    return items.filter(item => item.status === 'sent_to_kitchen' || item.status === 'ready_for_pickup').reduce((acc, item) => acc + item.quantity, 0);
  };
  const tablesWithPreparingItems = useMemo(() => {
    return allTableIdsWithActiveOrders.filter(tableId => getPreparingItemsCount(tableId) > 0);
  }, [allTableIdsWithActiveOrders, getPreparingItemsCount]);

  // For "Completed" Tab
  const completedOrders = useMemo(() => {
    const allCompleted: HistoricalOrder[] = []; 
    orderHistory.forEach((historyItems) => { 
      historyItems.forEach(histOrder => {
        allCompleted.push(histOrder);
      });
    });
    return allCompleted.sort((a, b) => b.completedAt - a.completedAt);
  }, [orderHistory]);


  return (
    <div className="space-y-6 p-1">
      <div className="flex justify-end">
        <Button asChild className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
          <Link href="/waiter">Make New Order</Link>
        </Button>
      </div>

      <Tabs defaultValue="ongoing" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted/50">
          <TabsTrigger value="ongoing">Ongoing ({tablesWithOngoingItems.length})</TabsTrigger>
          <TabsTrigger value="preparing">Preparing ({tablesWithPreparingItems.length})</TabsTrigger> 
          <TabsTrigger value="completed">Completed ({completedOrders.length})</TabsTrigger> 
        </TabsList>
        
        <TabsContent value="ongoing" className="space-y-4 pt-4">
          {tablesWithOngoingItems.length === 0 && (
            <p className="text-center text-muted-foreground py-10">No ongoing orders.</p>
          )}
          {tablesWithOngoingItems.map(tableId => {
            const table = tables.find(t => t.id === tableId);
            const ongoingItemsCount = getOngoingItemsCount(tableId);
            const firstItemTime = getFirstItemAddedTime(tableId);
            if (!table || ongoingItemsCount === 0) return null;

            return (
              <Card key={`ongoing-${tableId}`} className="shadow-sm">
                <Link href={`/waiter/order/${tableId}`}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="bg-orange-500/20 text-orange-600 p-2 rounded-lg">
                          <Clock size={20} />
                       </div>
                       <div>
                        <p className="font-semibold text-foreground">Table {table.tableNumber || table.id}</p>
                        <p className="text-xs text-muted-foreground">{formatElapsedTime(firstItemTime)} ago</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      <div>
                        <p className="text-sm font-medium text-foreground">{ongoingItemsCount} Item{ongoingItemsCount === 1 ? '' : 's'}</p>
                        <p className="text-xs text-muted-foreground">Active</p>
                      </div>
                      <ChevronRight size={20} className="text-muted-foreground" />
                    </div>
                  </CardContent>
                </Link>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="preparing" className="space-y-4 pt-4">
           {tablesWithPreparingItems.length === 0 && (
            <p className="text-center text-muted-foreground py-10">No orders currently being prepared.</p>
          )}
          {tablesWithPreparingItems.map(tableId => {
            const table = tables.find(t => t.id === tableId);
            const preparingItemsCount = getPreparingItemsCount(tableId);
            const firstItemTime = getFirstItemAddedTime(tableId); 
            if (!table || preparingItemsCount === 0) return null;

            return (
              <Card key={`preparing-${tableId}`} className="shadow-sm">
                <Link href={`/waiter/order/${tableId}`}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="bg-blue-500/20 text-blue-600 p-2 rounded-lg">
                          <ListChecks size={20} />
                       </div>
                       <div>
                        <p className="font-semibold text-foreground">Table {table.tableNumber || table.id}</p>
                        <p className="text-xs text-muted-foreground">{formatElapsedTime(firstItemTime)} ago</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      <div>
                        <p className="text-sm font-medium text-foreground">{preparingItemsCount} Item{preparingItemsCount === 1 ? '' : 's'}</p>
                        <p className="text-xs text-muted-foreground">Preparing</p>
                      </div>
                      <ChevronRight size={20} className="text-muted-foreground" />
                    </div>
                  </CardContent>
                </Link>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 pt-4">
          {completedOrders.length === 0 && (
            <p className="text-center text-muted-foreground py-10">No orders completed yet.</p>
          )}
          {completedOrders.map(histOrder => {
            const table = tables.find(t => t.id === histOrder.originalTableId);
            const itemsCount = histOrder.items.reduce((acc, item) => acc + item.quantity, 0);
            return (
              <Card key={histOrder.id} className="shadow-sm">
                <Link href={`/waiter/history/${histOrder.id}`}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="bg-green-500/20 text-green-600 p-2 rounded-lg">
                          <CheckCircle size={20} />
                       </div>
                       <div>
                        <p className="font-semibold text-foreground">
                          Table {table ? (table.tableNumber || table.id) : (histOrder.originalTableId?.replace('t','') || 'N/A')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(histOrder.completedAt), "MMM d, h:mm a")}
                        </p>
                       </div>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      <div>
                        <p className="text-sm font-medium text-foreground">₹{histOrder.totalAmount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{itemsCount} Item{itemsCount === 1 ? '' : 's'}</p>
                      </div>
                      <ChevronRight size={20} className="text-muted-foreground" />
                    </div>
                  </CardContent>
                </Link>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}

