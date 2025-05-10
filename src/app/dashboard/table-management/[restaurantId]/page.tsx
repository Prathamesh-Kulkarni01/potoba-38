
// src/app/dashboard/table-management/[restaurantId]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth/context';
import { getRestaurant } from '@/lib/firebase/firestore';
import { addTable, getTables, updateTable, deleteTable } from '@/lib/firebase/tables';
import type { RestaurantProfile, Table as FirebaseTableType, TableStatus } from '@/types'; // Renamed to FirebaseTableType for clarity
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Edit3, Trash2, QrCode, Users, Circle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import ConfirmationDialog from '@/components/shared/confirmation-dialog';

const tableFormSchema = z.object({
  tableNumber: z.string().min(1, "Table number is required."),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1."),
});
type TableFormValues = z.infer<typeof tableFormSchema>;

const statusColors: Record<TableStatus, string> = {
  available: 'bg-green-500',
  occupied: 'bg-red-500',
  reserved: 'bg-yellow-500',
  needs_cleaning: 'bg-blue-500',
};

export default function TableManagementPage() {
  const params = useParams();
  const restaurantId = params.restaurantId as string;
  const { user, role, initialLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [tables, setTables] = useState<FirebaseTableType[]>([]); 
  const [pageLoading, setPageLoading] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<FirebaseTableType | null>(null); 
  
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; data: FirebaseTableType; } | null>(null);
  const [qrModalTable, setQrModalTable] = useState<FirebaseTableType | null>(null);


  const form = useForm<TableFormValues>({
    resolver: zodResolver(tableFormSchema),
    defaultValues: { tableNumber: '', capacity: 1 },
  });

  const fetchRestaurantData = useCallback(async () => {
    if (!restaurantId || !user) return;
    setPageLoading(true);
    try {
      const restaurantData = await getRestaurant(restaurantId);
      if (restaurantData && restaurantData.ownerId === user.uid) {
        setRestaurant(restaurantData);
        const fetchedTables = await getTables(restaurantId); 
        setTables(fetchedTables);
      } else {
        toast({ variant: "destructive", title: "Access Denied", description: "Restaurant not found or you don't have permission." });
        router.replace('/dashboard');
      }
    } catch (error) {
      console.error("Error fetching restaurant data:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load restaurant data." });
    } finally {
      setPageLoading(false);
    }
  }, [restaurantId, user, router, toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || role !== 'owner') {
      router.replace('/dashboard');
      return;
    }
    if (restaurantId) {
      fetchRestaurantData();
    } else {
      router.replace('/dashboard');
    }
  }, [restaurantId, user, role, authLoading, router, fetchRestaurantData]);

  const handleTableSubmit = async (values: TableFormValues) => {
    setFormSubmitting(true);
    try {
      if (editingTable) {
        await updateTable(restaurantId, editingTable.id, { ...values, status: editingTable.status });
        toast({ title: "Table Updated", description: `Table ${values.tableNumber} has been updated.` });
      } else {
        await addTable(restaurantId, values);
        toast({ title: "Table Added", description: `Table ${values.tableNumber} has been added.` });
      }
      fetchRestaurantData(); 
      setIsTableModalOpen(false);
      setEditingTable(null);
      form.reset({ tableNumber: '', capacity: 1 });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to save table." });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleStatusChange = async (tableId: string, newStatus: TableStatus) => {
    try {
      const tableToUpdate = tables.find(t => t.id === tableId);
      if (!tableToUpdate) return;
      await updateTable(restaurantId, tableId, { status: newStatus, tableNumber: tableToUpdate.tableNumber, capacity: tableToUpdate.capacity });
      toast({ title: "Status Updated", description: `Table ${tableToUpdate.tableNumber} is now ${newStatus}.` });
      fetchRestaurantData(); 
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to update status." });
    }
  };
  
  const openDeleteDialog = (table: FirebaseTableType) => {
    setDeleteConfirmation({ isOpen: true, data: table });
  };

  const confirmDeleteTable = async () => {
    if (!deleteConfirmation) return;
    setFormSubmitting(true);
    try {
      await deleteTable(restaurantId, deleteConfirmation.data.id);
      toast({ title: "Table Deleted", description: `Table ${deleteConfirmation.data.tableNumber} has been deleted.` });
      fetchRestaurantData(); 
      setDeleteConfirmation(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Deletion Failed", description: error.message || "Could not delete table." });
    } finally {
      setFormSubmitting(false);
    }
  };

  const openEditModal = (table: FirebaseTableType) => {
    setEditingTable(table);
    form.reset({ tableNumber: table.tableNumber, capacity: table.capacity });
    setIsTableModalOpen(true);
  };
  
  const openAddModal = () => {
    setEditingTable(null);
    form.reset({ tableNumber: '', capacity: 1 });
    setIsTableModalOpen(true);
  };

  if (authLoading || pageLoading) {
    return <div className="flex h-full items-center justify-center"><LoadingSpinner className="h-10 w-10 text-primary" /></div>;
  }
  if (!restaurant) {
    return <Card><CardHeader><CardTitle>Error</CardTitle></CardHeader><CardContent><p>Restaurant not found or no permission.</p></CardContent></Card>;
  }
  
  const getDisplayTestLink = (storedQrValue: string) => {
    const configuredBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://6000-firebase-studio-1746809721561.cluster-ancjwrkgr5dvux4qug5rbzyc2y.cloudworkstations.dev';
    try {
      const storedUrlObject = new URL(storedQrValue);
      const pathAndQuery = storedUrlObject.pathname + storedUrlObject.search + storedUrlObject.hash;
      // Ensure no double slashes
      const displayUrl = (configuredBaseUrl.endsWith('/') ? configuredBaseUrl.slice(0, -1) : configuredBaseUrl) + 
                         (pathAndQuery.startsWith('/') ? pathAndQuery : '/' + pathAndQuery);
      return displayUrl;
    } catch (e) {
      // If qrModalTable.qrCodeValue is not a full valid URL (e.g. just a path),
      // or some other parsing error.
      if (storedQrValue.startsWith('/')) {
         const displayUrl = (configuredBaseUrl.endsWith('/') ? configuredBaseUrl.slice(0, -1) : configuredBaseUrl) + storedQrValue;
         return displayUrl;
      }
      console.warn("Could not reliably reconstruct test link from stored qrCodeValue:", storedQrValue);
      return storedQrValue; // Fallback to using the stored value as is
    }
  };


  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-4 md:mb-0">
                <CardTitle className="text-2xl md:text-3xl flex items-center">
                    <Users className="mr-3 h-7 w-7 text-primary" /> Table Management for {restaurant.name}
                </CardTitle>
                <CardDescription>Oversee and manage your restaurant's tables and their status.</CardDescription>
            </div>
            <Button onClick={openAddModal} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Table
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tables.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {tables.map(table => (
                <Card key={table.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-xl">Table {table.tableNumber}</CardTitle>
                        <div className={`h-3 w-3 rounded-full ${statusColors[table.status]}`} title={table.status}></div>
                    </div>
                    <CardDescription>Capacity: {table.capacity} guests</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-3">
                    <Select value={table.status} onValueChange={(newStatus) => handleStatusChange(table.id, newStatus as TableStatus)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(statusColors) as TableStatus[]).map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => router.push(`/dashboard/orders/${restaurantId}?tableId=${table.id}`)}>
                      View Orders / Bill
                    </Button>
                  </CardContent>
                  <CardFooter className="flex justify-between items-center pt-2">
                    <Button variant="ghost" size="icon" onClick={() => setQrModalTable(table)} title="Show QR Code"><QrCode className="h-5 w-5 text-muted-foreground hover:text-primary"/></Button>
                    <div className="space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditModal(table)} title="Edit Table"><Edit3 className="h-4 w-4 text-muted-foreground hover:text-accent"/></Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(table)} title="Delete Table"><Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive"/></Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 border-2 border-dashed rounded-lg bg-muted/30">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Tables Yet</h3>
              <p className="text-muted-foreground mb-4">Add tables to start managing your restaurant floor.</p>
              <Button onClick={openAddModal} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <PlusCircle className="mr-2 h-4 w-4" /> Add First Table
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isTableModalOpen} onOpenChange={setIsTableModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTable ? 'Edit Table' : 'Add New Table'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleTableSubmit)} className="space-y-4 py-4">
              <FormField control={form.control} name="tableNumber" render={({ field }) => (<FormItem><FormLabel>Table Number/Name</FormLabel><FormControl><Input placeholder="e.g., T1, Patio 5, Bar Seat 2" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="capacity" render={({ field }) => (<FormItem><FormLabel>Capacity</FormLabel><FormControl><Input type="number" placeholder="e.g., 4" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline" onClick={() => setIsTableModalOpen(false)} disabled={formSubmitting}>Cancel</Button></DialogClose>
                <Button type="submit" disabled={formSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {formSubmitting ? <LoadingSpinner className="mr-2 h-4 w-4" /> : (editingTable ? 'Save Changes' : 'Add Table')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {deleteConfirmation?.isOpen && (
        <ConfirmationDialog
          isOpen={deleteConfirmation.isOpen}
          onClose={() => setDeleteConfirmation(null)}
          onConfirm={confirmDeleteTable}
          title={`Delete Table ${deleteConfirmation.data.tableNumber}?`}
          description="This action cannot be undone. Associated active orders might need manual resolution."
          isLoading={formSubmitting}
        />
      )}

      {qrModalTable && (
        <Dialog open={!!qrModalTable} onOpenChange={() => setQrModalTable(null)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>QR Code for Table {qrModalTable.tableNumber}</DialogTitle>
                    <CardDescription>Customers can scan this to view the menu and order.</CardDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-4 space-y-4">
                    <Image 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrModalTable.qrCodeValue)}`} 
                        alt={`QR Code for table ${qrModalTable.tableNumber}`} 
                        width={200} 
                        height={200}
                        className="border rounded-md"
                        data-ai-hint="qr code table"
                    />
                    <Input type="text" readOnly value={qrModalTable.qrCodeValue} className="text-center text-xs"/>
                    <p className="text-xs text-muted-foreground">
                        Test link: <a href={getDisplayTestLink(qrModalTable.qrCodeValue)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{getDisplayTestLink(qrModalTable.qrCodeValue)}</a>
                    </p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setQrModalTable(null)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

