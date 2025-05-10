// src/components/table-management/menu-selection-for-bill.tsx
'use client';

import { useState, useMemo } from 'react';
import type { MenuItem, MenuCategory, MenuSubcategory } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { Utensils, PlusCircle, Search, X } from 'lucide-react';

interface MenuSelectionForBillProps {
  menuItems: MenuItem[];
  categories: MenuCategory[];
  subcategories: MenuSubcategory[];
  onAddItemToBill: (item: MenuItem) => void;
  onClosePanel: () => void;
}

const MenuItemCardDisplay = ({ item, onAddItemToBill }: { item: MenuItem, onAddItemToBill: (item: MenuItem) => void }) => {
  return (
    <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col text-sm">
      {item.imageUrl ? (
        <Image src={item.imageUrl} alt={item.name} width={150} height={90} className="w-full h-20 object-cover" data-ai-hint="food item" />
      ) : (
        <div className="w-full h-20 bg-muted flex items-center justify-center text-muted-foreground" data-ai-hint="food icon">
          <Utensils className="w-8 h-8" />
        </div>
      )}
      <CardHeader className="p-2">
        <CardTitle className="text-xs font-semibold leading-tight truncate">{item.name}</CardTitle>
        <p className="text-xs text-primary font-medium">${item.price.toFixed(2)}</p>
      </CardHeader>
      <CardFooter className="p-2 mt-auto">
        <Button onClick={() => onAddItemToBill(item)} size="xs" className="w-full h-7 text-xs bg-accent hover:bg-accent/90 text-accent-foreground">
          <PlusCircle className="mr-1 h-3 w-3"/>Add
        </Button>
      </CardFooter>
    </Card>
  );
};


export default function MenuSelectionForBill({
  menuItems,
  categories,
  subcategories,
  onAddItemToBill,
  onClosePanel,
}: MenuSelectionForBillProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMenuItems = useMemo(() => {
    if (!searchTerm) return menuItems.filter(item => item.availability);
    return menuItems.filter(item =>
      item.availability &&
      (item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm, menuItems]);

  const itemsBySubcategory = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    filteredMenuItems.forEach(item => {
      if (item.subcategoryId) {
        if (!map.has(item.subcategoryId)) {
          map.set(item.subcategoryId, []);
        }
        map.get(item.subcategoryId)!.push(item);
      }
    });
    return map;
  }, [filteredMenuItems]);

  const itemsDirectlyInCategory = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
     filteredMenuItems.forEach(item => {
      if (!item.subcategoryId) { // Items directly under a category
        if (!map.has(item.categoryId)) {
          map.set(item.categoryId, []);
        }
        map.get(item.categoryId)!.push(item);
      }
    });
    return map;
  }, [filteredMenuItems]);


  return (
    <div className="flex flex-col h-full bg-card text-card-foreground rounded-lg shadow-lg">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="text-lg font-semibold text-primary">Add Items to Bill</h3>
        <Button variant="ghost" size="icon" onClick={onClosePanel} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-3">
        <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                type="search"
                placeholder="Search menu items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-sm w-full"
            />
        </div>
      </div>
      <ScrollArea className="flex-grow p-3 pt-0">
        {categories.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">No menu categories found.</p>}
        <Accordion type="multiple" className="w-full">
          {categories.map(category => {
            const directItems = itemsDirectlyInCategory.get(category.id) || [];
            const subcategoriesInCategory = subcategories.filter(sub => sub.categoryId === category.id);
            
            // Determine if this category has any visible content (direct items or subcategories with items)
            const hasContent = directItems.length > 0 || subcategoriesInCategory.some(sub => (itemsBySubcategory.get(sub.id) || []).length > 0);
            if (!hasContent && searchTerm) return null; // Hide category if search yields no results within it
            if (!hasContent && !searchTerm && categories.length > 1 ) return null; // Hide empty categories unless it's the only one (or show a message)

            return (
              <AccordionItem value={category.id} key={category.id} className="border-b-0 mb-2 last:mb-0">
                <AccordionTrigger className="bg-muted/50 hover:bg-muted px-3 py-2.5 rounded-md text-md font-medium text-foreground [&[data-state=open]>svg]:text-primary">
                  {category.name}
                </AccordionTrigger>
                <AccordionContent className="pt-1 pl-1">
                  {directItems.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 p-2">
                      {directItems.map(item => (
                        <MenuItemCardDisplay key={item.id} item={item} onAddItemToBill={onAddItemToBill} />
                      ))}
                    </div>
                  )}
                  {subcategoriesInCategory.map(subcategory => {
                    const itemsInSub = itemsBySubcategory.get(subcategory.id) || [];
                    if (itemsInSub.length === 0 && searchTerm) return null; // Hide subcat if search yields no results
                    if (itemsInSub.length === 0 && !searchTerm) return null;

                    return (
                      <div key={subcategory.id} className="mt-1.5">
                        <h4 className="text-sm font-semibold text-muted-foreground px-2 py-1 bg-background rounded-t-md border-b">
                          {subcategory.name}
                        </h4>
                        <div className="grid grid-cols-2 gap-2 p-2 bg-background rounded-b-md">
                          {itemsInSub.map(item => (
                             <MenuItemCardDisplay key={item.id} item={item} onAddItemToBill={onAddItemToBill} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {!hasContent && !searchTerm && (
                     <p className="text-center text-muted-foreground text-xs py-3">No items in this category.</p>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </ScrollArea>
    </div>
  );
}
