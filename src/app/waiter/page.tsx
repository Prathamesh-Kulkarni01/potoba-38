
'use client';

import { TableCard } from '@/components/waiter/TableCard';
import { TABLES_DATA } from '@/data/waiter/tables';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SpecialsHighlight } from '@/components/waiter/SpecialsHighlight'; // Import the new component

export default function TableLayoutPage() {
  const floors = ["All", "First", "Second", "Ground", "Take Away"];

  return (
    <div className="space-y-6 p-1">
      <Tabs defaultValue="All" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-muted/50">
          {floors.map(floor => (
            <TabsTrigger key={floor} value={floor} className="text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
              {floor}
            </TabsTrigger>
          ))}
        </TabsList>
        {floors.map(floor => (
          <TabsContent key={floor} value={floor}>
            {TABLES_DATA.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">No tables available.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-4">
                {TABLES_DATA.map((table) => (
                  <TableCard key={table.id} table={table} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
      <SpecialsHighlight /> {/* Moved the specials highlight component here */}
    </div>
  );
}
