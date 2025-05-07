import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Edit,
  Trash2,
  QrCode,
  PlusCircle,
  Filter,
  MoreHorizontal,
  Link as LinkIcon,
  Plus
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import QRCodeGenerator from '../../components/table/QRCodeGenerator';
import { useToast } from "@/hooks/use-toast";
import useApi from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { Table as TableType } from '@/types/api';

interface TableCardProps {
  table: TableType
  onViewQR: (tableId: number) => void;
}

const statusDisplay = {
  available: { text: 'Available', class: 'table-status-available' },
  occupied: { text: 'Occupied', class: 'table-status-occupied' },
  reserved: { text: 'Reserved', class: 'table-status-reserved' }
};

const TableCard = ({ table, onViewQR }: TableCardProps) => {
  const statusInfo = statusDisplay[table.status as keyof typeof statusDisplay];

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-all duration-200">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold">Table {table.number}</h3>
          <p className="text-sm text-muted-foreground">Capacity: {table.capacity}</p>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs ${statusInfo.class}`}>
          {statusInfo.text}
        </div>
      </div>
      
      <div className="mt-6 flex justify-between items-center">
        <Link to={`/dashboard/tables/${table._id}`}>
          <Button variant="outline" size="sm">
            View Details
          </Button>
        </Link>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onViewQR(+table._id)}>
              <QrCode className="mr-2 h-4 w-4" />
              View QR Code
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" />
              Edit Table
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Table
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

interface TableManagementProps {
  restaurantId: string;
}

const TableManagement: React.FC<TableManagementProps> = ({ restaurantId }) => {
  const [tables, setTables] = useState<TableType[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTableId, setDeleteTableId] = useState<string | null>(null);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState('4');
  const { toast } = useToast();

  useEffect(() => {
    fetchTables();
  }, [restaurantId]);

  const fetchTables = async () => {
    if (!restaurantId) return;

    setLoading(true);
    try {
      const tablesRef = collection(db, 'restaurants', restaurantId, 'tables');
      const tablesSnapshot = await getDocs(tablesRef);
      
      const tablesData = tablesSnapshot.docs.map(doc => ({
        id: doc.id,
        number: doc.data().number || 0,
        status: doc.data().status || 'available',
        capacity: doc.data().capacity || 4,
        createdAt: doc.data().createdAt || new Date().toISOString(),
        updatedAt: doc.data().updatedAt || new Date().toISOString()
      })) as TableType[];

      setTables(tablesData.sort((a, b) => a.number - b.number));
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast({
        title: "Error",
        description: "Failed to load tables",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTable = async () => {
    if (!restaurantId || !newTableNumber) return;

    const tableNumber = parseInt(newTableNumber);
    if (isNaN(tableNumber) || tableNumber <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid table number",
        variant: "destructive",
      });
      return;
    }

    if (tables.some(t => t.number === tableNumber)) {
      toast({
        title: "Error",
        description: "Table number already exists",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const tablesRef = collection(db, 'restaurants', restaurantId, 'tables');
      const newTable = {
        number: tableNumber,
        status: 'available',
        capacity: parseInt(newTableCapacity) || 4,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const docRef = await addDoc(tablesRef, newTable);
      setTables(prev => [...prev, { id: docRef.id, ...newTable }].sort((a, b) => a.number - b.number));
      
      setNewTableNumber('');
      setNewTableCapacity('4');
      
      toast({
        title: "Success",
        description: "Table added successfully",
      });
    } catch (error) {
      console.error('Error adding table:', error);
      toast({
        title: "Error",
        description: "Failed to add table",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTable = async () => {
    if (!deleteTableId || !restaurantId) return;

    setLoading(true);
    try {
      const tableRef = doc(db, 'restaurants', restaurantId, 'tables', deleteTableId);
      await deleteDoc(tableRef);
      
      setTables(prev => prev.filter(table => table.id !== deleteTableId));
      toast({
        title: "Success",
        description: "Table deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting table:', error);
      toast({
        title: "Error",
        description: "Failed to delete table",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setDeleteTableId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'occupied':
        return 'bg-red-100 text-red-800';
      case 'reserved':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && tables.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-restaurant-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Table Management</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="tableNumber">Table Number</Label>
              <Input
                id="tableNumber"
                type="number"
                min="1"
                value={newTableNumber}
                onChange={(e) => setNewTableNumber(e.target.value)}
                placeholder="Enter table number"
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="tableCapacity">Capacity</Label>
              <Input
                id="tableCapacity"
                type="number"
                min="1"
                value={newTableCapacity}
                onChange={(e) => setNewTableCapacity(e.target.value)}
                placeholder="Enter table capacity"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddTable} disabled={loading}>
                <Plus className="mr-2 h-4 w-4" />
                Add Table
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tables</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table Number</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No tables found. Add your first table!
                  </TableCell>
                </TableRow>
              ) : (
                tables.map((table) => (
                  <TableRow key={table.id}>
                    <TableCell className="font-medium">Table {table.number}</TableCell>
                    <TableCell>{table.capacity} seats</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(table.status)}`}>
                        {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTableId(table.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTableId} onOpenChange={() => setDeleteTableId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the table.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTable} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TableManagement;
