
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
import type { RestaurantProfile, MenuItem, Table as FirebaseTableType, OrderStatus } from '@/types';
import { addMenuCategory, addMenuSubcategory, addMenuItem } from '@/lib/firebase/menu';
import { addTable } from '@/lib/firebase/tables';
import { createOrder as createFirebaseOrder } from '@/lib/firebase/orders';
import { Timestamp } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';

// Dummy Data Generation Functions
const DUMMY_CATEGORIES = [
  { name: "Starters (Shuruaat)", order: 1 },
  { name: "Soups (Shorba)", order: 2 },
  { name: "Tandoori & Grills (Tandoor Se)", order: 3 },
  { name: "Main Courses (Mukhya Bhojan)", order: 4 },
  { name: "Breads (Rotiyaan)", order: 5 },
  { name: "Rice & Biryani (Chawal Aur Biryani)", order: 6 },
  { name: "Desserts (Mithaiyan)", order: 7 },
  { name: "Beverages ( पेय)", order: 8 },
];

const DUMMY_SUB_CATEGORIES: Record<string, { name: string, order: number }[]> = {
  "Starters (Shuruaat)": [
    { name: "Vegetarian Starters", order: 1 },
    { name: "Non-Vegetarian Starters", order: 2 },
  ],
  "Main Courses (Mukhya Bhojan)": [
    { name: "Vegetarian Curries", order: 1 },
    { name: "Chicken Curries", order: 2 },
    { name: "Lamb & Mutton Curries", order: 3 },
    { name: "Seafood Curries", order: 4 },
    { name: "Dal (Lentils)", order: 5},
  ],
  "Beverages ( पेय)": [
    { name: "Lassi & Chaas", order: 1 },
    { name: "Soft Drinks & Juices", order: 2 },
    { name: "Tea & Coffee", order: 3 },
  ],
};

const getRandomPrice = (min: number, max: number) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
const getRandomOrder = () => Math.floor(Math.random() * 100);
const getRandomBoolean = () => Math.random() < 0.85; // 85% chance of true

const DUMMY_MENU_ITEMS_POOL: Omit<MenuItem, 'id' | 'restaurantId' | 'categoryId' | 'subcategoryId' | 'createdAt' | 'updatedAt' | 'order' | 'price' | 'availability'>[] = [
  // Vegetarian Starters
  { name: "Paneer Tikka", description: "Cubes of paneer marinated in yogurt and spices, grilled in a tandoor.", dietaryTags: ["vegetarian"], calories: 280, imageUrl: "https://picsum.photos/seed/paneertikka/400/250" },
  { name: "Vegetable Samosa", description: "Crispy pastry filled with spiced potatoes and peas, served with chutney.", dietaryTags: ["vegetarian", "vegan"], calories: 150, imageUrl: "https://picsum.photos/seed/samosa/400/250" },
  { name: "Hara Bhara Kebab", description: "Spinach and green pea patties, mildly spiced and pan-fried.", dietaryTags: ["vegetarian"], calories: 200, imageUrl: "https://picsum.photos/seed/harakebab/400/250" },
  // Non-Vegetarian Starters
  { name: "Chicken Tikka", description: "Boneless chicken pieces marinated in yogurt and spices, grilled in a tandoor.", calories: 300, imageUrl: "https://picsum.photos/seed/chickentikka/400/250" },
  { name: "Seekh Kebab", description: "Minced lamb seasoned with spices, skewered and grilled.", calories: 350, imageUrl: "https://picsum.photos/seed/seekhkebab/400/250" },
  // Soups
  { name: "Tomato Shorba", description: "A light and tangy tomato soup with Indian spices.", dietaryTags: ["vegetarian", "vegan"], calories: 120, imageUrl: "https://picsum.photos/seed/tomatoshorba/400/250" },
  { name: "Mulligatawny Soup", description: "A traditional Anglo-Indian lentil and vegetable soup, subtly spiced.", dietaryTags: ["vegetarian"], calories: 180, imageUrl: "https://picsum.photos/seed/mulligatawny/400/250" },
  // Tandoori & Grills
  { name: "Tandoori Chicken", description: "Whole chicken marinated in yogurt and spices, roasted in a tandoor.", calories: 450, imageUrl: "https://picsum.photos/seed/tandoorichicken/400/250" },
  { name: "Fish Tikka Ajwaini", description: "Chunks of fish marinated with carom seeds (ajwain) and spices, grilled.", calories: 320, imageUrl: "https://picsum.photos/seed/fishtikka/400/250" },
  // Vegetarian Curries
  { name: "Palak Paneer", description: "Paneer cubes in a smooth spinach gravy.", dietaryTags: ["vegetarian"], calories: 400, imageUrl: "https://picsum.photos/seed/palakpaneer/400/250" },
  { name: "Malai Kofta", description: "Deep-fried paneer and vegetable dumplings in a rich, creamy tomato-cashew gravy.", dietaryTags: ["vegetarian"], calories: 550, imageUrl: "https://picsum.photos/seed/malaikofta/400/250" },
  { name: "Chana Masala", description: "Chickpeas cooked in a spicy onion-tomato gravy.", dietaryTags: ["vegetarian", "vegan"], calories: 350, imageUrl: "https://picsum.photos/seed/chanamasala/400/250" },
  // Chicken Curries
  { name: "Butter Chicken (Murgh Makhani)", description: "Tandoori chicken pieces cooked in a rich tomato and butter gravy.", calories: 600, imageUrl: "https://picsum.photos/seed/butterchicken/400/250" },
  { name: "Chicken Korma", description: "Chicken cooked in a mild, creamy yogurt and nut-based gravy.", calories: 580, imageUrl: "https://picsum.photos/seed/chickenkorma/400/250" },
  // Lamb & Mutton Curries
  { name: "Rogan Josh", description: "Aromatic Kashmiri lamb curry with a rich red gravy.", calories: 650, imageUrl: "https://picsum.photos/seed/roganjosh/400/250" },
  { name: "Mutton Vindaloo", description: "Spicy and tangy Goan mutton curry.", calories: 700, imageUrl: "https://picsum.photos/seed/muttonvindaloo/400/250" },
  // Dal (Lentils)
  { name: "Dal Makhani", description: "Black lentils and kidney beans slow-cooked with butter and cream.", dietaryTags: ["vegetarian"], calories: 450, imageUrl: "https://picsum.photos/seed/dalmakhani/400/250" },
  { name: "Dal Tadka", description: "Yellow lentils tempered with spices and ghee.", dietaryTags: ["vegetarian", "vegan option available"], calories: 300, imageUrl: "https://picsum.photos/seed/daltadka/400/250" },
  // Breads
  { name: "Naan", description: "Soft leavened bread baked in a tandoor.", dietaryTags: ["vegetarian"], calories: 200, imageUrl: "https://picsum.photos/seed/naan/400/250" },
  { name: "Garlic Naan", description: "Naan bread topped with garlic and butter.", dietaryTags: ["vegetarian"], calories: 250, imageUrl: "https://picsum.photos/seed/garlicnaan/400/250" },
  { name: "Tandoori Roti", description: "Whole wheat bread baked in a tandoor.", dietaryTags: ["vegetarian", "vegan"], calories: 150, imageUrl: "https://picsum.photos/seed/tandooriroti/400/250" },
  { name: "Lachha Paratha", description: "Layered flaky whole wheat bread.", dietaryTags: ["vegetarian"], calories: 220, imageUrl: "https://picsum.photos/seed/lachhaparatha/400/250" },
  // Rice & Biryani
  { name: "Steamed Rice", description: "Plain steamed basmati rice.", dietaryTags: ["vegetarian", "vegan", "gluten-free"], calories: 180, imageUrl: "https://picsum.photos/seed/steamedrice/400/250" },
  { name: "Vegetable Biryani", description: "Aromatic basmati rice cooked with mixed vegetables and spices.", dietaryTags: ["vegetarian"], calories: 400, imageUrl: "https://picsum.photos/seed/vegbiryani/400/250" },
  { name: "Chicken Biryani", description: "Fragrant basmati rice cooked with chicken and a blend of spices.", calories: 550, imageUrl: "https://picsum.photos/seed/chickenbiryani/400/250" },
  // Desserts
  { name: "Gulab Jamun", description: "Deep-fried milk solids dumplings soaked in sugar syrup.", dietaryTags: ["vegetarian"], calories: 300, imageUrl: "https://picsum.photos/seed/gulabjamun/400/250" },
  { name: "Rasmalai", description: "Spongy cottage cheese patties soaked in saffron-flavored sweetened milk.", dietaryTags: ["vegetarian"], calories: 250, imageUrl: "https://picsum.photos/seed/rasmalai/400/250" },
  // Beverages - Lassi & Chaas
  { name: "Sweet Lassi", description: "Creamy yogurt-based drink, sweetened.", dietaryTags: ["vegetarian"], calories: 220, imageUrl: "https://picsum.photos/seed/sweetlassi/400/250" },
  { name: "Masala Chaas", description: "Spiced buttermilk, refreshing and digestive.", dietaryTags: ["vegetarian"], calories: 80, imageUrl: "https://picsum.photos/seed/masalachas/400/250" },
  // Beverages - Soft Drinks & Juices
  { name: "Fresh Lime Soda", description: "Refreshing soda with fresh lime juice, sweet or salted.", dietaryTags: ["vegetarian", "vegan"], calories: 100, imageUrl: "https://picsum.photos/seed/limesoda/400/250" },
  { name: "Mango Juice", description: "Freshly squeezed mango juice (seasonal).", dietaryTags: ["vegetarian", "vegan"], calories: 150, imageUrl: "https://picsum.photos/seed/mangojuice/400/250" },
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
            for (let i = 0; i < 2; i++) { // Add 2 items per subcategory
              const itemTemplate = DUMMY_MENU_ITEMS_POOL[Math.floor(Math.random() * DUMMY_MENU_ITEMS_POOL.length)];
              const newItemData = { ...itemTemplate, price: getRandomPrice(8, 30), order: getRandomOrder(), availability: getRandomBoolean() };
              const newItem = await addMenuItem(restaurantId, newCategory.id, newSubCategory.id, newItemData);
              createdMenuItems.push(newItem);
              addLog(`    Added item: ${newItem.name} to ${newSubCategory.name}`);
            }
          }
        } else {
           // Add items directly to category
           for (let i = 0; i < 3; i++) { // Add 3 items per category without subs
            const itemTemplate = DUMMY_MENU_ITEMS_POOL[Math.floor(Math.random() * DUMMY_MENU_ITEMS_POOL.length)];
            const newItemData = { ...itemTemplate, price: getRandomPrice(4, 20), order: getRandomOrder(), availability: getRandomBoolean() };
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
          const orderStatuses: OrderStatus[] = ['pending_kitchen', 'confirmed_by_kitchen', 'preparing', 'served', 'completed', 'cancelled_by_restaurant'];
          const randomStatus = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
          
          const pastDate = new Date();
          pastDate.setDate(pastDate.getDate() - Math.floor(Math.random() * 7)); 
          pastDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

          // Prepare order data for Firestore (Timestamps are handled by serverTimestamp in createOrder)
          const orderData = {
            tableId: table.id,
            tableNumber: table.tableNumber,
            items: orderItems,
            subtotal,
            totalAmount: parseFloat((subtotal * 1.1).toFixed(2)), // Assuming 10% tax/service
            status: randomStatus,
            // createdAt and updatedAt are set server-side by createFirebaseOrder
          };
          const newOrder = await createFirebaseOrder(restaurantId, orderData);
          // Log creation but use newOrder.id which is the actual ID. Status is from randomStatus
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

