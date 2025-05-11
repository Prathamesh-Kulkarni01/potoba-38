
'use client';

import type { MenuItem } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Utensils, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DishCardProps {
  dish: MenuItem;
  restaurantId: string;
  onAddToCart?: (item: MenuItem) => void; // Optional: for direct add to cart functionality
  onToggleFavorite?: (itemId: string) => void; // Optional
  isFavorite?: boolean; // Optional
  className?: string;
  context?: 'menu-listing' | 'popular-items' | 'cross-sell' | 'favorites'; // To slightly vary styling or behavior
}

export default function DishCard({ 
    dish, 
    restaurantId, 
    onAddToCart, 
    onToggleFavorite, 
    isFavorite, 
    className,
    context = 'menu-listing'
}: DishCardProps) {
  
  const isVeg = dish.dietaryTags?.some(tag => tag.toLowerCase().includes('veg')); // Basic check

  const cardContentHeight = context === 'cross-sell' ? 'h-10' : 'h-12';
  const titleSize = context === 'cross-sell' ? 'text-sm' : 'text-base';
  const priceSize = context === 'cross-sell' ? 'text-sm' : 'text-base';
  const imageSize = context === 'cross-sell' ? 'h-28' : 'h-40';

  return (
    <Card className={cn("overflow-hidden shadow-md hover:shadow-lg transition-shadow flex flex-col h-full group", className)}>
      <Link href={`/site/${restaurantId}/item/${dish.id}`} className="block">
        <div className={cn("relative w-full bg-muted", imageSize)}>
          {dish.imageUrl ? (
            <Image 
                src={dish.imageUrl} 
                alt={dish.name} 
                layout="fill" 
                objectFit="cover" 
                className="group-hover:scale-105 transition-transform duration-300"
                data-ai-hint="food dish meal"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Utensils className="w-1/2 h-1/2 opacity-50" />
            </div>
          )}
           {isVeg !== undefined && (
            <div 
                className={cn(
                    "absolute top-2 left-2 p-0.5 rounded-sm border flex items-center justify-center",
                    isVeg ? "bg-green-100 border-green-600" : "bg-red-100 border-red-600"
                )}
                title={isVeg ? "Vegetarian" : "Non-Vegetarian"}
            >
                 <div className={cn("w-1.5 h-1.5 rounded-full", isVeg ? "bg-green-600" : "bg-red-600")}></div>
            </div>
           )}
           {onToggleFavorite && (
             <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-1 right-1 h-7 w-7 bg-white/70 hover:bg-white rounded-full p-1 shadow group-hover:opacity-100 opacity-80 md:opacity-0 transition-opacity" 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(dish.id); }}
                aria-label="Toggle favorite"
            >
                <Heart size={16} className={cn(isFavorite ? "text-red-500 fill-red-500" : "text-gray-400 hover:text-red-400")} />
            </Button>
           )}
        </div>
      </Link>
      <CardHeader className="p-3">
        <Link href={`/site/${restaurantId}/item/${dish.id}`} className="block">
          <CardTitle className={cn("leading-tight hover:text-primary transition-colors truncate", titleSize)}>{dish.name}</CardTitle>
        </Link>
        {dish.description && context !== 'cross-sell' && (
            <CardDescription className={cn("text-xs text-muted-foreground mt-1 line-clamp-2", cardContentHeight)}>
                {dish.description}
            </CardDescription>
        )}
      </CardHeader>
      <CardFooter className="p-3 mt-auto flex items-center justify-between">
        <p className={cn("font-semibold text-primary", priceSize)}>${dish.price.toFixed(2)}</p>
        {onAddToCart ? (
            <Button 
                onClick={(e) => { e.stopPropagation(); onAddToCart(dish); }} 
                size={context === 'cross-sell' ? "xs" : "sm"} 
                className="bg-accent hover:bg-accent/90 text-accent-foreground whitespace-nowrap"
                disabled={!dish.availability}
            >
                <PlusCircle className="mr-1.5 h-4 w-4" />{dish.availability ? "Add" : "Unavailable"}
            </Button>
        ) : (
             <Button asChild size={context === 'cross-sell' ? "xs" : "sm"} variant="outline" className="whitespace-nowrap">
                <Link href={`/site/${restaurantId}/item/${dish.id}`}>Customize</Link>
            </Button>
        )}
      </CardFooter>
    </Card>
  );
}
