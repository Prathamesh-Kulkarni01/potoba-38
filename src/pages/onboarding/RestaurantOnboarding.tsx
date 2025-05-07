import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { UtensilsCrossed, ChefHat, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, arrayUnion } from 'firebase/firestore';

const cuisineTypes = [
  "American", "Italian", "Mexican", "Chinese", "Japanese", 
  "Indian", "Thai", "Mediterranean", "French", "Korean",
  "Spanish", "Vietnamese", "Greek", "Turkish", "Fusion"
];

// StepIndicator Component
const StepIndicator = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => (
  <div className="flex justify-between items-center mb-2">
    <div className="flex space-x-2">
      {Array.from({ length: totalSteps }, (_, index) => (
        <div
          key={index}
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep > index ? 'bg-restaurant-primary text-white' : 'bg-muted text-muted-foreground'
          }`}
        >
          {index + 1}
        </div>
      ))}
    </div>
    <div className="text-sm text-muted-foreground">Step {currentStep} of {totalSteps}</div>
  </div>
);

// Logo Component
const Logo = () => (
  <motion.div
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ duration: 0.5 }}
    className="inline-flex items-center justify-center p-2 bg-white rounded-full shadow-md mb-4"
  >
    <img src="/images/icon-logo.png" alt="Potoba" className="h-16" />
  </motion.div>
);

// TitleSection Component
const TitleSection = ({ isAddingAdditionalRestaurant }: { isAddingAdditionalRestaurant: boolean }) => (
  <div className="text-center mb-8">
    <Logo />
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
);

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
    if (!user) {
      toast.error("You must be logged in to create a restaurant");
      navigate('/login', { state: { returnUrl: '/onboarding' } });
    }
  }, [user, navigate]);

  const handleContinue = () => {
    if (step === 1) {
      if (!name || !description) {
        toast.error("Please fill in all required fields");
        return;
      }
      setStep(2);
    }
  };

  const createDefaultTables = async (restaurantId: string, count: number) => {
    const tablesCollection = collection(db, 'restaurants', restaurantId, 'tables');
    const tables = [];

    for (let i = 1; i <= count; i++) {
      const tableDoc = await addDoc(tablesCollection, {
        number: i,
        status: 'available',
        capacity: 4,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      tables.push(tableDoc.id);
    }

    return tables;
  };

  const createDemoMenuItems = async (restaurantId: string) => {
    const menuCollection = collection(db, 'restaurants', restaurantId, 'menu');
    const demoItems = [
      {
        name: 'Classic Burger',
        description: 'Juicy beef patty with fresh vegetables',
        price: 12.99,
        category: 'Main Course',
        image: 'https://example.com/burger.jpg',
        available: true
      },
      {
        name: 'Caesar Salad',
        description: 'Fresh romaine lettuce with Caesar dressing',
        price: 8.99,
        category: 'Appetizers',
        image: 'https://example.com/salad.jpg',
        available: true
      },
      // Add more demo items as needed
    ];

    for (const item of demoItems) {
      await addDoc(menuCollection, {
        ...item,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description || !address || !phone || !cuisine) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!user) {
      toast.error("You must be logged in to create a restaurant");
      return;
    }

    setLoading(true);
    try {
      // Create restaurant document
      const restaurantRef = await addDoc(collection(db, 'restaurants'), {
        name,
        description,
        address,
        phone,
        cuisine,
        ownerId: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Create default tables
      await createDefaultTables(restaurantRef.id, parseInt(tableCount) || 10);

      // Create demo data if requested
      if (createDemoData) {
        await createDemoMenuItems(restaurantRef.id);
        toast.success("Demo data created successfully!");
      }

      // Update user's restaurants array
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        restaurants: arrayUnion({
          id: restaurantRef.id,
          name,
          role: 'owner'
        })
      });

      // Set current restaurant
      if (setCurrentRestaurantId) {
        setCurrentRestaurantId(restaurantRef.id);
      }

      toast.success("Restaurant created successfully!");
      navigate('/dashboard');
    } catch (error: any) {
      console.error("Failed to create restaurant:", error);
      toast.error(error.message || "Failed to create restaurant. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isAddingAdditionalRestaurant = user?.restaurants?.length > 0;

  return (
    <div className="min-h-screen bg-restaurant-background bg-pattern flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <TitleSection isAddingAdditionalRestaurant={isAddingAdditionalRestaurant} />
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <Card>
            <CardHeader>
              <StepIndicator currentStep={step} totalSteps={2} />
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
