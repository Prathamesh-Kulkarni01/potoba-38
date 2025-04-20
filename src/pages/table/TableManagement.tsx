import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Edit,
  Trash2,
  QrCode,
  PlusCircle,
  Filter,
  MoreHorizontal,
  Link as LinkIcon
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
import { Table } from '@/types/api';

interface TableCardProps {
  table: Table
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

const TableManagement = () => {
  const [filter, setFilter] = useState('all');
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [addTableDialogOpen, setAddTableDialogOpen] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]); // Dynamic table data
  const { toast } = useToast();
  const api = useApi();
  const { currentRestaurantId } = useAuth();

  // Fetch table data dynamically
  useEffect(() => {
    const fetchTableData = async () => {
      try {
        const tables = await api.table.get(currentRestaurantId);
        setTableData(tables);
      } catch (error) {
        console.error("Failed to fetch table data:", error);
        toast({
          title: "Error",
          description: "Failed to load table data. Please try again.",
          duration: 3000,
        });
      }
    };

    fetchTableData();
  }, [currentRestaurantId]);

  const filteredTables = filter === 'all' 
    ? tableData 
    : tableData.filter(table => table.status === filter);

  const handleViewQR = (tableId: number) => {
    setSelectedTableId(tableId);
    setQrDialogOpen(true);
  };

  const selectedTable = tableData.find(table => table.id === selectedTableId);
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Table Management</h1>
          <p className="text-muted-foreground">Manage your restaurant tables</p>
        </div>
        
        <Button 
          onClick={() => setAddTableDialogOpen(true)} 
          className="bg-restaurant-primary hover:bg-restaurant-primary/90"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Table
        </Button>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tables</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="occupied">Occupied</SelectItem>
              <SelectItem value="reserved">Reserved</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Showing {filteredTables.length} of {tableData.length} tables
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredTables.map((table) => (
          <TableCard key={table.id} table={table} onViewQR={handleViewQR} />
        ))}
      </div>
      
      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Table {selectedTable?.number} QR Code</DialogTitle>
            <DialogDescription>
              Customers can scan this QR code to place their orders
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-4">
            {selectedTableId && (
              <div className="space-y-4">
                <QRCodeGenerator
                  value={`${window.location.origin}/order/${selectedTableId}`}
                  size={200}
                />
                <div className="flex flex-col items-center space-y-2">
                  <p className="text-sm text-center text-muted-foreground">
                    Direct order link:
                  </p>
                  <div className="flex items-center space-x-2">
                    <code className="bg-muted px-2 py-1 rounded text-sm">
                      {window.location.origin}/order/{selectedTableId}
                    </code>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/order/${selectedTableId}`);
                        toast({
                          title: "Link copied",
                          description: "Direct link copied to clipboard",
                          duration: 3000,
                        });
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    </Button>
                  </div>
                </div>
                
                {/* Direct Table Customer Link - NEW */}
                <div className="mt-2 flex justify-center">
                  <Button 
                    variant="default" 
                    className="bg-restaurant-primary hover:bg-restaurant-primary/90"
                    onClick={() => {
                      window.open(`${window.location.origin}/order/${selectedTableId}`, '_blank');
                    }}
                  >
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Open Customer Order Page
                  </Button>
                </div>
              </div>
            )}
            <p className="mt-4 text-sm text-center">
              Table {selectedTable?.number} - Capacity: {selectedTable?.capacity}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQrDialogOpen(false)}>
              Close
            </Button>
            <Button 
              onClick={() => {
                // In a real app, this would download the QR code
                alert('QR code download functionality would be implemented here');
              }}
            >
              Download QR Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Table Dialog */}
      <Dialog open={addTableDialogOpen} onOpenChange={setAddTableDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Table</DialogTitle>
            <DialogDescription>
              Enter the details for the new table
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="tableNumber">Table Number</Label>
              <Input id="tableNumber" type="number" min="1" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input id="capacity" type="number" min="1" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Initial Status</Label>
              <Select defaultValue="available">
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTableDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-restaurant-primary hover:bg-restaurant-primary/90"
              onClick={() => setAddTableDialogOpen(false)}
            >
              Add Table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TableManagement;
