
'use client';

import Image from 'next/image';
import type { MenuItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Utensils } from 'lucide-react';

interface DishCardProps {
  dish: MenuItem & { createdAt: string; updatedAt: string };
  onAddToCart: (dish: MenuItem) => void;
}

export default function DishCard({ dish, onAddToCart }: DishCardProps) {
  return (
    <Card className="flex h-full transform flex-col overflow-hidden rounded-lg border border-border bg-card shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <div className="relative h-48 w-full">
        {dish.imageUrl ? (
          <Image
            src={dish.imageUrl}
            alt={dish.name}
            layout="fill"
            objectFit="cover"
            className="transition-transform duration-500 group-hover:scale-105"
            data-ai-hint="food dish delicious"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground/50" data-ai-hint="food placeholder icon">
            <Utensils className="h-16 w-16" />
          </div>
        )}
      </div>
      <CardHeader className="p-4">
        <CardTitle className="truncate text-lg font-semibold text-foreground group-hover:text-primary">
          {dish.name}
        </CardTitle>
        <p className="text-md font-bold text-primary">${dish.price.toFixed(2)}</p>
      </CardHeader>
      <CardContent className="flex-grow p-4 pt-0">
        <CardDescription className="line-clamp-3 min-h-[3.75em] text-sm text-muted-foreground">
          {dish.description || 'No description available.'}
        </CardDescription>
      </CardContent>
      <CardFooter className="mt-auto p-4">
        <Button
          onClick={() => onAddToCart(dish)}
          className="w-full bg-accent font-semibold text-accent-foreground shadow-sm transition-shadow hover:bg-accent/90 hover:shadow-md"
          disabled={!dish.availability}
        >
          <PlusCircle className="mr-2 h-5 w-5" />
          {dish.availability ? 'Add to Cart' : 'Unavailable'}
        </Button>
      </CardFooter>
    </Card>
  );
}
