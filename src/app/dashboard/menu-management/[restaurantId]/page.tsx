
// src/app/dashboard/menu-management/[restaurantId]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { getRestaurant } from '@/lib/firebase/firestore';
import {
  getMenuCategories, addMenuCategory, updateMenuCategory, deleteMenuCategory,
  getMenuSubcategories, addMenuSubcategory, updateMenuSubcategory, deleteMenuSubcategory,
  getMenuItems, addMenuItem, updateMenuItem, deleteMenuItem
} from '@/lib/firebase/menu';
import type { RestaurantProfile, MenuCategory, MenuSubcategory, MenuItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Search, Edit3, Trash2, Utensils, AlertTriangle, GripVertical, ArrowDownUp } from 'lucide-react';
import Image from 'next/image';
import { Timestamp } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import CategoryForm from '@/components/menu/category-form';
import SubcategoryForm from '@/components/menu/subcategory-form';
import MenuItemForm, { type MenuItemFormValues } from '@/components/menu/menu-item-form';
import ConfirmationDialog from '@/components/shared/confirmation-dialog';
import ImportExportActionsDialog from '@/components/menu/import-export-actions-dialog';
import ImportMenuImageDialog from '@/components/menu/import-menu-image-dialog';
// import ImportMenuCsvDialog from '@/components/menu/import-menu-csv-dialog'; // Placeholder for CSV import

interface MenuItemDisplayCardProps {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
  isOwner: boolean;
}

const MenuItemDisplayCard = ({ item, onEdit, onDelete, isOwner }: MenuItemDisplayCardProps) => (
  <Card className="overflow-hidden flex flex-col h-full shadow-md hover:shadow-lg transition-shadow relative group">
    {item.imageUrl ? (
      <Image src={item.imageUrl} alt={item.name} width={300} height={180} className="w-full h-40 object-cover" data-ai-hint="food dish" />
    ) : (
      <div className="w-full h-40 bg-muted flex items-center justify-center text-muted-foreground" data-ai-hint="placeholder food">
        <Utensils className="w-12 h-12" />
      </div>
    )}
    <CardHeader className="p-4">
      <div className="flex justify-between items-start">
        <CardTitle className="text-lg leading-tight">{item.name}</CardTitle>
        <p className="text-lg text-primary font-semibold whitespace-nowrap">${item.price.toFixed(2)}</p>
      </div>
      {!item.availability && <Badge variant="destructive" className="mt-1 w-fit">Unavailable</Badge>}
    </CardHeader>
    <CardContent className="p-4 pt-0 flex-grow">
      <p className="text-xs text-muted-foreground mb-1 h-10 overflow-y-auto">{item.description}</p>
      {item.dietaryTags && item.dietaryTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {item.dietaryTags.map(tag => <Badge key={tag} variant="outline" clascreateDummyCategoriessName="text-xs">{tag}</Badge>)}
        </div>
      )}
    </CardContent>
    <CardFooter className="p-4 pt-0 mt-auto">
      {isOwner && (
        <div className="flex justify-end space-x-2 w-full">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => onEdit(item)}><Edit3 className="h-4 w-4" /></Button>
          <Button variant="destructive" size="sm" className="h-8 w-8 p-0" onClick={() => onDelete(item)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      )}
    </CardFooter>
  </Card>
);


export default function MenuManagementPage() {
  const params = useParams();
  const restaurantId = params.restaurantId as string;
  const { user, role, initialLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [subcategories, setSubcategories] = useState<MenuSubcategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [filteredMenuItems, setFilteredMenuItems] = useState<MenuItem[]>([]);

  // Modal states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);

  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<MenuSubcategory | null>(null);
  const [parentCategoryIdForNewSub, setParentCategoryIdForNewSub] = useState<string | null>(null);

  const [isMenuItemModalOpen, setIsMenuItemModalOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [parentCategoryForItem, setParentCategoryForItem] = useState<string | null>(null);
  const [parentSubcategoryForItem, setParentSubcategoryForItem] = useState<string | null>(null);

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    type: 'category' | 'subcategory' | 'item';
    data: any;
    title: string;
    description: string;
  } | null>(null);

  const [showImportExportDialog, setShowImportExportDialog] = useState(false);
  const [showImportImageDialog, setShowImportImageDialog] = useState(false);
  const [showImportCsvDialog, setShowImportCsvDialog] = useState(false); // Placeholder state

  const fetchData = useCallback(async () => {
    if (!restaurantId || !user) return;
    setPageLoading(true);
    try {
      const [restaurantData, fetchedCategories, fetchedSubcategories, fetchedMenuItems] = await Promise.all([
        getRestaurant(restaurantId),
        getMenuCategories(restaurantId),
        getMenuSubcategories(restaurantId), 
        getMenuItems(restaurantId) 
      ]);

      if (restaurantData && (restaurantData.ownerId === user.uid || role === 'staff')) {
        setRestaurant(restaurantData);
        setCategories(fetchedCategories.sort((a, b) => a.order - b.order));
        setSubcategories(fetchedSubcategories.sort((a, b) => a.order - b.order));
        setMenuItems(fetchedMenuItems.sort((a, b) => a.order - b.order));
      } else {
        toast({ variant: "destructive", title: "Access Denied", description: "Restaurant not found or you don't have permission." });
        router.replace('/dashboard');
      }
    } catch (error) {
      console.error("Error fetching menu data:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load menu data." });
    } finally {
      setPageLoading(false);
    }
  }, [restaurantId, user, role, router, toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || (role !== 'owner' && role !== 'staff')) {
      router.replace('/dashboard');
      return;
    }
    if (role === 'staff' && user.restaurantId !== restaurantId) {
      router.replace('/dashboard');
      return;
    }
    if (restaurantId) {
      fetchData();
    } else {
      router.replace('/dashboard');
    }
  }, [restaurantId, user, role, authLoading, router, fetchData]);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredMenuItems(menuItems);
      return;
    }
    setFilteredMenuItems(
      menuItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [searchTerm, menuItems]);

  const handleCategorySubmit = async (values: z.infer<typeof import('@/components/menu/category-form').categoryFormSchema>, categoryIdToUpdate?: string) => {
    setFormSubmitting(true);
    try {
      if (categoryIdToUpdate) {
        await updateMenuCategory(restaurantId, categoryIdToUpdate, values);
        toast({ title: "Category Updated", description: `${values.name} has been updated.` });
      } else {
        await addMenuCategory(restaurantId, values);
        toast({ title: "Category Added", description: `${values.name} has been added.` });
      }
      fetchData(); 
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to save category." });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleSubcategorySubmit = async (values: z.infer<typeof import('@/components/menu/subcategory-form').subcategoryFormSchema>, subcategoryIdToUpdate?: string) => {
    if (!parentCategoryIdForNewSub && !editingSubcategory?.categoryId) {
      toast({ variant: "destructive", title: "Error", description: "Parent category ID is missing." });
      return;
    }
    const targetCategoryId = editingSubcategory?.categoryId || parentCategoryIdForNewSub!;
    setFormSubmitting(true);
    try {
      if (subcategoryIdToUpdate) {
        await updateMenuSubcategory(restaurantId, targetCategoryId, subcategoryIdToUpdate, values);
        toast({ title: "Subcategory Updated", description: `${values.name} has been updated.` });
      } else {
        await addMenuSubcategory(restaurantId, targetCategoryId, values);
        toast({ title: "Subcategory Added", description: `${values.name} has been added.` });
      }
      fetchData();
      setIsSubcategoryModalOpen(false);
      setEditingSubcategory(null);
      setParentCategoryIdForNewSub(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to save subcategory." });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleMenuItemSubmit = async (values: MenuItemFormValues, itemIdToUpdate?: string) => {
    if (!parentCategoryForItem && !editingMenuItem?.categoryId) {
      toast({ variant: "destructive", title: "Error", description: "Parent category ID is missing for the item." });
      return;
    }
    const targetCategoryId = editingMenuItem?.categoryId || parentCategoryForItem!;
    const targetSubcategoryId = editingMenuItem?.subcategoryId || parentSubcategoryForItem;

    setFormSubmitting(true);
    try {
      const itemDataToSave = { ...values };

      if (itemIdToUpdate) {
        await updateMenuItem(restaurantId, targetCategoryId, targetSubcategoryId, itemIdToUpdate, itemDataToSave);
        toast({ title: "Menu Item Updated", description: `${values.name} has been updated.` });
      } else {
        await addMenuItem(restaurantId, targetCategoryId, targetSubcategoryId, itemDataToSave);
        toast({ title: "Menu Item Added", description: `${values.name} has been added.` });
      }
      fetchData();
      setIsMenuItemModalOpen(false);
      setEditingMenuItem(null);
      setParentCategoryForItem(null);
      setParentSubcategoryForItem(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to save menu item." });
    } finally {
      setFormSubmitting(false);
    }
  };

  const openDeleteConfirmation = (type: 'category' | 'subcategory' | 'item', data: any) => {
    let title = '';
    let description = 'Are you sure you want to delete this? This action cannot be undone.';
    if (type === 'category') {
      title = `Delete Category: ${data.name}`;
      description += ' All associated subcategories and items will also be deleted.';
    } else if (type === 'subcategory') {
      title = `Delete Subcategory: ${data.name}`;
      description += ' All associated items will also be deleted.';
    } else if (type === 'item') {
      title = `Delete Item: ${data.name}`;
    }
    setDeleteConfirmation({ isOpen: true, type, data, title, description });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;
    setFormSubmitting(true);
    const { type, data } = deleteConfirmation;
    try {
      if (type === 'category') {
        await deleteMenuCategory(restaurantId, data.id);
        toast({ title: "Category Deleted", description: `${data.name} and its contents have been deleted.` });
      } else if (type === 'subcategory') {
        await deleteMenuSubcategory(restaurantId, data.categoryId, data.id);
        toast({ title: "Subcategory Deleted", description: `${data.name} and its items have been deleted.` });
      } else if (type === 'item') {
        await deleteMenuItem(restaurantId, data.categoryId, data.subcategoryId, data.id);
        toast({ title: "Menu Item Deleted", description: `${data.name} has been deleted.` });
      }
      fetchData();
      setDeleteConfirmation(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Deletion Failed", description: error.message || "Could not delete the item." });
    } finally {
      setFormSubmitting(false);
    }
  };
  
  const handleExportMenu = () => {
    // Placeholder for export functionality
    toast({ title: "Export Menu", description: "Export functionality coming soon!" });
  };


  if (authLoading || pageLoading) {
    return <div className="flex h-full items-center justify-center"><LoadingSpinner className="h-10 w-10 text-primary" /></div>;
  }
  if (!restaurant) {
    return <Card><CardHeader><CardTitle>Error</CardTitle></CardHeader><CardContent><p>Restaurant not found or no permission.</p></CardContent></Card>;
  }
  const isOwner = role === 'owner';
  return (
    <div className="space-y-6 max-w-full">
      <Card className="shadow-xl">
        {/* <CardHeader>
          <CardTitle className="text-2xl md:text-3xl">Menu Management for {restaurant.name}</CardTitle>
          <CardDescription>Organize categories, subcategories, and items for your restaurant's menu.</CardDescription>
        </CardHeader> */}
        <CardContent className="space-y-6 mt-2">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
            <div className="relative w-full md:w-2/5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input placeholder="Search menu items..." className="pl-10 w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            {isOwner && (
              <div className="flex gap-2 w-full md:w-auto">
                <Button 
                  variant="outline" 
                  className="flex-1 md:flex-initial"
                  onClick={() => setShowImportExportDialog(true)}
                >
                  <ArrowDownUp className="mr-2 h-4 w-4" /> Import/Export
                </Button>
                <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex-1 md:flex-initial bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => { setEditingCategory(null); setIsCategoryModalOpen(true); }}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add New Category
                    </Button>
                  </DialogTrigger>
                  {isCategoryModalOpen && (
                    <CategoryForm
                      restaurantId={restaurantId}
                      category={editingCategory}
                      onSubmit={handleCategorySubmit}
                      onClose={() => { setIsCategoryModalOpen(false); setEditingCategory(null); }}
                      isLoading={formSubmitting}
                    />
                  )}
                </Dialog>
              </div>
            )}
          </div>

          {categories.length > 0 ? (
            <Tabs defaultValue={categories[0]?.id || ""} className="w-full">
              <div className="w-full overflow-x-auto">
                <TabsList className="flex w-full h-full flex-wrap  gap-2 px-4 scrollbar-thin scrollbar-thumb-muted-foreground scrollbar-track-transparent">
                  {categories.map(category => (
                    <TabsTrigger
                      key={category.id}
                      value={category.id}
                      className="shrink-0"
                    >
                      {category.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {categories.map(category => (
                <TabsContent key={category.id} value={category.id}>
                  <Card className="mb-6 border-primary/50 shadow-md">
                    <CardHeader className="flex w-full flex-col md:flex-1 md:flex-row justify-between items-start md:items-center bg-muted/30 p-4 rounded-t-lg">
                      <div className="flex  min-w-[calc(100%-300px)] flex-row gap-2 justify-between md:mt-4 ">
                        <div className="mb-2 md:mb-0 flex-1">
                          <CardTitle className="text-xl">{category.name}</CardTitle>
                          <CardDescription>Manage items and subcategories within {category.name}.</CardDescription>
                        </div>
                        <div className="flex flex-row ">
                          <Button variant="outline"  size="sm" onClick={() => { setEditingCategory(category); setIsCategoryModalOpen(true); }}><Edit3 className="mr-2 h-3 w-3" /> </Button>
                          <Button variant="outline" size="sm" onClick={() => openDeleteConfirmation('category', category)} className="  text-destructive  hover:bg-destructive/10"><Trash2 className="mr-2 h-3 w-3" /></Button>
                        </div>
                      </div>
                      {isOwner && (
                        <div className="flex flex-nowrap gap-2 flex-1  w-full">
                          <Dialog open={isSubcategoryModalOpen && parentCategoryIdForNewSub === category.id && !editingSubcategory} onOpenChange={(isOpen) => { if (!isOpen) { setIsSubcategoryModalOpen(false); setParentCategoryIdForNewSub(null); setEditingSubcategory(null); } }}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className=" ml-2 bg-accent flex-1 md:flex-none  md:w-36 hover:bg-accent/80 text-accent-foreground" onClick={() => { setEditingSubcategory(null); setParentCategoryIdForNewSub(category.id); setIsSubcategoryModalOpen(true); }}>
                                <PlusCircle className="mr-2 h-3 w-3" /> Subcategory
                              </Button>
                            </DialogTrigger>
                            {isSubcategoryModalOpen && parentCategoryIdForNewSub === category.id && !editingSubcategory && (
                              <SubcategoryForm
                                restaurantId={restaurantId}
                                categoryId={category.id}
                                onSubmit={handleSubcategorySubmit}
                                onClose={() => { setIsSubcategoryModalOpen(false); setParentCategoryIdForNewSub(null); }}
                                isLoading={formSubmitting}
                              />
                            )}
                          </Dialog>
                          <Dialog open={isMenuItemModalOpen && parentCategoryForItem === category.id && parentSubcategoryForItem === null && !editingMenuItem} onOpenChange={(isOpen) => { if (!isOpen) { setIsMenuItemModalOpen(false); setParentCategoryForItem(null); setParentSubcategoryForItem(null); setEditingMenuItem(null); } }}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="bg-primary flex-1 md:flex-none md:w-36 hover:bg-primary/80 text-primary-foreground" onClick={() => { setEditingMenuItem(null); setParentCategoryForItem(category.id); setParentSubcategoryForItem(null); setIsMenuItemModalOpen(true); }}>
                                <PlusCircle className="mr-2 h-3 w-3" />  Item
                              </Button>
                            </DialogTrigger>
                            {isMenuItemModalOpen && parentCategoryForItem === category.id && parentSubcategoryForItem === null && !editingMenuItem && (
                              <MenuItemForm
                                restaurantId={restaurantId}
                                categoryId={category.id}
                                onSubmit={handleMenuItemSubmit}
                                onClose={() => { setIsMenuItemModalOpen(false); setParentCategoryForItem(null); setParentSubcategoryForItem(null); }}
                                isLoading={formSubmitting}
                              />
                            )}
                          </Dialog>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="p-4">
                      {filteredMenuItems.filter(item => item.categoryId === category.id && !item.subcategoryId).length > 0 && (
                        <>
                          <h4 className="text-md font-semibold mt-0 mb-3 text-muted-foreground pl-1">Items in {category.name} (Direct)</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                            {filteredMenuItems
                              .filter(item => item.categoryId === category.id && !item.subcategoryId)
                              .sort((a, b) => a.order - b.order)
                              .map(item => (
                                <MenuItemDisplayCard key={item.id} item={item} isOwner={isOwner}
                                  onEdit={(itemToEdit) => { setEditingMenuItem(itemToEdit); setIsMenuItemModalOpen(true); }}
                                  onDelete={(itemToDelete) => openDeleteConfirmation('item', itemToDelete)}
                                />
                              ))}
                          </div>
                        </>
                      )}

                      {subcategories.filter(sub => sub.categoryId === category.id).sort((a, b) => a.order - b.order).map(subcategory => (
                        <div key={subcategory.id} className="mt-4">
                          <div className="flex md:flex-row justify-between items-start md:items-center mb-3 p-3 bg-muted/50 rounded-md border">
                            <div className="flex w-full flex-row gap-2 justify-between items-center ">
                              <h4 className="text-lg font-semibold mb-2 md:mb-0">{subcategory.name}</h4>
                              <div className="flex flex-row ">
                                <Button variant="outline" className='w-22' size="xs" onClick={() => { setEditingSubcategory(subcategory); setParentCategoryIdForNewSub(category.id); setIsSubcategoryModalOpen(true); }}><Edit3 className="mr-1 h-3 w-3" /> </Button>
                                <Button variant="outline" size="xs" className="w-22 text-destructive  hover:bg-destructive/10" onClick={() => openDeleteConfirmation('subcategory', subcategory)}><Trash2 className="mr-1 h-3 w-3" /></Button>
                              </div>
                            </div>
                            {isOwner && (
                              <div className="flex  m-1">
                                <Dialog open={isMenuItemModalOpen && parentSubcategoryForItem === subcategory.id && !editingMenuItem} onOpenChange={(isOpen) => { if (!isOpen) { setIsMenuItemModalOpen(false); setParentCategoryForItem(null); setParentSubcategoryForItem(null); setEditingMenuItem(null); } }}>
                                  <DialogTrigger asChild >
                                    <Button variant="default" size="xs" className="max-w-20  bg-primary hover:bg-primary/80 text-primary-foreground" onClick={() => { setEditingMenuItem(null); setParentCategoryForItem(category.id); setParentSubcategoryForItem(subcategory.id); setIsMenuItemModalOpen(true); }}>
                                      <PlusCircle className="mr-1 h-2 w-2" /> 
                                    </Button>
                                  </DialogTrigger>
                                  {isMenuItemModalOpen && parentSubcategoryForItem === subcategory.id && !editingMenuItem && (
                                    <MenuItemForm
                                      restaurantId={restaurantId}
                                      categoryId={category.id}
                                      subcategoryId={subcategory.id}
                                      onSubmit={handleMenuItemSubmit}
                                      onClose={() => { setIsMenuItemModalOpen(false); setParentCategoryForItem(null); setParentSubcategoryForItem(null); }}
                                      isLoading={formSubmitting}
                                    />
                                  )}
                                </Dialog>
                              </div>
                            )}
                          </div>
                          {filteredMenuItems.filter(item => item.subcategoryId === subcategory.id).length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                              {filteredMenuItems
                                .filter(item => item.subcategoryId === subcategory.id)
                                .sort((a, b) => a.order - b.order)
                                .map(item => (
                                  <MenuItemDisplayCard key={item.id} item={item} isOwner={isOwner}
                                    onEdit={(itemToEdit) => { setEditingMenuItem(itemToEdit); setIsMenuItemModalOpen(true); }}
                                    onDelete={(itemToDelete) => openDeleteConfirmation('item', itemToDelete)}
                                  />
                                ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground pl-1">No items in this subcategory {searchTerm && 'matching your search, or no items exist yet'}.</p>
                          )}
                        </div>
                      ))}
                      {subcategories.filter(sub => sub.categoryId === category.id).length === 0 && filteredMenuItems.filter(item => item.categoryId === category.id && !item.subcategoryId).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No subcategories or direct items found for "{category.name}" {searchTerm && 'matching your search.'}</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <div className="text-center py-10">
              <Utensils className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Categories Yet</h3>
              <p className="text-muted-foreground mb-4">Start building your menu by adding a category.</p>
              {isOwner && (
                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => { setEditingCategory(null); setIsCategoryModalOpen(true); }}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add New Category
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {isCategoryModalOpen && editingCategory && (
        <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
          <CategoryForm
            restaurantId={restaurantId}
            category={editingCategory}
            onSubmit={handleCategorySubmit}
            onClose={() => { setIsCategoryModalOpen(false); setEditingCategory(null); }}
            isLoading={formSubmitting}
          />
        </Dialog>
      )}

      {isSubcategoryModalOpen && editingSubcategory && (
        <Dialog open={isSubcategoryModalOpen} onOpenChange={(isOpen) => { if (!isOpen) { setIsSubcategoryModalOpen(false); setEditingSubcategory(null); setParentCategoryIdForNewSub(null); } }}>
          <SubcategoryForm
            restaurantId={restaurantId}
            categoryId={editingSubcategory.categoryId}
            subcategory={editingSubcategory}
            onSubmit={handleSubcategorySubmit}
            onClose={() => { setIsSubcategoryModalOpen(false); setEditingSubcategory(null); setParentCategoryIdForNewSub(null); }}
            isLoading={formSubmitting}
          />
        </Dialog>
      )}

      {isMenuItemModalOpen && editingMenuItem && (
        <Dialog open={isMenuItemModalOpen} onOpenChange={(isOpen) => { if (!isOpen) { setIsMenuItemModalOpen(false); setEditingMenuItem(null); setParentCategoryForItem(null); setParentSubcategoryForItem(null); } }}>
          <MenuItemForm
            restaurantId={restaurantId}
            categoryId={editingMenuItem.categoryId}
            subcategoryId={editingMenuItem.subcategoryId}
            menuItem={editingMenuItem}
            onSubmit={handleMenuItemSubmit}
            onClose={() => { setIsMenuItemModalOpen(false); setEditingMenuItem(null); setParentCategoryForItem(null); setParentSubcategoryForItem(null); }}
            isLoading={formSubmitting}
          />
        </Dialog>
      )}

      {deleteConfirmation?.isOpen && (
        <ConfirmationDialog
          isOpen={deleteConfirmation.isOpen}
          onClose={() => setDeleteConfirmation(null)}
          onConfirm={confirmDelete}
          title={deleteConfirmation.title}
          description={deleteConfirmation.description}
          isLoading={formSubmitting}
        />
      )}

      <ImportExportActionsDialog
        isOpen={showImportExportDialog}
        onClose={() => setShowImportExportDialog(false)}
        onImportImage={() => {
          setShowImportExportDialog(false);
          setShowImportImageDialog(true);
        }}
        onImportCsv={() => {
          setShowImportExportDialog(false);
          setShowImportCsvDialog(true); // You'll create this dialog component
          toast({title: "Import CSV", description: "CSV import coming soon!"});
        }}
        onExportMenu={handleExportMenu}
      />
      
      <ImportMenuImageDialog
        isOpen={showImportImageDialog}
        onClose={() => setShowImportImageDialog(false)}
        restaurantId={restaurantId}
        onImportSuccess={() => {
          fetchData(); // Refresh menu data after successful import
          setShowImportImageDialog(false);
        }}
      />

      {/* {showImportCsvDialog && (
        <ImportMenuCsvDialog
            isOpen={showImportCsvDialog}
            onClose={() => setShowImportCsvDialog(false)}
            restaurantId={restaurantId}
            onImportSuccess={fetchData}
        />
      )} */}

    </div>
  );
}
