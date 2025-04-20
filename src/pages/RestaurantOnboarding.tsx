
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { UtensilsCrossed, ChefHat, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import { restaurantService } from '../services/restaurantService';

const cuisineTypes = [
  "American", "Italian", "Mexican", "Chinese", "Japanese", 
  "Indian", "Thai", "Mediterranean", "French", "Korean",
  "Spanish", "Vietnamese", "Greek", "Turkish", "Fusion"
];

const RestaurantOnboarding = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [createDemoData, setCreateDemoData] = useState(false);
  const { user, currentRestaurantId, setCurrentRestaurantId } = useAuth();
  const navigate = useNavigate();
  
  // Form data
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [tableCount, setTableCount] = useState('10');
  
  // Check if the user is authenticated
  useEffect(() => {
    // If there's no token, redirect to login
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error("You must be logged in to create a restaurant");
      navigate('/login', { state: { returnUrl: '/onboarding' } });
    }
  }, [navigate]);
  
  const handleContinue = () => {
    if (step === 1) {
      if (!name || !description) {
        toast.error("Please fill in all required fields");
        return;
      }
      setStep(2);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description || !address || !phone || !cuisine) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    setLoading(true);
    try {
      // Create the restaurant
      const newRestaurant = await restaurantService.createRestaurant({
        name,
        description,
        address,
        phone,
        cuisine,
        tables: parseInt(tableCount) || 10,
      });
      
      // Set as current restaurant
      if (setCurrentRestaurantId) {
        setCurrentRestaurantId(newRestaurant.id);
      }
      
      // Create default tables
      await restaurantService.createDefaultTables(newRestaurant.id, parseInt(tableCount) || 10);
      
      // If demo data is requested, create it
      if (createDemoData) {
        await restaurantService.createDemoData(newRestaurant.id);
        toast.success("Demo data created successfully!");
      }
      
      toast.success("Restaurant created successfully!");
      navigate('/dashboard');
    } catch (error: any) {
      console.error("Failed to create restaurant:", error);
      toast.error("Failed to create restaurant. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  // If user already has restaurants, redirect to add restaurant page
  const isAddingAdditionalRestaurant = user?.restaurants?.length > 0;
  
  return (
    <div className="min-h-screen bg-restaurant-background bg-pattern flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center justify-center p-2 bg-white rounded-full shadow-md mb-4"
          >
            <img src="/images/potoba-logo.svg" alt="TableMaster" className="h-16" />
          </motion.div>
          
          <motion.h1 
            className="text-3xl font-bold text-restaurant-primary"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            {isAddingAdditionalRestaurant ? "Add New Restaurant" : "Set Up Your Restaurant"}
          </motion.h1>
          
          <motion.p 
            className="text-muted-foreground"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            {isAddingAdditionalRestaurant 
              ? "Add another restaurant to your account" 
              : "Just a few steps to get your restaurant online"}
          </motion.p>
        </div>
        
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center mb-2">
                <div className="flex space-x-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-restaurant-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                    1
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-restaurant-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                    2
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Step {step} of 2
                </div>
              </div>
              
              <CardTitle>
                {step === 1 ? "Restaurant Basics" : "Location & Details"}
              </CardTitle>
              <CardDescription>
                {step === 1 
                  ? "Tell us about your restaurant" 
                  : "Where is your restaurant located?"}
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form id="onboardingForm" onSubmit={handleSubmit} className="space-y-4">
                {step === 1 ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="name">Restaurant Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Potoba Fine Dining"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Tell us about your restaurant..."
                        rows={3}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="cuisine">Cuisine Type</Label>
                      <Select value={cuisine} onValueChange={setCuisine}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select cuisine type" />
                        </SelectTrigger>
                        <SelectContent>
                          {cuisineTypes.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address <span className="text-red-500">*</span></Label>
                      <Textarea
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Full restaurant address"
                        rows={2}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. (555) 123-4567"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="tableCount">Number of Tables</Label>
                      <Input
                        id="tableCount"
                        type="number"
                        min={1}
                        max={100}
                        value={tableCount}
                        onChange={(e) => setTableCount(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="demoData"
                          checked={createDemoData}
                          onChange={(e) => setCreateDemoData(e.target.checked)}
                          className="rounded border-gray-300 text-restaurant-primary focus:ring-restaurant-primary"
                        />
                        <Label htmlFor="demoData">Create demo menu items</Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This will create sample menu items and tables to help you get started
                      </p>
                    </div>
                  </>
                )}
              </form>
            </CardContent>
            
            <CardFooter className="flex justify-between">
              {step === 1 ? (
                <Button 
                  onClick={handleContinue} 
                  className="ml-auto"
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                  <Button 
                    type="submit"
                    form="onboardingForm" 
                    disabled={loading}
                    className="bg-restaurant-primary hover:bg-restaurant-primary/90"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Restaurant"
                    )}
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>
        </motion.div>
        
        {/* Decorative elements */}
        <motion.div 
          className="fixed -bottom-10 -left-10 text-restaurant-primary/20 pointer-events-none"
          initial={{ opacity: 0, rotate: -20 }}
          animate={{ opacity: 1, rotate: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
        >
          <UtensilsCrossed size={80} />
        </motion.div>
        <motion.div 
          className="fixed -top-10 -right-10 text-restaurant-secondary/20 pointer-events-none"
          initial={{ opacity: 0, rotate: 20 }}
          animate={{ opacity: 1, rotate: 0 }}
          transition={{ delay: 0.6, duration: 0.7 }}
        >
          <ChefHat size={80} />
        </motion.div>
      </div>
    </div>
  );
};

export default RestaurantOnboarding;
