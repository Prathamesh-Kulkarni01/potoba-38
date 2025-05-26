
'use client';

import type { MenuItem, MenuCategory, MenuSubcategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from '@/components/ui/input';
import { Plus, FilterX, Search, Info, UtensilsCrossed, Lightbulb, Users as GroupIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast'; 
import { useState, useMemo, useEffect } from 'react'; 
import { cn } from '@/lib/utils';
import { useOrders } from '@/contexts/waiter/OrderContext';
import { MenuItemInfoDialog } from './MenuItemInfoDialog';
import { Badge } from '@/components/ui/badge';
import { SUGGESTIONS_MAP, type Suggestion } from '@/data/waiter/suggestions';
// import { MENU_ITEMS as ALL_MENU_ITEMS } from '@/data/waiter/menu'; // Use dynamic menu from context

interface OrderFormProps {
  menuItems: MenuItem[]; 
  categories: MenuCategory[];
  subcategories: MenuSubcategory[];
  onAddItem: (tableId: string, menuItem: MenuItem, quantity: number, instructions?: string, groupId?: string) => void; 
  tableId: string;
  initialGroupId?: string; 
}

interface Filters {
  isVegetarian: boolean;
  isSpicy: boolean;
  isGlutenFree: boolean;
}

interface ActiveSuggestionState {
  message: string;
  menuItemToSuggest?: MenuItem;
  triggerItemId: string; 
}

export function OrderForm({ menuItems: allMenuItems, categories, subcategories, onAddItem, tableId, initialGroupId }: OrderFormProps) {
  const { toast } = useToast();
  const { addItemToOrder: contextAddItemToOrder, getOrderForTable } = useOrders();

  const [searchTerm, setSearchTerm] = useState('');
  const [currentGroupId, setCurrentGroupId] = useState(initialGroupId || ''); 
  const [activeFilters, setActiveFilters] = useState<Filters>({
    isVegetarian: false,
    isSpicy: false,
    isGlutenFree: false,
  });
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [selectedItemForInfo, setSelectedItemForInfo] = useState<MenuItem | null>(null);
  const [activeSuggestion, setActiveSuggestion] = useState<ActiveSuggestionState | null>(null);

  useEffect(() => {
    if (initialGroupId) {
      setCurrentGroupId(initialGroupId);
    }
  }, [initialGroupId]);


  const handleAddItemClick = (menuItem: MenuItem) => {
    if (menuItem.availability === false) { // Use availability from dynamic menu item
      toast({
        variant: "destructive",
        title: "Item Unavailable",
        description: `${menuItem.name} is currently out of stock.`,
      });
      return;
    }

    const currentOrderItems = getOrderForTable(tableId);
    const itemAlreadyInOrderForAnyGroup = currentOrderItems.some(item => item.menuItem.id === menuItem.id);

    const effectiveGroupId = currentGroupId.trim() || undefined;
    contextAddItemToOrder(tableId, menuItem, 1, undefined, effectiveGroupId); // Use contextAddItemToOrder

    if (itemAlreadyInOrderForAnyGroup) { 
        toast({
            title: "Item Updated/Added",
            description: `${menuItem.name} (x1) added/updated ${effectiveGroupId ? `for group ${effectiveGroupId}` : `to table ${tableId.replace('t','')}`}.`,
        });
    } else {
        toast({
            title: "Item Added",
            description: `${menuItem.name} (x1) added ${effectiveGroupId ? `for group ${effectiveGroupId}` : `to Table ${tableId.replace('t', '')}`}.`,
        });
    }
    
    const suggestionConf = SUGGESTIONS_MAP[menuItem.id];
    if (suggestionConf) {
      let suggestedMenuItemDetails: MenuItem | undefined = undefined;
      if (suggestionConf.suggestedMenuItemId) {
        suggestedMenuItemDetails = allMenuItems.find(item => item.id === suggestionConf.suggestedMenuItemId && item.availability !== false);
      }
      setActiveSuggestion({
        message: suggestionConf.message,
        menuItemToSuggest: suggestedMenuItemDetails,
        triggerItemId: menuItem.id
      });
    } else {
      setActiveSuggestion(null); 
    }
  };

  const handleAddSuggestedItem = () => {
    if (activeSuggestion && activeSuggestion.menuItemToSuggest) {
      const effectiveGroupId = currentGroupId.trim() || undefined;
      contextAddItemToOrder(tableId, activeSuggestion.menuItemToSuggest, 1, undefined, effectiveGroupId);
      toast({
        title: "Suggestion Added",
        description: `${activeSuggestion.menuItemToSuggest.name} added ${effectiveGroupId ? `for group ${effectiveGroupId}` : `to table ${tableId.replace('t','')}`}.`,
      });
      setActiveSuggestion(null); 
    }
  };

  const toggleFilter = (filterKey: keyof Filters) => {
    setActiveFilters(prev => ({ ...prev, [filterKey]: !prev[filterKey] }));
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setActiveFilters({
      isVegetarian: false,
      isSpicy: false,
      isGlutenFree: false,
    });
  };

  const anyFilterActive = searchTerm || activeFilters.isVegetarian || activeFilters.isSpicy || activeFilters.isGlutenFree;

  const filteredAndSortedMenuItems = useMemo(() => {
    let items = allMenuItems.filter(item => item.availability !== false);

    if (searchTerm) {
      items = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (categories.find(c => c.id === item.categoryId)?.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (activeFilters.isVegetarian) items = items.filter(item => item.isVegetarian === true);
    if (activeFilters.isSpicy) items = items.filter(item => item.isSpicy === true);
    if (activeFilters.isGlutenFree) items = items.filter(item => item.isGlutenFree === true);
    
    return items.sort((a, b) => a.order - b.order);
  }, [allMenuItems, searchTerm, activeFilters, categories]);


  const openInfoDialog = (item: MenuItem) => {
    setSelectedItemForInfo(item);
    setIsInfoDialogOpen(true);
  };

  const defaultTab = categories.length > 0 ? categories[0].id : "all_items";

  return (
    <div className="space-y-4">
      <div className="p-1 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search menu items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 rounded-full"
          />
        </div>
        <div className="relative">
          <GroupIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Group ID / Seat # (Optional)"
            value={currentGroupId}
            onChange={(e) => setCurrentGroupId(e.target.value)}
            className="pl-10 h-11 rounded-full bg-accent/10 border-accent/30 focus:border-accent"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Button
            variant={activeFilters.isVegetarian ? "default" : "outline"}
            size="sm"
            onClick={() => toggleFilter('isVegetarian')}
            className={cn("rounded-full text-sm px-3 h-9", activeFilters.isVegetarian && "bg-green-600 hover:bg-green-700 text-white border-green-600")}
          >
            Veg
          </Button>
          <Button
            variant={activeFilters.isSpicy ? "default" : "outline"}
            size="sm"
            onClick={() => toggleFilter('isSpicy')}
            className={cn("rounded-full text-sm px-3 h-9", activeFilters.isSpicy && "bg-red-600 hover:bg-red-700 text-white border-red-600")}
          >
            Spicy
          </Button>
          <Button
            variant={activeFilters.isGlutenFree ? "default" : "outline"}
            size="sm"
            onClick={() => toggleFilter('isGlutenFree')}
            className={cn("rounded-full text-sm px-3 h-9", activeFilters.isGlutenFree && "bg-blue-600 hover:bg-blue-700 text-white border-blue-600")}
          >
            Gluten-Free
          </Button>
          {anyFilterActive && (
             <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="rounded-full text-xs px-3 h-9 text-muted-foreground hover:text-foreground"
              >
                <FilterX size={14} className="mr-1" /> Clear
              </Button>
          )}
        </div>
      </div>

      {activeSuggestion && (
        <Card className="my-4 border-accent shadow-md">
          <CardHeader className="flex flex-row items-center gap-2 pb-2 pt-3 px-4">
            <Lightbulb className="h-5 w-5 text-accent" />
            <CardTitle className="text-base text-accent">Smart Suggestion</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-sm text-foreground mb-2">{activeSuggestion.message}</p>
            {activeSuggestion.menuItemToSuggest && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-md bg-muted/50">
                <div>
                  <p className="font-medium text-foreground">{activeSuggestion.menuItemToSuggest.name}</p>
                  <p className="text-xs text-muted-foreground">₹{activeSuggestion.menuItemToSuggest.price.toFixed(2)}</p>
                </div>
                <Button 
                  onClick={handleAddSuggestedItem} 
                  size="sm" 
                  className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 w-full sm:w-auto"
                >
                  <Plus size={16} className="mr-1" /> Add to Order
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue={defaultTab} className="w-full" key={defaultTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1 bg-muted/30 p-1 h-auto">
          {categories.length > 0 ? categories.map(category => (
            <TabsTrigger key={category.id} value={category.id} className="text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm py-2.5 truncate" title={category.name}>
              {category.name}
            </TabsTrigger>
          )) : (
             <TabsTrigger value="all_items" disabled className="text-xs sm:text-sm col-span-full">No Categories</TabsTrigger>
          )}
        </TabsList>
        {categories.length > 0 ? categories.map(category => {
          const itemsDirectlyInCategory = filteredAndSortedMenuItems.filter(
            item => item.categoryId === category.id && !item.subcategoryId
          );
          const subcategoriesInCategory = subcategories.filter(sub => sub.categoryId === category.id);

          return (
            <TabsContent key={category.id} value={category.id} className="pt-4">
              <div className="space-y-3">
                {/* Render items directly under category */}
                {itemsDirectlyInCategory.length > 0 && (
                  <div className="space-y-3">
                    {itemsDirectlyInCategory.map(item => (
                      <Card key={item.id} className={cn("p-0 overflow-hidden shadow-sm")}>
                        <CardContent className="p-3 flex items-start justify-between">
                          {/* Item details */}
                          <div className="flex-grow">
                            <p className="font-medium text-base leading-tight">{item.name}</p>
                            <p className="text-sm text-muted-foreground">₹{item.price.toFixed(2)}</p>
                            <div className="flex gap-1 mt-1.5 flex-wrap items-center">
                                {item.isVegetarian && <Badge className="text-xs text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full border border-green-200">Veg</Badge>}
                                {item.isSpicy && <Badge className="text-xs text-red-700 bg-red-100 px-1.5 py-0.5 rounded-full border border-red-200">Spicy</Badge>}
                                {item.isGlutenFree && <Badge className="text-xs text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full border border-blue-200">GF</Badge>}
                                {item.tags && item.tags.map(tag => ( <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0.5 rounded-full capitalize">{tag}</Badge> ))}
                            </div>
                          </div>
                          {/* Action buttons */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button onClick={() => openInfoDialog(item)} variant="ghost" size="icon" className="rounded-full h-9 w-9 text-muted-foreground hover:text-primary" aria-label={`More info about ${item.name}`}><Info size={18} /></Button>
                            <Button onClick={() => handleAddItemClick(item)} variant="outline" size="sm" className="rounded-full border-primary text-primary hover:bg-primary/10 aspect-square h-9 w-9 p-0" aria-label={`Add ${item.name} to order`}><Plus size={18} /></Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Render subcategories and their items */}
                {subcategoriesInCategory.map(subcategory => {
                  const itemsInSubcategory = filteredAndSortedMenuItems.filter(
                    item => item.subcategoryId === subcategory.id
                  );
                  if (itemsInSubcategory.length === 0 && searchTerm) return null; // Hide if search yields no results in subcat
                  if (itemsInSubcategory.length === 0 && !searchTerm) return null;

                  return (
                    <div key={subcategory.id} className="mt-4">
                      <h4 className="text-md font-semibold text-muted-foreground mb-2 px-1">{subcategory.name}</h4>
                      <div className="space-y-3">
                        {itemsInSubcategory.map(item => (
                           <Card key={item.id} className={cn("p-0 overflow-hidden shadow-sm")}>
                            <CardContent className="p-3 flex items-start justify-between">
                                <div className="flex-grow">
                                    <p className="font-medium text-base leading-tight">{item.name}</p>
                                    <p className="text-sm text-muted-foreground">₹{item.price.toFixed(2)}</p>
                                    <div className="flex gap-1 mt-1.5 flex-wrap items-center">
                                        {item.isVegetarian && <Badge className="text-xs text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full border border-green-200">Veg</Badge>}
                                        {item.isSpicy && <Badge className="text-xs text-red-700 bg-red-100 px-1.5 py-0.5 rounded-full border border-red-200">Spicy</Badge>}
                                        {item.isGlutenFree && <Badge className="text-xs text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full border border-blue-200">GF</Badge>}
                                        {item.tags && item.tags.map(tag => ( <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0.5 rounded-full capitalize">{tag}</Badge> ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <Button onClick={() => openInfoDialog(item)} variant="ghost" size="icon" className="rounded-full h-9 w-9 text-muted-foreground hover:text-primary" aria-label={`More info about ${item.name}`}><Info size={18} /></Button>
                                    <Button onClick={() => handleAddItemClick(item)} variant="outline" size="sm" className="rounded-full border-primary text-primary hover:bg-primary/10 aspect-square h-9 w-9 p-0" aria-label={`Add ${item.name} to order`}><Plus size={18} /></Button>
                                </div>
                            </CardContent>
                           </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {itemsDirectlyInCategory.length === 0 && subcategoriesInCategory.every(sub => (filteredAndSortedMenuItems.filter(item => item.subcategoryId === sub.id).length === 0)) && (
                    <p className="text-muted-foreground text-center py-6">No menu items match your current filters in this category.</p>
                )}
              </div>
            </TabsContent>
          );
        }) : (
           <TabsContent value="all_items" className="pt-4">
              <p className="text-muted-foreground text-center py-10">
                {allMenuItems.length === 0 ? "No menu items available." : "No items match your current search or filters."}
              </p>
            </TabsContent>
        )}
      </Tabs>
      <MenuItemInfoDialog
        isOpen={isInfoDialogOpen}
        onOpenChange={setIsInfoDialogOpen}
        menuItem={selectedItemForInfo}
      />
    </div>
  );
}
