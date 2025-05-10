
'use client';

import type { MenuItem } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Flame, Leaf, Star, Info, Tag, Zap } from 'lucide-react'; // Added Zap for 'new'

interface DishInfoPaneProps {
  menuItem: MenuItem & { createdAt: string; updatedAt: string };
}

export default function DishInfoPane({ menuItem }: DishInfoPaneProps) {
  const getTagIcon = (tag: string) => {
    const lowerTag = tag.toLowerCase();
    if (lowerTag.includes('spicy') || lowerTag.includes('hot')) return <Flame className="h-3 w-3 text-red-500" />;
    if (lowerTag.includes('veg')) return <Leaf className="h-3 w-3 text-green-500" />;
    if (lowerTag.includes('special')) return <Star className="h-3 w-3 text-yellow-500" />;
    if (lowerTag.includes('new')) return <Zap className="h-3 w-3 text-blue-500" />; // Example for 'new'
    return <Tag className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <div className="space-y-3 p-4 md:p-6 bg-card rounded-lg shadow-lg border-border/50">
      <h1 className="text-3xl md:text-4xl font-bold text-primary">{menuItem.name}</h1>
      <p className="text-lg text-muted-foreground">{menuItem.description || 'No description available.'}</p>
      <p className="text-2xl font-semibold text-accent">${menuItem.price.toFixed(2)}</p>
      
      <div className="flex flex-wrap gap-2 items-center">
        {menuItem.dietaryTags?.map(tag => (
          <Badge key={tag} variant="secondary" className="flex items-center gap-1.5 text-xs py-1 px-2.5 rounded-full">
            {getTagIcon(tag)}
            <span className="font-medium">{tag}</span>
          </Badge>
        ))}
        {menuItem.calories && (
          <Badge variant="outline" className="text-xs py-1 px-2.5 rounded-full flex items-center gap-1.5">
            <Info className="h-3 w-3"/> {menuItem.calories} kcal
          </Badge>
        )}
        {!menuItem.availability && (
          <Badge variant="destructive" className="text-xs py-1 px-2.5 rounded-full">Unavailable</Badge>
        )}
      </div>
    </div>
  );
}

