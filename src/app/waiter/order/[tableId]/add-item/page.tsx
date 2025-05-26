
'use client';

import { OrderForm } from '@/components/waiter/OrderForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useOrders } from '@/contexts/waiter/OrderContext';
import { VoiceOrderButton } from '@/components/waiter/VoiceOrderButton';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AddItemPageProps {
  params: {
    tableId: string;
  };
}

export default function AddItemPage({ params: routeProvidedParams }: AddItemPageProps) {
  const router = useRouter();
  const contextParams = useParams(); 
  const searchParams = useSearchParams();
  const { menuItems, isMenuLoading, calculateTotal, tables } = useOrders(); // Using dynamic menuItems and tables

  const pageTableId = (contextParams?.tableId as string) || routeProvidedParams.tableId;
  const initialGroupId = searchParams.get('groupId') || '';

  const table = tables.find(t => t.id === pageTableId); // Find table from dynamic list

  if (isMenuLoading || !table) {
    return (
      <div className="flex justify-center items-center h-full py-20">
        <LoadingSpinner className="h-10 w-10 text-primary" />
      </div>
    );
  }
  
  if (!table && !isMenuLoading) { // Check after loading
    return (
      <div className="text-center py-10">
        <Card>
          <CardHeader><CardTitle className="text-2xl font-semibold text-destructive mb-4">Table Not Found</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">The table ID specified does not exist or could not be determined.</p>
            <Button asChild>
              <Link href="/waiter">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Table Layout
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const currentTotal = calculateTotal(pageTableId);

  return (
    <div className="space-y-6 pb-24"> 
      <VoiceOrderButton tableId={pageTableId} />
      <OrderForm 
        menuItems={menuItems} // Pass dynamic menu items
        onAddItem={() => {}} // This will be handled by context directly in OrderForm
        tableId={pageTableId}      
        initialGroupId={initialGroupId}
      />

       <div className="fixed bottom-16 md:bottom-0 left-0 right-0 bg-background p-4 border-t shadow-lg">
        <div className="container mx-auto px-0 md:px-4 flex justify-between items-center">
            <div>
                <span className="text-sm text-muted-foreground">Current Total: </span>
                <span className="text-lg font-semibold text-foreground">₹{currentTotal.toFixed(2)}</span>
            </div>
            <Button onClick={() => router.push(`/waiter/order/${pageTableId}`)} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground" size="lg">
                View Order
            </Button>
        </div>
      </div>
    </div>
  );
}
```