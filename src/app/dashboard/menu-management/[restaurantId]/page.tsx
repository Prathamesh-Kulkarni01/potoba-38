// src/app/dashboard/menu-management/[restaurantId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { getRestaurant } from '@/lib/firebase/firestore';
import type { RestaurantProfile, MenuCategory, MenuSubcategory, MenuItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Search, Edit3, Trash2, Utensils } from 'lucide-react';
import Image from 'next/image';
import { Timestamp } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';


// Dummy Data (using actual types from @/types)
const createDummyCategories = (restaurantId: string): MenuCategory[] => [
  { id: 'cat1', name: 'Appetizers', order: 1, restaurantId, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'cat2', name: 'Main Courses', order: 2, restaurantId, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'cat3', name: 'Desserts', order: 3, restaurantId, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'cat4', name: 'Drinks', order: 4, restaurantId, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
];

const createDummySubcategories = (restaurantId: string): MenuSubcategory[] => [
  { id: 'sub1', name: 'Soups', categoryId: 'cat1', order: 1, restaurantId, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'sub2', name: 'Salads', categoryId: 'cat1', order: 2, restaurantId, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'sub3', name: 'Vegetarian', categoryId: 'cat2', order: 1, restaurantId, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'sub4', name: 'Chicken Entrees', categoryId: 'cat2', order: 2, restaurantId, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'sub5', name: 'Beef Entrees', categoryId: 'cat2', order: 3, restaurantId, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'sub6', name: 'Cakes', categoryId: 'cat3', order: 1, restaurantId, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'sub7', name: 'Ice Cream', categoryId: 'cat3', order: 2, restaurantId, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'sub8', name: 'Soft Drinks', categoryId: 'cat4', order: 1, restaurantId, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'sub9', name: 'Juices', categoryId: 'cat4', order: 2, restaurantId, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
];

const createDummyMenuItems = (restaurantId: string): MenuItem[] => [
  { id: 'item1', categoryId: 'cat1', subcategoryId: 'sub1', name: 'Tomato Soup', description: 'Classic creamy tomato soup, served hot with a swirl of cream and a side of crunchy croutons.', price: 5.99, availability: true, order: 1, restaurantId, createdAt: Timestamp.now(), updatedAt: Timestamp.now(), imageUrl: 'https://picsum.photos/seed/tomsoup/300/200', dietaryTags:['vegetarian', 'gluten-free'], allergenInfo:['dairy'] },
  { id: 'item2', categoryId: 'cat1', subcategoryId: 'sub1', name: 'Chicken Noodle Soup', description: 'Hearty chicken noodle soup with tender chicken pieces, egg noodles, and a mix of fresh vegetables.', price: 6.50, availability: true, order: 2, restaurantId, createdAt: Timestamp.now(), updatedAt: Timestamp.now(), imageUrl: 'https://picsum.photos/seed/chicknoodlesoup/300/200', dietaryTags:[], allergenInfo:['gluten', 'egg'] },
  { id: 'item3', categoryId: 'cat1', subcategoryId: 'sub2', name: 'Caesar Salad', description: 'Crisp romaine lettuce, Parmesan cheese, croutons, and a classic Caesar dressing. Add chicken for $3.', price: 7.25, availability: true, order: 1, restaurantId, createdAt: Timestamp.now(), updatedAt: Timestamp.now(), imageUrl: 'https://picsum.photos/seed/caesarsalad/300/200', dietaryTags:[], allergenInfo:['dairy', 'gluten', 'fish'] },
  { id: 'item4', categoryId: 'cat1', name: 'Garlic Bread', description: 'Toasted baguette slices brushed with garlic butter and herbs, served warm.', price: 4.00, availability: true, order: 3, restaurantId, createdAt: Timestamp.now(), updatedAt: Timestamp.now(), imageUrl: 'https://picsum.photos/seed/garlicbread/300/200', dietaryTags:['vegetarian'], allergenInfo:['gluten', 'dairy'] },
  { id: 'item5', categoryId: 'cat2', subcategoryId: 'sub3', name: 'Veggie Burger', description: 'A delicious plant-based patty on a whole wheat bun with lettuce, tomato, onion, and our special sauce.', price: 10.99, availability: true, order: 1, restaurantId, createdAt: Timestamp.now(), updatedAt: Timestamp.now(), imageUrl: 'https://picsum.photos/seed/veggieburg/300/200', dietaryTags:['vegan', 'vegetarian'], allergenInfo:['gluten', 'soy'] },
  { id: 'item6', categoryId: 'cat2', subcategoryId: 'sub3', name: 'Paneer Tikka Masala', description: 'Grilled paneer cubes simmered in a rich, creamy tomato and cashew gravy, served with basmati rice.', price: 12.50, availability: true, order: 2, restaurantId, createdAt: Timestamp.now(), updatedAt: Timestamp.now(), imageUrl: 'https://picsum.photos/seed/paneertikka/300/200', dietaryTags:['vegetarian', 'gluten-free'], allergenInfo:['dairy', 'nuts'] },
  { id: 'item7', categoryId: 'cat2', subcategoryId: 'sub4', name: 'Grilled Chicken Breast', description: 'Juicy herb-marinated chicken breast, grilled to perfection, served with roasted vegetables.', price: 14.00, availability: true, order: 1, restaurantId, createdAt: Timestamp.now(), updatedAt: Timestamp.now(), imageUrl: 'https://picsum.photos/seed/grillchick/300/200', dietaryTags:['gluten-free'], allergenInfo:[] },
  { id: 'item8', categoryId: 'cat2', subcategoryId: 'sub4', name: 'Butter Chicken', description: 'Tender chicken pieces cooked in a rich and creamy tomato-based sauce with butter and spices.', price: 15.50, availability: false, order: 2, restaurantId, createdAt: Timestamp.now(), updatedAt: Timestamp.now(), imageUrl: 'https://picsum.photos/seed/butterchick/300/200', dietaryTags:[], allergenInfo:['dairy', 'nuts'] },
  { id: 'item9', categoryId: 'cat3', subcategoryId: 'sub6', name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with a molten chocolate center, served with a scoop of vanilla ice cream.', price: 8.00, availability: true, order: 1, restaurantId, createdAt: Timestamp.now(), updatedAt: Timestamp.now(), imageUrl: 'https://picsum.photos/seed/lavacake/300/200', dietaryTags:['vegetarian'], allergenInfo:['gluten', 'egg', 'dairy'] },
  { id: 'item10', categoryId: 'cat3', name: 'Fruit Platter', description: 'A refreshing assortment of seasonal fresh fruits, perfect for a light dessert.', price: 7.00, availability: true, order: 3, restaurantId, createdAt: Timestamp.now(), updatedAt: Timestamp.now(), imageUrl: 'https://picsum.photos/seed/fruitplatter/300/200', dietaryTags:['vegan', 'vegetarian', 'gluten-free'], allergenInfo:[] },
  { id: 'item11', categoryId: 'cat4', subcategoryId: 'sub8', name: 'Cola', description: 'Classic carbonated cola beverage.', price: 2.50, availability: true, order: 1, restaurantId, createdAt: Timestamp.now(), updatedAt: Timestamp.now(), dietaryTags:[], allergenInfo:[] },
  { id: 'item12', categoryId: 'cat4', subcategoryId: 'sub8', name: 'Lemonade', description: 'Freshly squeezed lemonade, perfectly sweet and tangy.', price: 3.00, availability: true, order: 2, restaurantId, createdAt: Timestamp.now(), updatedAt: Timestamp.now(), dietaryTags:['vegan', 'vegetarian', 'gluten-free'], allergenInfo:[] },
];


interface MenuItemDisplayCardProps {
  item: MenuItem;
}

const MenuItemDisplayCard = ({ item }: MenuItemDisplayCardProps) => (
  <Card className="overflow-hidden flex flex-col h-full shadow-md hover:shadow-lg transition-shadow">
    {item.imageUrl ? (
      <Image src={item.imageUrl} alt={item.name} width={300} height={180} className="w-full h-40 object-cover" data-ai-hint="food dish" />
    ) : (
      <div className="w-full h-40 bg-muted flex items-center justify-center text-muted-foreground" data-ai-hint="placeholder food">
        <Utensils className="w-12 h-12" />
      </div>
    )}
    <CardHeader className="p-4">
      <div className="flex justify-between items-start">
        <CardTitle className="text-lg leading-tight">{item.name}</CardTitle>
        <p className="text-lg text-primary font-semibold whitespace-nowrap">${item.price.toFixed(2)}</p>
      </div>
      {!item.availability && <Badge variant="destructive" className="mt-1 w-fit">Unavailable</Badge>}
    </CardHeader>
    <CardContent className="p-4 pt-0 flex-grow">
      <p className="text-xs text-muted-foreground mb-3 h-12 overflow-y-auto">{item.description}</p>
    </CardContent>
    <CardContent className="p-4 pt-0 mt-auto">
       <div className="flex justify-end space-x-2">
        <Button variant="outline" size="sm" className="h-8 w-8 p-0"><Edit3 className="h-4 w-4" /></Button>
        <Button variant="destructive" size="sm" className="h-8 w-8 p-0"><Trash2 className="h-4 w-4" /></Button>
      </div>
    </CardContent>
  </Card>
);


export default function MenuManagementPage() {
  const params = useParams();
  const restaurantId = params.restaurantId as string;
  const { user, role, initialLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Initialize dummy data state
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [subcategories, setSubcategories] = useState<MenuSubcategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  
  const [filteredMenuItems, setFilteredMenuItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    if (authLoading) return;

    if (!user || role !== 'owner') {
      // Also allow 'staff' to view menu, but not edit (edit controls can be conditionally disabled later)
      if (role !== 'staff') {
        router.replace('/dashboard');
        return;
      }
    }

    if (!restaurantId) {
      router.replace('/dashboard');
      return;
    }
    
    // Staff access check: ensure they belong to this restaurant if restaurantId is from user context
    if (role === 'staff' && user?.restaurantId !== restaurantId) {
      router.replace('/dashboard'); // Or an access denied page
      return;
    }


    setPageLoading(true);
    getRestaurant(restaurantId)
      .then((data) => {
        if (data && (data.ownerId === user?.uid || role === 'staff')) { // Allow staff to view
          setRestaurant(data);
          // Initialize dummy data here now that restaurantId is confirmed
          setCategories(createDummyCategories(restaurantId));
          setSubcategories(createDummySubcategories(restaurantId));
          const allItems = createDummyMenuItems(restaurantId);
          setMenuItems(allItems);
          setFilteredMenuItems(allItems); 
        } else {
          router.replace('/dashboard');
        }
      })
      .catch(() => {
        router.replace('/dashboard');
      })
      .finally(() => {
        setPageLoading(false);
      });
  }, [restaurantId, user, role, authLoading, router]);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredMenuItems(menuItems);
      return;
    }
    setFilteredMenuItems(
      menuItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [searchTerm, menuItems]);


  if (authLoading || pageLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner className="h-10 w-10 text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <Card>
        <CardHeader><CardTitle>Error</CardTitle></CardHeader>
        <CardContent><p>Restaurant not found or you do not have permission.</p></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl">Menu Management for {restaurant.name}</CardTitle>
          <CardDescription>
            Organize categories, subcategories, and items for your restaurant's menu.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
            <div className="relative w-full md:w-2/5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Search menu items..." 
                className="pl-10 w-full" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {role === 'owner' && (
              <Button className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Category
              </Button>
            )}
          </div>
          
          {categories.length > 0 ? (
            <Tabs defaultValue={categories[0].id} className="w-full">
              <TabsList className="mb-4 grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:flex lg:w-auto">
                {categories.sort((a,b) => a.order - b.order).map(category => (
                  <TabsTrigger key={category.id} value={category.id} className="flex-1 lg:flex-initial">
                    {category.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {categories.sort((a,b) => a.order - b.order).map(category => (
                <TabsContent key={category.id} value={category.id}>
                  <Card className="mb-6 border-primary/50 shadow-md">
                    <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center bg-muted/30 p-4 rounded-t-lg">
                      <div className="mb-2 md:mb-0">
                        <CardTitle className="text-xl">{category.name}</CardTitle>
                        <CardDescription>Manage items and subcategories within {category.name}.</CardDescription>
                      </div>
                       {role === 'owner' && (
                        <div className="flex space-x-2 flex-wrap gap-2">
                          <Button variant="outline" size="sm"><Edit3 className="mr-2 h-3 w-3" /> Edit Category</Button>
                          <Button variant="outline" size="sm" className="bg-accent hover:bg-accent/80 text-accent-foreground"><PlusCircle className="mr-2 h-3 w-3" /> Add Subcategory</Button>
                          <Button variant="outline" size="sm" className="bg-primary hover:bg-primary/80 text-primary-foreground"><PlusCircle className="mr-2 h-3 w-3" /> Add Item to {category.name}</Button>
                        </div>
                       )}
                    </CardHeader>
                    <CardContent className="p-4">
                      {/* Items directly under category */}
                      {filteredMenuItems.filter(item => item.categoryId === category.id && !item.subcategoryId).length > 0 && (
                        <>
                          <h4 className="text-md font-semibold mt-0 mb-3 text-muted-foreground pl-1">Items in {category.name} (Direct)</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                            {filteredMenuItems
                              .filter(item => item.categoryId === category.id && !item.subcategoryId)
                              .sort((a,b) => a.order - b.order)
                              .map(item => (
                                <MenuItemDisplayCard key={item.id} item={item} />
                            ))}
                          </div>
                        </>
                      )}

                      {/* Subcategories and their items */}
                      {subcategories.filter(sub => sub.categoryId === category.id).sort((a,b) => a.order - b.order).map(subcategory => (
                        <div key={subcategory.id} className="mt-4">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3 p-3 bg-muted/50 rounded-md border">
                            <h4 className="text-lg font-semibold mb-2 md:mb-0">{subcategory.name}</h4>
                            {role === 'owner' && (
                                <div className="flex space-x-2">
                                    <Button variant="outline" size="xs"><Edit3 className="mr-1 h-3 w-3" /> Edit Sub</Button>
                                    <Button variant="default" size="xs" className="bg-primary hover:bg-primary/80 text-primary-foreground"><PlusCircle className="mr-1 h-3 w-3" /> Add Item</Button>
                                </div>
                            )}
                          </div>
                          {filteredMenuItems.filter(item => item.subcategoryId === subcategory.id).length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                              {filteredMenuItems
                                .filter(item => item.subcategoryId === subcategory.id)
                                .sort((a,b) => a.order - b.order)
                                .map(item => (
                                  <MenuItemDisplayCard key={item.id} item={item} />
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground pl-1">No items in this subcategory match your search or exist yet.</p>
                          )}
                        </div>
                      ))}
                       {subcategories.filter(sub => sub.categoryId === category.id).length === 0 && filteredMenuItems.filter(item => item.categoryId === category.id && !item.subcategoryId).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No subcategories or direct items found for "{category.name}" {searchTerm && 'matching your search.'}</p>
                       )}
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <div className="text-center py-10">
              <Utensils className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Categories Yet</h3>
              <p className="text-muted-foreground mb-4">Start building your menu by adding a category.</p>
              {role === 'owner' && (
                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add New Category
               </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
