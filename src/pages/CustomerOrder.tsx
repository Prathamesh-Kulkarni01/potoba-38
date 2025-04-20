
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CustomerMenu from '../components/customer/CustomerMenu';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";

// Sample data - in a real application, this would come from an API
const tableData = [
  { id: 1, number: 1, restaurantId: 1 },
  { id: 2, number: 2, restaurantId: 1 },
  { id: 3, number: 3, restaurantId: 1 },
  { id: 4, number: 4, restaurantId: 1 },
  { id: 5, number: 5, restaurantId: 1 }
];

const restaurantData = [
  { id: 1, name: 'Demo Restaurant', address: '123 Demo St' }
];

const CustomerOrder = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const [table, setTable] = useState<{ id: number; number: number; restaurantId: number } | null>(null);
  const [restaurant, setRestaurant] = useState<{ id: number; name: string; address: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Simulate loading data from an API
    const loadData = () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Find the table with the matching ID
        const parsedTableId = parseInt(tableId || '0', 10);
        const foundTable = tableData.find(t => t.id === parsedTableId);
        
        if (!foundTable) {
          setError('Table not found');
          setIsLoading(false);
          return;
        }
        
        setTable(foundTable);
        
        // Find the restaurant for this table
        const foundRestaurant = restaurantData.find(r => r.id === foundTable.restaurantId);
        
        if (!foundRestaurant) {
          setError('Restaurant not found');
          setIsLoading(false);
          return;
        }
        
        setRestaurant(foundRestaurant);
        setIsLoading(false);
      } catch (err) {
        setError('An error occurred while loading the data');
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [tableId]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-restaurant-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-restaurant-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading your menu...</p>
        </div>
      </div>
    );
  }
  
  if (error || !table || !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-restaurant-background">
        <div className="text-center max-w-sm p-6 bg-white rounded-lg shadow-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
          <h1 className="text-xl font-bold text-red-500 mb-2">Error</h1>
          <p className="text-muted-foreground">{error || 'An unknown error occurred'}</p>
          <p className="mt-4">Please try scanning the QR code again or ask for assistance.</p>
          <Button 
            className="mt-6"
            onClick={() => navigate('/scan')}
          >
            Return to Scan Page
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <CustomerMenu restaurantName={restaurant.name} tableNumber={table.number} />
  );
};

export default CustomerOrder;
