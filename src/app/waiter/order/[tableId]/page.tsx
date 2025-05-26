
'use client'; // Required for client-side hooks

import { OrderManagement } from '@/components/waiter/OrderManagement';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useOrders } from '@/contexts/waiter/OrderContext';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Interface for page props is no longer needed if not using params prop
// interface OrderPageProps {
//   params: {
//     tableId: string;
//   };
// }

export default function OrderPage() {
  const params = useParams(); // Use hook to get params
  const { tables, isTablesLoading } = useOrders();
  const tableId = params.tableId as string; // Get tableId from hook result

  const table = tables.find(t => t.id === tableId);

  if (isTablesLoading) {
    return (
      <div className="flex justify-center items-center h-full py-20">
        <LoadingSpinner className="h-10 w-10 text-primary" />
      </div>
    );
  }

  if (!table && !isTablesLoading) { // Check after loading
    return (
      <div className="text-center py-10">
         <Card>
          <CardHeader><CardTitle className="text-2xl font-semibold text-destructive mb-4">Table Not Found</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">The table ID specified does not exist.</p>
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
  
  // If table is still undefined here (though unlikely if not loading and no error thrown)
  if (!table) {
     return (
      <div className="flex justify-center items-center h-full py-20">
        <p className="text-destructive">Error: Table details could not be loaded.</p>
      </div>
    );
  }


  return (
    <div>
      <div className="mb-6">
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/waiter">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tables
          </Link>
        </Button>
      </div>
      <OrderManagement table={table} />
    </div>
  );
}
