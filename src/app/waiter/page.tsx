
'use client';

import { TableCard } from '@/components/waiter/TableCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SpecialsHighlight } from '@/components/waiter/SpecialsHighlight';
import { useOrders } from '@/contexts/waiter/OrderContext';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { useMemo } from 'react';
import type { TableArea, Table as FirebaseTableType } from '@/types'; // Assuming Table is the Firestore table type

export default function TableLayoutPage() {
  const { tables, isTablesLoading } = useOrders();
  const floors = ["All", "First", "Second", "Ground", "Take Away"]; // This could be dynamic if areas are fetched

  const tablesByArea = useMemo(() => {
    const grouped: Record<string, FirebaseTableType[]> = { 'All': [] };
    tables.forEach(table => {
      grouped['All'].push(table); // Add to 'All'
      const areaName = table.areaName || 'Uncategorized'; // Use areaName or default
      if (!grouped[areaName]) {
        grouped[areaName] = [];
      }
      grouped[areaName].push(table);
    });
    // Ensure areas from a predefined list or fetched areas exist, even if empty
    // This part would need dynamic areas from Firestore in a more advanced setup
    floors.forEach(floor => {
        if (!grouped[floor]) grouped[floor] = [];
    });
    return grouped;
  }, [tables, floors]);

  const displayFloors = useMemo(() => {
    const uniqueAreaNames = new Set(tables.map(t => t.areaName || 'Uncategorized'));
    const allFloorNames = ['All', ...Array.from(uniqueAreaNames).sort()];
    return allFloorNames;
  }, [tables]);


  if (isTablesLoading) {
    return <div className="flex justify-center items-center h-full py-10"><LoadingSpinner className="h-10 w-10 text-primary" /></div>;
  }

  return (
    <div className="space-y-6 p-1">
      <Tabs defaultValue="All" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1 bg-muted/50 p-0.5 h-auto">
          {displayFloors.map(floor => (
            <TabsTrigger key={floor} value={floor} className="text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm py-2 h-full">
              {floor}
            </TabsTrigger>
          ))}
        </TabsList>
        {displayFloors.map(floor => (
          <TabsContent key={floor} value={floor}>
            {tablesByArea[floor]?.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">No tables available in {floor === 'Uncategorized' && tables.length > 0 ? 'this area (some tables are unassigned)' : floor}.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-4">
                {(tablesByArea[floor] || []).map((table) => (
                  <TableCard key={table.id} table={table} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
      <SpecialsHighlight />
    </div>
  );
}
