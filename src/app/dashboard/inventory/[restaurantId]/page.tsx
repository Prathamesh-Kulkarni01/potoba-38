
// src/app/dashboard/inventory/[restaurantId]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link'; // Import Link
import { useAuth } from '@/lib/auth/context';
import { getRestaurant } from '@/lib/firebase/firestore';
import { getInventoryItems, addInventoryItem, updateInventoryItem, deleteInventoryItem, recordPurchase } from '@/lib/firebase/inventory';
import type { RestaurantProfile, InventoryItem, InventoryItemCategory, UnitOfMeasure } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { PlusCircle, Edit3, Trash2, Archive, Search, Filter as FilterIcon, PackagePlus, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import InventoryItemForm, { type InventoryItemFormValues } from '@/components/inventory/inventory-item-form';
import ConfirmationDialog from '@/components/shared/confirmation-dialog';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { inventoryItemCategories, unitsOfMeasure } from '@/types'; 
import { Badge } from '@/components/ui/badge';
import ReceiveStockDialog, { type ReceiveStockFormValues } from '@/components/inventory/receive-stock-dialog';


export default function InventoryManagementPage() {
  const params = useParams();
  const restaurantId = params.restaurantId as string;
  const { user, role, initialLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; data: InventoryItem; } | null>(null);
  const [receiveStockItem, setReceiveStockItem] = useState<InventoryItem | null>(null);


  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<InventoryItemCategory | 'all'>('all');


  const fetchData = useCallback(async () => {
    if (!restaurantId || !user) return;
    setPageLoading(true);
    try {
      const [restaurantData, fetchedItems] = await Promise.all([
        getRestaurant(restaurantId),
        getInventoryItems(restaurantId)
      ]);

      if (restaurantData && (restaurantData.ownerId === user.uid || role === 'staff' && user.restaurantId === restaurantId)) {
        setRestaurant(restaurantData);
        setInventoryItems(fetchedItems);
        setFilteredItems(fetchedItems); 
      } else {
        toast({ variant: "destructive", title: "Access Denied", description: "Restaurant not found or you don't have permission." });
        router.replace('/dashboard');
      }
    } catch (error) {
      console.error("Error fetching inventory data:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load inventory data." });
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
    let items = inventoryItems;
    if (searchTerm) {
        items = items.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (categoryFilter !== 'all') {
        items = items.filter(item => item.category === categoryFilter);
    }
    setFilteredItems(items);
  }, [searchTerm, categoryFilter, inventoryItems]);

  const handleItemSubmit = async (values: InventoryItemFormValues, itemIdToUpdate?: string) => {
    setFormSubmitting(true);
    try {
      const itemData = {
        ...values,
        reorderLevel: values.reorderLevel === null || values.reorderLevel === undefined || isNaN(values.reorderLevel) ? null : Number(values.reorderLevel),
        costPerUnit: values.costPerUnit === null || values.costPerUnit === undefined || isNaN(values.costPerUnit) ? null : Number(values.costPerUnit),
        supplierInfo: values.supplierInfo || null,
      };
      if (itemIdToUpdate) {
        await updateInventoryItem(restaurantId, itemIdToUpdate, itemData);
        toast({ title: "Inventory Item Updated", description: `${values.name} has been updated.` });
      } else {
        await addInventoryItem(restaurantId, itemData);
        toast({ title: "Inventory Item Added", description: `${values.name} has been added.` });
      }
      fetchData(); 
      setIsItemModalOpen(false);
      setEditingItem(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to save inventory item." });
    } finally {
      setFormSubmitting(false);
    }
  };
  
  const openDeleteDialog = (item: InventoryItem) => {
    setDeleteConfirmation({ isOpen: true, data: item });
  };

  const confirmDeleteItem = async () => {
    if (!deleteConfirmation) return;
    setFormSubmitting(true);
    try {
      await deleteInventoryItem(restaurantId, deleteConfirmation.data.id);
      toast({ title: "Item Deleted", description: `${deleteConfirmation.data.name} has been deleted.` });
      fetchData();
      setDeleteConfirmation(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Deletion Failed", description: error.message || "Could not delete the item." });
    } finally {
      setFormSubmitting(false);
    }
  };
  
  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setIsItemModalOpen(true);
  };
  
  const openAddModal = () => {
    setEditingItem(null);
    setIsItemModalOpen(true);
  };

  const handleReceiveStockSubmit = async (values: ReceiveStockFormValues) => {
    if (!receiveStockItem) return;
    setFormSubmitting(true);
    try {
      await recordPurchase(
        restaurantId,
        receiveStockItem.id,
        values.quantityReceived,
        values.costPerUnit,
        values.notes,
        values.supplierName
      );
      toast({ title: "Stock Received", description: `${values.quantityReceived} ${receiveStockItem.unitOfMeasure} of ${receiveStockItem.name} added to stock.` });
      fetchData();
      setReceiveStockItem(null); 
    } catch (error: any) {
      toast({ variant: "destructive", title: "Stock Update Failed", description: error.message || "Could not update stock." });
    } finally {
      setFormSubmitting(false);
    }
  };


  if (authLoading || pageLoading) {
    return <div className="flex h-full items-center justify-center"><LoadingSpinner className="h-10 w-10 text-primary" /></div>;
  }
  if (!restaurant) {
    return <Card><CardHeader><CardTitle>Error</CardTitle></CardHeader><CardContent><p>Restaurant data not found or no permission.</p></CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center">
                <Button variant="ghost" size="icon" className="mr-2 md:hidden" onClick={() => router.push(`/dashboard/inventory/${restaurantId}/dashboard`)}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <Link href={`/dashboard/inventory/${restaurantId}/dashboard`} className="hidden md:inline-flex items-center mr-3 text-sm text-muted-foreground hover:text-primary">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to Inventory Dashboard
                </Link>
            </div>
            <div className="flex-grow">
              <CardTitle className="text-2xl md:text-3xl flex items-center">
                <Archive className="mr-3 h-7 w-7 text-primary" /> Current Stock
              </CardTitle>
              <CardDescription>Track and manage stock levels for {restaurant.name}.</CardDescription>
            </div>
            {role === 'owner' && (
              <Button onClick={openAddModal} className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Item
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative w-full md:flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Search inventory items..." 
                className="pl-10 w-full h-10" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
            <div className="w-full md:w-auto">
              <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as InventoryItemCategory | 'all')}>
                <SelectTrigger className="h-10 w-full md:w-[200px]">
                    <FilterIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Filter by category..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {inventoryItemCategories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="text-right">Reorder Level</TableHead>
                  <TableHead className="text-right">Last Updated</TableHead>
                  {role === 'owner' && <TableHead className="text-right w-[180px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map(item => (
                  <TableRow key={item.id} className={item.reorderLevel != null && item.currentStock <= item.reorderLevel ? 'bg-red-500/10 hover:bg-red-500/20' : 'hover:bg-muted/50'}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{inventoryItemCategories.find(c => c.value === item.category)?.label || item.category}</TableCell>
                    <TableCell>{unitsOfMeasure.find(u => u.value === item.unitOfMeasure)?.label || item.unitOfMeasure}</TableCell>
                    <TableCell className="text-right font-semibold">{item.currentStock}</TableCell>
                    <TableCell className="text-right">{item.reorderLevel ?? 'N/A'}</TableCell>
                    <TableCell className="text-right text-xs">{item.lastStockUpdatedAt ? format(item.lastStockUpdatedAt.toDate(), 'PPp') : 'N/A'}</TableCell>
                    {role === 'owner' && (
                      <TableCell className="text-right space-x-1">
                        <Button variant="outline" size="xs" onClick={() => setReceiveStockItem(item)} className="text-xs h-7"><PackagePlus className="mr-1 h-3 w-3" />Receive</Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditModal(item)} className="h-7 w-7"><Edit3 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(item)} className="text-destructive hover:text-destructive/80 h-7 w-7"><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10">
              <Archive className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Inventory Items Yet</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || categoryFilter !== 'all' ? 'No items match your current filter.' : 'Start by adding items to your inventory.'}
              </p>
              {role === 'owner' && !searchTerm && categoryFilter === 'all' && (
                <Button onClick={openAddModal} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add First Item
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isItemModalOpen} onOpenChange={(isOpen) => { if (!isOpen) { setIsItemModalOpen(false); setEditingItem(null); } }}>
        <InventoryItemForm
            item={editingItem}
            onSubmit={handleItemSubmit}
            onClose={() => { setIsItemModalOpen(false); setEditingItem(null); }}
            isLoading={formSubmitting}
        />
      </Dialog>
      
      {deleteConfirmation?.isOpen && (
        <ConfirmationDialog
          isOpen={deleteConfirmation.isOpen}
          onClose={() => setDeleteConfirmation(null)}
          onConfirm={confirmDeleteItem}
          title={`Delete Item: ${deleteConfirmation.data.name}?`}
          description="This action cannot be undone. All stock history for this item will also be removed."
          isLoading={formSubmitting}
        />
      )}

      {receiveStockItem && (
        <ReceiveStockDialog
          isOpen={!!receiveStockItem}
          onClose={() => setReceiveStockItem(null)}
          item={receiveStockItem}
          onSubmit={handleReceiveStockSubmit}
          isLoading={formSubmitting}
        />
      )}
    </div>
  );
}
