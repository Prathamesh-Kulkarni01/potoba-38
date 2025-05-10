
'use client';

import type { MenuItem, MenuCategory, MenuSubcategory } from '@/types';
import DishCard from './dish-card';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuDisplaySectionProps {
  popularDishes: (MenuItem & { createdAt: string; updatedAt: string })[];
  menuItems: (MenuItem & { createdAt: string; updatedAt: string })[]; // These are already filtered by activeCategory
  allMenuItems: (MenuItem & { createdAt: string; updatedAt: string })[]; // All available items
  categories: (MenuCategory & { createdAt: string; updatedAt: string })[];
  subcategories: (MenuSubcategory & { createdAt: string; updatedAt: string })[];
  activeCategoryId: string;
  onCategorySelect: (categoryId: string) => void;
  onAddToCart: (dish: MenuItem) => void;
}

export default function MenuDisplaySection({
  popularDishes,
  menuItems,
  allMenuItems,
  categories,
  subcategories,
  activeCategoryId,
  onCategorySelect,
  onAddToCart,
}: MenuDisplaySectionProps) {

  // Display logic:
  // If activeCategoryId is 'all', show popular dishes first, then perhaps a limited set from all categories.
  // If a specific category is selected, show items from that category.

  const itemsToDisplay = activeCategoryId === 'all' ? popularDishes : menuItems;
  const sectionTitle = activeCategoryId === 'all' 
    ? "Customer Favorites" 
    : categories.find(c => c.id === activeCategoryId)?.name || "Menu";

  return (
    <section id="menu-section" className="py-12 md:py-16 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        {/* Meal Categories / Menu Tabs */}
        <div className="mb-8 md:mb-12">
          <h2 className="mb-6 text-center text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Explore Our Menu
          </h2>
          <ScrollArea className="w-full whitespace-nowrap rounded-md">
            <div className="flex space-x-3 p-2">
              <Button
                variant={activeCategoryId === 'all' ? 'default' : 'outline'}
                onClick={() => onCategorySelect('all')}
                className={cn(
                  "rounded-full px-6 py-3 text-sm font-medium transition-colors",
                  activeCategoryId === 'all' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-card text-card-foreground hover:bg-muted'
                )}
              >
                Popular
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={activeCategoryId === category.id ? 'default' : 'outline'}
                  onClick={() => onCategorySelect(category.id)}
                  className={cn(
                    "rounded-full px-6 py-3 text-sm font-medium transition-colors",
                    activeCategoryId === category.id ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-card text-card-foreground hover:bg-muted'
                  )}
                >
                  {category.name}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Dish Display Grid */}
        {itemsToDisplay.length > 0 ? (
          <>
            <h3 className="mb-8 text-center text-2xl font-semibold text-foreground">
              {sectionTitle}
            </h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {itemsToDisplay.map((dish) => (
                <DishCard key={dish.id} dish={dish} onAddToCart={onAddToCart} />
              ))}
            </div>
          </>
        ) : (
          <div className="py-16 text-center text-muted-foreground">
            <Utensils className="mx-auto mb-4 h-16 w-16 text-primary/30" />
            <p className="text-lg">
              {activeCategoryId === 'all' ? 'No popular dishes to show right now.' : `No items found in ${sectionTitle}.`}
            </p>
            <p className="text-sm">Please check back later or select another category.</p>
          </div>
        )}
        
        {/* Optionally, if 'all' is selected and popular dishes are few, show a link to full menu or more items */}
        {activeCategoryId === 'all' && popularDishes.length < allMenuItems.length && popularDishes.length < 8 && (
          <div className="mt-12 text-center">
            <Button variant="outline" onClick={() => onCategorySelect(categories[0]?.id || 'all')}>
              View Full Menu
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
