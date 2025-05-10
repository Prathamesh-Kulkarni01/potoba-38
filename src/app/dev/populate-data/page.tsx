
// src/app/dev/populate-data/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/context';
import { getRestaurantsByOwner } from '@/lib/firebase/firestore';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import type { RestaurantProfile, MenuItem, Table as FirebaseTableType } from '@/types';
import { addMenuCategory, addMenuSubcategory, addMenuItem } from '@/lib/firebase/menu';
import { addTable } from '@/lib/firebase/tables';
import { createOrder as createFirebaseOrder } from '@/lib/firebase/orders';
import { Timestamp } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';

// Dummy Data Generation Functions
const DUMMY_CATEGORIES = [
  { name: "Appetizers", order: 1 },
  { name: "Soups & Salads", order: 2 },
  { name: "Main Courses", order: 3 },
  { name: "Burgers & Sandwiches", order: 4 },
  { name: "Desserts", order: 5 },
  { name: "Beverages", order: 6 },
];

const DUMMY_SUB_CATEGORIES: Record<string, { name: string, order: number }[]> = {
  "Main Courses": [
    { name: "Vegetarian Mains", order: 1 },
    { name: "Chicken Dishes", order: 2 },
    { name: "Beef & Lamb", order: 3 },
    { name: "Seafood", order: 4 },
  ],
  "Beverages": [
    { name: "Hot Drinks", order: 1 },
    { name: "Cold Drinks", order: 2 },
    { name: "Fresh Juices", order: 3 },
  ],
};

const getRandomPrice = (min: number, max: number) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
const getRandomOrder = () => Math.floor(Math.random() * 100);
const getRandomBoolean = () => Math.random() < 0.85; // 85% chance of true

const DUMMY_MENU_ITEMS_POOL: Omit<MenuItem, 'id' | 'restaurantId' | 'categoryId' | 'subcategoryId' | 'createdAt' | 'updatedAt' | 'order' | 'price' | 'availability'>[] = [
  // Appetizers
  { name: "Crispy Spring Rolls", description: "Golden fried spring rolls served with sweet chili sauce.", dietaryTags: ["vegetarian"], imageUrl: "https://picsum.photos/seed/springrolls/400/250" },
  { name: "Garlic Bread with Cheese", description: "Toasted baguette slices topped with garlic butter and melted mozzarella.", imageUrl: "https://picsum.photos/seed/garlicbread/400/250" },
  // Soups & Salads
  { name: "Classic Caesar Salad", description: "Crisp romaine lettuce, croutons, parmesan, and Caesar dressing.", calories: 350, imageUrl: "https://picsum.photos/seed/caesarsalad/400/250" },
  { name: "Tomato Basil Soup", description: "Creamy tomato soup with fresh basil.", dietaryTags: ["vegetarian", "gluten-free"], calories: 250, imageUrl: "https://picsum.photos/seed/tomatosoup/400/250" },
  // Vegetarian Mains
  { name: "Vegetable Stir-fry", description: "Assorted fresh vegetables stir-fried in a savory sauce, served with rice.", dietaryTags: ["vegan", "vegetarian"], calories: 450, imageUrl: "https://picsum.photos/seed/vegstirfry/400/250" },
  { name: "Paneer Tikka Masala", description: "Grilled paneer cubes in a rich, creamy tomato-based gravy.", dietaryTags: ["vegetarian"], calories: 550, imageUrl: "https://picsum.photos/seed/paneertikka/400/250" },
  // Chicken Dishes
  { name: "Grilled Chicken Breast", description: "Juicy grilled chicken breast served with mashed potatoes and steamed vegetables.", calories: 500, imageUrl: "https://picsum.photos/seed/grilledchicken/400/250" },
  { name: "Chicken Alfredo Pasta", description: "Creamy Alfredo sauce with grilled chicken and fettuccine pasta.", calories: 700, imageUrl: "https://picsum.photos/seed/chickenalfredo/400/250" },
  // Beef & Lamb
  { name: "Classic Beef Burger", description: "Grilled beef patty, lettuce, tomato, onion, pickles, and special sauce on a sesame bun. Served with fries.", calories: 800, imageUrl: "https://picsum.photos/seed/beefburger/400/250" },
  { name: "Lamb Chops", description: "Grilled lamb chops marinated in herbs and spices, served with roasted potatoes.", calories: 750, imageUrl: "https://picsum.photos/seed/lambchops/400/250" },
  // Seafood
  { name: "Grilled Salmon", description: " flaky salmon fillet grilled to perfection, served with asparagus.", calories: 600, imageUrl: "https://picsum.photos/seed/grilledsalmon/400/250" },
  // Hot Drinks
  { name: "Espresso", description: "A strong shot of coffee.", calories: 5, imageUrl: "https://picsum.photos/seed/espresso/400/250" },
  { name: "Cappuccino", description: "Espresso with steamed milk and foam.", calories: 120, imageUrl: "https://picsum.photos/seed/cappuccino/400/250" },
  // Cold Drinks
  { name: "Iced Latte", description: "Chilled espresso with milk over ice.", calories: 150, imageUrl: "https://picsum.photos/seed/icedlatte/400/250" },
  { name: "Coca-Cola", description: "Classic Coca-Cola.", calories: 140, imageUrl: "https://picsum.photos/seed/cocacola/400/250" },
];

export default function PopulateDataPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [ownedRestaurants, setOwnedRestaurants] = useState<RestaurantProfile[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [isPopulating, setIsPopulating] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  }, []);

  useEffect(() => {
    if (user?.uid && user.role === 'owner') {
      getRestaurantsByOwner(user.uid)
        .then(setOwnedRestaurants)
        .catch(err => {
          addLog(`Error fetching restaurants: ${err.message}`);
          toast({ variant: "destructive", title: "Error", description: "Could not load your restaurants." });
        });
    }
  }, [user, toast, addLog]);
  
  const populateRestaurantData = async (restaurantId: string) => {
    setIsPopulating(true);
    setLogs([]); // Clear previous logs
    addLog(`Starting data population for restaurant ID: ${restaurantId}`);

    const createdMenuItems: MenuItem[] = [];

    try {
      // Create Categories
      const createdCategories = [];
      for (const cat of DUMMY_CATEGORIES) {
        const newCategory = await addMenuCategory(restaurantId, { name: cat.name, order: cat.order });
        createdCategories.push(newCategory);
        addLog(`Created category: ${newCategory.name}`);
        
        const subCats = DUMMY_SUB_CATEGORIES[cat.name] || [];
        if (subCats.length > 0) {
          for (const subCat of subCats) {
            const newSubCategory = await addMenuSubcategory(restaurantId, newCategory.id, { name: subCat.name, order: subCat.order });
            addLog(`  Created subcategory: ${newSubCategory.name} under ${newCategory.name}`);
            // Add items to subcategory
            for (let i = 0; i < 3; i++) { // Add 3 items per subcategory
              const itemTemplate = DUMMY_MENU_ITEMS_POOL[Math.floor(Math.random() * DUMMY_MENU_ITEMS_POOL.length)];
              const newItemData = { ...itemTemplate, price: getRandomPrice(5, 25), order: getRandomOrder(), availability: getRandomBoolean() };
              const newItem = await addMenuItem(restaurantId, newCategory.id, newSubCategory.id, newItemData);
              createdMenuItems.push(newItem);
              addLog(`    Added item: ${newItem.name} to ${newSubCategory.name}`);
            }
          }
        } else {
           // Add items directly to category
           for (let i = 0; i < 4; i++) { // Add 4 items per category without subs
            const itemTemplate = DUMMY_MENU_ITEMS_POOL[Math.floor(Math.random() * DUMMY_MENU_ITEMS_POOL.length)];
            const newItemData = { ...itemTemplate, price: getRandomPrice(3, 15), order: getRandomOrder(), availability: getRandomBoolean() };
            const newItem = await addMenuItem(restaurantId, newCategory.id, null, newItemData);
            createdMenuItems.push(newItem);
            addLog(`    Added item: ${newItem.name} to ${newCategory.name}`);
          }
        }
      }
      addLog(`--- Menu categories and items population complete. ${createdMenuItems.length} items created. ---`);
      
      // Create Tables
      const createdTables: FirebaseTableType[] = [];
      for (let i = 1; i <= 10; i++) {
        const tableData = { tableNumber: `T${i}`, capacity: Math.random() < 0.5 ? 2 : 4 };
        const newTable = await addTable(restaurantId, tableData);
        createdTables.push(newTable);
        addLog(`Created table: ${newTable.tableNumber} (ID: ${newTable.id})`);
      }
      addLog(`--- Tables population complete. ${createdTables.length} tables created. ---`);

      // Create Orders
      if (createdMenuItems.length > 0 && createdTables.length > 0) {
        for (let i = 0; i < 15; i++) {
          const table = createdTables[Math.floor(Math.random() * createdTables.length)];
          const numItemsInOrder = Math.floor(Math.random() * 3) + 1;
          const orderItems = [];
          let subtotal = 0;
          for (let j = 0; j < numItemsInOrder; j++) {
            const menuItem = createdMenuItems[Math.floor(Math.random() * createdMenuItems.length)];
            const quantity = Math.floor(Math.random() * 2) + 1;
            const totalPrice = quantity * menuItem.price;
            orderItems.push({ menuItemId: menuItem.id, menuItemName: menuItem.name, quantity, unitPrice: menuItem.price, totalPrice });
            subtotal += totalPrice;
          }
          const orderStatuses: any[] = ['pending_kitchen', 'confirmed_by_kitchen', 'preparing', 'served', 'completed', 'cancelled_by_restaurant'];
          const randomStatus = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
          
          // Simulate past orders by adjusting createdAt
          const pastDate = new Date();
          pastDate.setDate(pastDate.getDate() - Math.floor(Math.random() * 7)); // Orders within the last 7 days
          pastDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));


          const orderData = {
            tableId: table.id,
            tableNumber: table.tableNumber,
            items: orderItems,
            subtotal,
            totalAmount: parseFloat((subtotal * 1.1).toFixed(2)), // Assuming 10% tax/service
            status: randomStatus,
            // createdAt and updatedAt will be set by serverTimestamp in createFirebaseOrder, but we can't easily set them to past for dummy data via serverTimestamp directly client-side
            // For dummy generation, direct Timestamps might be needed if precise past dates are critical.
            // The createFirebaseOrder will use serverTimestamp. For this dummy script, it's acceptable.
          };
          const newOrder = await createFirebaseOrder(restaurantId, orderData);
          addLog(`Created order ${newOrder.id} for table ${table.tableNumber} with status ${randomStatus}`);
        }
        addLog(`--- Orders population complete. ---`);
      } else {
        addLog("Skipped order creation: no menu items or tables available.");
      }

      toast({ title: "Success", description: "Dummy data populated for the selected restaurant." });
    } catch (error: any) {
      addLog(`Error during data population: ${error.message}`);
      console.error("Population error:", error);
      toast({ variant: "destructive", title: "Population Failed", description: error.message });
    } finally {
      setIsPopulating(false);
    }
  };


  if (!user || user.role !== 'owner') {
    return (
      <Card>
        <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
        <CardContent><p>You must be logged in as an owner to use this tool.</p></CardContent>
      </Card>
    );
  }
  
  return (
    <div className="container mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Populate Restaurant with Dummy Data</CardTitle>
          <CardDescription>
            Select one of your restaurants to fill it with sample menus, tables, and orders.
            This is useful for testing and demonstration. <strong>Warning:</strong> This will add new data and does not automatically clear existing data for the selected restaurant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="restaurant-select" className="mb-2 block text-sm font-medium text-foreground">
              Select Restaurant
            </label>
            <Select
              value={selectedRestaurantId || undefined}
              onValueChange={setSelectedRestaurantId}
              disabled={isPopulating || ownedRestaurants.length === 0}
            >
              <SelectTrigger id="restaurant-select">
                <SelectValue placeholder={ownedRestaurants.length === 0 ? "No restaurants found" : "Choose a restaurant..."} />
              </SelectTrigger>
              <SelectContent>
                {ownedRestaurants.map((resto) => (
                  <SelectItem key={resto.id} value={resto.id}>
                    {resto.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
             {ownedRestaurants.length === 0 && !isPopulating && (
                <p className="mt-2 text-sm text-muted-foreground">You don't own any restaurants. Please create one first.</p>
            )}
          </div>
          <Button
            onClick={() => selectedRestaurantId && populateRestaurantData(selectedRestaurantId)}
            disabled={!selectedRestaurantId || isPopulating}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isPopulating ? <LoadingSpinner className="mr-2 h-4 w-4" /> : null}
            {isPopulating ? 'Populating Data...' : 'Start Data Population'}
          </Button>
        </CardContent>
      </Card>
      
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Population Log</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-72 w-full rounded-md border p-3 text-sm">
              {logs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
