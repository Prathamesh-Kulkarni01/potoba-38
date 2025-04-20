
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { QrCode, Utensils, ChevronRight, Coffee, FastForward } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const ScanLanding = () => {
  const navigate = useNavigate();
  
  const handleStartOrdering = () => {
    // In a real app, we would get the table ID from the QR code URL
    // For demo purposes, we'll navigate to table ID 1
    navigate('/order/1');
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-restaurant-background to-restaurant-background/70 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-restaurant-primary to-restaurant-primary/90 p-6 text-white text-center">
          <div className="mb-4 bg-white/20 p-3 rounded-full inline-block">
            <QrCode className="h-12 w-12 mx-auto" />
          </div>
          <h1 className="text-3xl font-bold">Potoba</h1>
          <p className="mt-2 text-white/80">The Ultimate Digital Dining Experience</p>
        </div>
        
        <div className="p-6">
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h2 className="text-xl font-semibold text-restaurant-primary">Fast, Simple Ordering</h2>
              <p className="text-muted-foreground mt-1">Browse, customize, and order without waiting</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
              <Card className="bg-restaurant-background/20 border-none shadow-sm">
                <CardContent className="pt-6 text-center">
                  <Coffee className="h-10 w-10 mx-auto mb-3 text-restaurant-primary/80" />
                  <p className="font-medium">AI Recommendations</p>
                </CardContent>
              </Card>
              
              <Card className="bg-restaurant-background/20 border-none shadow-sm">
                <CardContent className="pt-6 text-center">
                  <FastForward className="h-10 w-10 mx-auto mb-3 text-restaurant-primary/80" />
                  <p className="font-medium">Skip The Wait</p>
                </CardContent>
              </Card>
              
              <Card className="bg-restaurant-background/20 border-none shadow-sm">
                <CardContent className="pt-6 text-center">
                  <Utensils className="h-10 w-10 mx-auto mb-3 text-restaurant-primary/80" />
                  <p className="font-medium">Customized Orders</p>
                </CardContent>
              </Card>
            </div>
            
            <ol className="space-y-4 text-left">
              <li className="flex items-start">
                <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-restaurant-primary/10 text-restaurant-primary mr-3">1</span>
                <span>Browse the digital menu with personalized AI recommendations</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-restaurant-primary/10 text-restaurant-primary mr-3">2</span>
                <span>Customize your order and add items to cart</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-restaurant-primary/10 text-restaurant-primary mr-3">3</span>
                <span>Place your order and track its status in real-time</span>
              </li>
            </ol>
            
            <Button 
              onClick={handleStartOrdering}
              className="w-full bg-restaurant-primary hover:bg-restaurant-primary/90"
              size="lg"
            >
              <Utensils className="mr-2 h-5 w-5" />
              Start Ordering Now
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
      
      <p className="mt-8 text-sm text-center text-muted-foreground">
        Powered by Potoba - The Digital Menu Solution
      </p>
    </div>
  );
};

export default ScanLanding;
