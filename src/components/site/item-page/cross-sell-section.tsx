
'use client';

import type { MenuItem } from '@/types';
import DishCard from '../public-homepage/dish-card'; // Reusing DishCard for consistency
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'; // Added ScrollBar

interface CrossSellSectionProps {
  items: (MenuItem & { createdAt: string; updatedAt: string })[];
  restaurantId: string;
  onAddToCart: (item: MenuItem) => void;
}

export default function CrossSellSection({ items, restaurantId, onAddToCart }: CrossSellSectionProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-lg border-border/50">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-foreground">Frequently Bought Together</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex space-x-4 pb-4">
            {items.map(item => (
              <div key={item.id} className="w-56 sm:w-60 flex-shrink-0"> {/* Adjusted width */}
                <DishCard 
                  dish={item} 
                  restaurantId={restaurantId} 
                  onAddToCart={onAddToCart} 
                />
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
