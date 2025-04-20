
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { QrCode, Utensils } from 'lucide-react';

const ScanLanding = () => {
  const navigate = useNavigate();
  
  const handleStartOrdering = () => {
    // In a real app, we would get the table ID from the QR code URL
    // For demo purposes, we'll navigate to table ID 1
    navigate('/order/1');
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-restaurant-background p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-restaurant-primary p-6 text-white text-center">
          <QrCode className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Welcome to TableMaster</h1>
          <p className="mt-2">Scan, Order, Enjoy!</p>
        </div>
        
        <div className="p-6">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold">How It Works</h2>
              <ol className="mt-4 space-y-4 text-left">
                <li className="flex items-start">
                  <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-restaurant-primary/10 text-restaurant-primary mr-3">1</span>
                  <span>Browse the restaurant's menu on your phone</span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-restaurant-primary/10 text-restaurant-primary mr-3">2</span>
                  <span>Add items to your cart and customize as needed</span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-restaurant-primary/10 text-restaurant-primary mr-3">3</span>
                  <span>Place your order and wait for it to arrive at your table</span>
                </li>
              </ol>
            </div>
            
            <Button 
              onClick={handleStartOrdering}
              className="w-full bg-restaurant-primary hover:bg-restaurant-primary/90"
              size="lg"
            >
              <Utensils className="mr-2 h-5 w-5" />
              Start Ordering Now
            </Button>
          </div>
        </div>
      </div>
      
      <p className="mt-8 text-sm text-center text-muted-foreground">
        Powered by TableMaster - The Digital Menu Solution
      </p>
    </div>
  );
};

export default ScanLanding;
