
import { TABLES_DATA } from '@/data/waiter/tables';
import { OrderManagement } from '@/components/waiter/OrderManagement';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface OrderPageProps {
  params: {
    tableId: string;
  };
}

export default function OrderPage({ params }: OrderPageProps) {
  const table = TABLES_DATA.find(t => t.id === params.tableId);

  if (!table) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold text-destructive mb-4">Table Not Found</h1>
        <p className="text-muted-foreground mb-6">The table ID specified does not exist.</p>
        <Button asChild>
          <Link href="/waiter">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Table Layout
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Button asChild variant="outline">
          <Link href="/waiter">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tables
          </Link>
        </Button>
      </div>
      <OrderManagement table={table} />
    </div>
  );
}

export async function generateStaticParams() {
  return TABLES_DATA.map(table => ({
    tableId: table.id,
  }));
}
