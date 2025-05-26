
'use client';

import { TableCard } from '@/components/waiter/TableCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SpecialsHighlight } from '@/components/waiter/SpecialsHighlight';
import { useOrders } from '@/contexts/waiter/OrderContext';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { useMemo, useState, useEffect } from 'react'; // Added useState, useEffect
import type { Table as FirebaseTableType } from '@/types'; 

const DEFAULT_AREA_NAME = "General"; // For tables without an assigned area

export default function TableLayoutPage() {
  const { tables, isTablesLoading } = useOrders();
  const [activeAreaTab, setActiveAreaTab] = useState<string | undefined>(undefined);

  const tablesByArea = useMemo(() => {
    const grouped: Record<string, FirebaseTableType[]> = {};
    tables.forEach(table => {
      const areaName = table.areaName || DEFAULT_AREA_NAME;
      if (!grouped[areaName]) {
        grouped[areaName] = [];
      }
      grouped[areaName].push(table);
    });
    // Sort tables within each area by tableNumber (assuming tableNumber can be sorted lexicographically for now)
    for (const area in grouped) {
        grouped[area].sort((a, b) => {
            const numA = parseInt(a.tableNumber.replace(/[^0-9]/g, ''), 10) || 0;
            const numB = parseInt(b.tableNumber.replace(/[^0-9]/g, ''), 10) || 0;
            const strA = a.tableNumber.replace(/[0-9]/g, '').trim();
            const strB = b.tableNumber.replace(/[0-9]/g, '').trim();

            if(numA !== numB) return numA - numB;
            return strA.localeCompare(strB);
        });
    }
    return grouped;
  }, [tables]);

  const displayAreas = useMemo(() => {
    const uniqueAreaNames = new Set<string>();
    tables.forEach(table => {
      uniqueAreaNames.add(table.areaName || DEFAULT_AREA_NAME);
    });
    // A more sophisticated sort might involve an 'order' field on area objects if they were fetched separately
    return Array.from(uniqueAreaNames).sort((a,b) => {
        if (a === DEFAULT_AREA_NAME) return 1; // Push default to end if preferred
        if (b === DEFAULT_AREA_NAME) return -1;
        return a.localeCompare(b);
    });
  }, [tables]);

  useEffect(() => {
    if (displayAreas.length > 0 && !activeAreaTab) {
      setActiveAreaTab(displayAreas[0]);
    } else if (displayAreas.length > 0 && activeAreaTab && !displayAreas.includes(activeAreaTab)) {
      // If current active tab is no longer valid (e.g., area removed), switch to first available
      setActiveAreaTab(displayAreas[0]);
    } else if (displayAreas.length === 0) {
      setActiveAreaTab(undefined);
    }
  }, [displayAreas, activeAreaTab]);

  if (isTablesLoading) {
    return <div className="flex justify-center items-center h-full py-10"><LoadingSpinner className="h-10 w-10 text-primary" /></div>;
  }

  return (
    <div className="space-y-6 p-1">
      {displayAreas.length > 0 && activeAreaTab ? (
        <Tabs defaultValue={activeAreaTab} value={activeAreaTab} onValueChange={setActiveAreaTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 bg-muted/50 p-0.5 h-auto">
            {displayAreas.map(areaName => (
              <TabsTrigger 
                key={areaName} 
                value={areaName} 
                className="text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm py-2 h-full truncate"
                title={areaName}
              >
                {areaName} ({tablesByArea[areaName]?.length || 0})
              </TabsTrigger>
            ))}
          </TabsList>
          {displayAreas.map(areaName => (
            <TabsContent key={areaName} value={areaName}>
              {(tablesByArea[areaName]?.length || 0) === 0 ? (
                <p className="text-center text-muted-foreground py-10">No tables available in {areaName}.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-4">
                  {(tablesByArea[areaName] || []).map((table) => (
                    <TableCard key={table.id} table={table} />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="text-center py-10 text-muted-foreground">
          <p>No table areas or tables configured for this restaurant yet.</p>
          <p className="text-xs mt-2">Please add areas and tables in the dashboard.</p>
        </div>
      )}
      <SpecialsHighlight />
    </div>
  );
}
