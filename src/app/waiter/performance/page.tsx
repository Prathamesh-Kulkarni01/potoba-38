
'use client';

import { useState, useMemo, type FormEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useOrders } from '@/contexts/waiter/OrderContext';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, BarChartBig, ListChecks, Users, Activity, Info } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { format, isToday } from 'date-fns';
import type { TipEntry } from '@/lib/types';

export default function PerformancePage() {
  const { tips, addTip, orderHistory } = useOrders();
  const { toast } = useToast();

  const [tipAmount, setTipAmount] = useState('');
  const [tipTableId, setTipTableId] = useState('');
  const [tipNotes, setTipNotes] = useState('');

  const handleAddTip = (e: FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(tipAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Tip Amount',
        description: 'Please enter a valid positive number for the tip.',
      });
      return;
    }
    addTip(amount, tipTableId, tipNotes);
    toast({
      title: 'Tip Added',
      description: `₹${amount.toFixed(2)} tip successfully logged.`,
    });
    setTipAmount('');
    setTipTableId('');
    setTipNotes('');
  };

  const todaysTips = useMemo(() => {
    return tips.filter(tip => isToday(new Date(tip.timestamp)));
  }, [tips]);

  const todaysTotalTips = useMemo(() => {
    return todaysTips.reduce((total, tip) => total + tip.amount, 0);
  }, [todaysTips]);

  const todaysCompletedOrders = useMemo(() => {
    return Array.from(orderHistory.values()).flat().filter(order => isToday(new Date(order.completedAt)));
  }, [orderHistory]);

  const ordersServedToday = useMemo(() => {
    return todaysCompletedOrders.length;
  }, [todaysCompletedOrders]);

  const tablesHandledToday = useMemo(() => {
    const uniqueTableIds = new Set(todaysCompletedOrders.map(order => order.items[0]?.menuItem.id.split('-')[0] || 'unknown')); // Assuming table ID is part of item ID or needs a proper tableId field in HistoricalOrder
    return uniqueTableIds.size;
  }, [todaysCompletedOrders]);


  return (
    <div className="space-y-6 p-1 md:p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign size={24} className="text-accent" />
            Today's Tips Tracker
          </CardTitle>
          <CardDescription>Log tips you've received during your shift.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddTip} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tipAmount">Tip Amount (₹)</Label>
                <Input
                  id="tipAmount"
                  type="number"
                  placeholder="e.g., 50.00"
                  value={tipAmount}
                  onChange={(e) => setTipAmount(e.target.value)}
                  step="0.01"
                  min="0.01"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="tipTableId">Associated Table ID (Optional)</Label>
                <Input
                  id="tipTableId"
                  type="text"
                  placeholder="e.g., t5"
                  value={tipTableId}
                  onChange={(e) => setTipTableId(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="tipNotes">Notes (Optional)</Label>
              <Textarea
                id="tipNotes"
                placeholder="e.g., Generous customer, split tip"
                value={tipNotes}
                onChange={(e) => setTipNotes(e.target.value)}
                className="mt-1 min-h-[60px]"
              />
            </div>
            <Button type="submit" className="w-full sm:w-auto rounded-full">Add Tip</Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-start space-y-3 pt-4 border-t">
          <p className="text-xl font-semibold text-foreground">
            Total Tips Today: ₹{todaysTotalTips.toFixed(2)}
          </p>
          {todaysTips.length > 0 && (
            <div className="w-full space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Recent Tips Today:</h4>
              <ul className="max-h-40 overflow-y-auto space-y-1 text-sm border p-2 rounded-md bg-muted/20">
                {todaysTips.slice(-5).reverse().map(tip => (
                  <li key={tip.id} className="flex justify-between items-center p-1 hover:bg-muted/50 rounded">
                    <span>
                      ₹{tip.amount.toFixed(2)} 
                      {tip.tableId && <span className="text-xs text-muted-foreground ml-1">(Table {tip.tableId})</span>}
                      {tip.notes && <span className="text-xs text-accent-foreground bg-accent/10 px-1.5 py-0.5 rounded-sm ml-1 truncate max-w-[100px] inline-block" title={tip.notes}>Note</span>}
                    </span>
                    <span className="text-xs text-muted-foreground">{format(new Date(tip.timestamp), 'h:mm a')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChartBig size={24} className="text-accent" />
            Shift Summary
          </CardTitle>
          <CardDescription>Overview of your performance for the current shift (today).</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-muted/30 rounded-lg flex items-center gap-3">
            <ListChecks size={32} className="text-primary" />
            <div>
              <p className="text-2xl font-semibold text-foreground">{ordersServedToday}</p>
              <p className="text-sm text-muted-foreground">Orders Served Today</p>
            </div>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg flex items-center gap-3">
            <Users size={32} className="text-primary" />
            <div>
              <p className="text-2xl font-semibold text-foreground">{tablesHandledToday}</p>
              <p className="text-sm text-muted-foreground">Tables Handled Today</p>
            </div>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg flex items-center gap-3 col-span-1 sm:col-span-2 opacity-70">
            <Activity size={32} className="text-muted-foreground" />
            <div>
              <p className="text-lg font-semibold text-muted-foreground">Average Customer Rating</p>
              <p className="text-sm text-muted-foreground italic">Feature coming soon</p>
            </div>
          </div>
           <div className="p-4 bg-muted/30 rounded-lg flex items-center gap-3 col-span-1 sm:col-span-2 opacity-70">
            <Info size={32} className="text-muted-foreground" />
            <div>
              <p className="text-lg font-semibold text-muted-foreground">Upsells Achieved</p>
              <p className="text-sm text-muted-foreground italic">Feature coming soon</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
