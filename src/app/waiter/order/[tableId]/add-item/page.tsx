
'use client';

import { OrderForm } from '@/components/waiter/OrderForm';
import { TABLES_DATA } from '@/data/waiter/tables';
import { MENU_ITEMS } from '@/data/waiter/menu';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation'; // Import useSearchParams
import { useOrders } from '@/contexts/waiter/OrderContext';
import { VoiceOrderButton } from '@/components/waiter/VoiceOrderButton';
import { useEffect } from 'react'; // Import useEffect

// The AddItemPageProps interface for params from Next.js file-system routing
interface AddItemPageProps {
  params: {
    tableId: string;
  };
}

export default function AddItemPage({ params: routeProvidedParams }: AddItemPageProps) {
  const router = useRouter();
  const contextParams = useParams(); 
  const searchParams = useSearchParams(); // For reading query parameters
  const { addItemToOrder, calculateTotal } = useOrders();

  const pageTableId = (contextParams?.tableId as string) || routeProvidedParams.tableId;
  const initialGroupId = searchParams.get('groupId') || ''; // Get groupId from query

  const table = TABLES_DATA.find(t => t.id === pageTableId);

  if (!pageTableId || !table) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold text-destructive mb-4">Table Not Found</h1>
        <p className="text-muted-foreground mb-6">The table ID specified does not exist or could not be determined.</p>
        <Button asChild>
          <Link href="/waiter">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Table Layout
          </Link>
        </Button>
      </div>
    );
  }
  
  const currentTotal = calculateTotal(pageTableId);

  return (
    <div className="space-y-6 pb-24"> 
      <VoiceOrderButton tableId={pageTableId} />
      <OrderForm 
        menuItems={MENU_ITEMS} 
        onAddItem={addItemToOrder} 
        tableId={pageTableId}      
        initialGroupId={initialGroupId} // Pass initialGroupId
      />

       <div className="fixed bottom-16 md:bottom-0 left-0 right-0 bg-background p-4 border-t shadow-lg">
        <div className="container mx-auto px-0 md:px-4 flex justify-between items-center">
            <div>
                <span className="text-sm text-muted-foreground">Current Total: </span>
                <span className="text-lg font-semibold">${currentTotal.toFixed(2)}</span>
            </div>
            <Button onClick={() => router.push(`/waiter/order/${pageTableId}`)} className="rounded-full" size="lg">
                View Order
            </Button>
        </div>
      </div>
    </div>
  );
}

    