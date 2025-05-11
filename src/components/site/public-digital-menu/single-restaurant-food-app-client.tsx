
'use client';

import type { RestaurantProfile, MenuCategory, MenuItem as MenuItemType, Table } from '@/types';
import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, MapPin, Clock, Star, ChevronDown, Filter, TrendingUp, Tag, Heart, Menu, User, ShoppingBag, Home, Bell, ShoppingCart as CartIconLucide, X } from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { useCart, type CartItem } from '../public-homepage/cart-store';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import DishCard from '@/components/site/shared/dish-card';
import TopNavigationBar from '../public-homepage/top-navigation-bar';
import { useAuth } from '@/lib/auth/context'; // Import useAuth

interface RestaurantDisplayInfo {
  name: string;
  logo: string;
  coverImage: string;
  cuisine: string;
  rating: number;
  deliveryTime: string;
  minOrder: string;
  isOpen: boolean;
}

interface Offer {
  id: string;
  title: string;
  description: string;
  color: string;
}

interface SingleRestaurantFoodAppClientProps {
  restaurantData: RestaurantProfile & { createdAt: string; updatedAt: string };
  restaurantDisplayInfo: RestaurantDisplayInfo;
  menuCategoriesData: (MenuCategory & { createdAt: string; updatedAt: string })[];
  allMenuItemsData: (MenuItemType & { createdAt: string; updatedAt: string })[];
  popularItemsData: (MenuItemType & { createdAt: string; updatedAt: string })[];
  offersData: Offer[];
  tableContext?: Pick<Table, 'id' | 'number' | 'docId'>; 
}

export default function SingleRestaurantFoodAppClient({
  restaurantData,
  restaurantDisplayInfo,
  menuCategoriesData,
  allMenuItemsData,
  popularItemsData,
  offersData,
  tableContext
}: SingleRestaurantFoodAppClientProps) {
  const { cart, addToCart } = useCart();
  const { toast } = useToast();
  const { user, loading: authLoading, signInAnonymouslyHandler } = useAuth(); // Get user and signInAnonymouslyHandler

  const [activeTab, setActiveTab] = useState('menu');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true); // General page loading
  const [favorites, setFavorites] = useState<Record<string, boolean>>({}); 
  const [showNavShadow, setShowNavShadow] = useState(false);

  const cartTotalItems = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const cartTotalPrice = useMemo(() => cart.reduce((sum, item) => sum + item.totalPrice, 0), [cart]);

  useEffect(() => {
    // Perform anonymous sign-in if table context exists and no user is logged in (and auth isn't already loading)
    if (tableContext && !user && !authLoading) {
      signInAnonymouslyHandler().then(anonUser => {
        if (anonUser) {
          toast({ title: "Welcome!", description: "You're ordering for your table." });
        } else {
          toast({ variant: "destructive", title: "Error", description: "Could not start table order session." });
        }
      });
    }
  }, [tableContext, user, authLoading, signInAnonymouslyHandler, toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false); // General UI loading
    }, 500); 
    const handleScroll = () => setShowNavShadow(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleAddToCart = (item: MenuItemType) => {
    const cartItem: CartItem = {
      menuItemId: item.id,
      menuItemName: item.name,
      quantity: 1,
      unitPrice: item.price,
      totalPrice: item.price,
      imageUrl: item.imageUrl || undefined,
    };
    addToCart(cartItem);
    toast({ title: `${item.name} Added`, description: "Item added to your cart." });
  };

  const toggleFavorite = (itemId: string) => {
    setFavorites(prev => ({ ...prev, [itemId]: !prev[itemId] }));
    toast({ title: favorites[itemId] ? "Removed from Favorites" : "Added to Favorites", description: "Your preference has been updated." });
  };

  const displayedMenuItems = useMemo(() => {
    let items = allMenuItemsData;
    if (searchQuery) {
      items = items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return items.filter(item => item.availability);
  }, [allMenuItemsData, searchQuery]);

  const menuCategoriesWithCounts = useMemo(() => {
    return menuCategoriesData.map(category => ({
      ...category,
      count: allMenuItemsData.filter(item => item.categoryId === category.id && item.availability).length
    }));
  }, [menuCategoriesData, allMenuItemsData]);

  const checkoutUrl = useMemo(() => {
    let base = `/site/${restaurantData.id}/checkout`;
    if (tableContext) {
      base += `?tableId=${tableContext.docId}&tableNumber=${encodeURIComponent(tableContext.number)}`;
    }
    return base;
  }, [restaurantData.id, tableContext]);

  const headerRestaurantName = tableContext 
    ? `${restaurantDisplayInfo.name} - Table ${tableContext.number}` 
    : restaurantDisplayInfo.name;


  if (isLoading || authLoading) { // Consider authLoading as well
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <LoadingSpinner className="h-12 w-12 text-primary" />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-background via-muted/5 to-background">
      <TopNavigationBar
        restaurantName={headerRestaurantName}
        restaurantLogoUrl={restaurantDisplayInfo.logo}
        cartItemCount={cartTotalItems}
        showShadow={showNavShadow}
        restaurantId={restaurantData.id}
        tableContext={tableContext}
        isUserAnonymous={user?.isAnonymous || false}
        userDisplayName={user?.displayName || user?.email || (user?.isAnonymous ? "Guest" : "")}
      />
      <div className="flex-1 overflow-y-auto pb-24 pt-16"> 
        <div className="relative container mx-auto mt-0 md:mt-4 rounded-b-lg md:rounded-lg overflow-hidden">
          <Image
            src={restaurantDisplayInfo.coverImage}
            alt={restaurantDisplayInfo.name}
            width={1200}
            height={200}
            className="w-full h-32 md:h-48 object-cover"
            data-ai-hint="restaurant ambiance food"
            priority
          />
          <div className="absolute -bottom-8 left-4 md:left-6 bg-card p-1 md:p-2 rounded-full shadow-lg border-2 border-card">
            <Image
              src={restaurantDisplayInfo.logo}
              alt="Logo"
              width={60}
              height={60}
              className="w-12 h-12 md:w-16 md:h-16 rounded-full"
              data-ai-hint="restaurant brand logo"
            />
          </div>
        </div>

        <div className="bg-card pt-10 md:pt-12 pb-3 px-4 container mx-auto rounded-t-lg md:rounded-lg shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="font-bold text-xl md:text-2xl text-card-foreground">{restaurantDisplayInfo.name}</h2>
              <p className="text-sm text-muted-foreground">{restaurantDisplayInfo.cuisine} {tableContext && <span className="text-primary font-semibold">(Ordering for Table {tableContext.number})</span>}</p>
              <div className="flex items-center mt-1 text-xs text-muted-foreground">
                <Clock size={12} className="mr-1 text-muted-foreground/80" />
                <span className="mr-2">{restaurantDisplayInfo.deliveryTime}</span>
                <span className="mr-2">•</span>
                <span>Min Order: {restaurantDisplayInfo.minOrder}</span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="flex items-center bg-green-100 px-2 py-0.5 rounded">
                <span className="text-sm font-medium text-green-800 mr-1">{restaurantDisplayInfo.rating}</span>
                <Star size={14} className="text-green-800 fill-green-800" />
              </div>
              <span className="text-xs text-muted-foreground mt-1">500+ ratings (mock)</span>
            </div>
          </div>
        </div>

        <div className="bg-card px-4 py-3 sticky top-[64px] md:top-[76px] z-20 shadow-sm container mx-auto"> 
          <div className="flex items-center bg-muted rounded-full px-4 py-2.5">
            <Search size={18} className="text-muted-foreground mr-2" />
            <input
              type="text"
              placeholder="Search for dishes..."
              className="bg-transparent w-full text-sm focus:outline-none text-card-foreground placeholder:text-muted-foreground"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-card py-2 px-2 shadow-sm border-b border-border container mx-auto">
          <div className="flex overflow-x-auto no-scrollbar">
            {['menu', 'reviews', 'info'].map(tabName => (
              <button
                key={tabName}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap capitalize ${activeTab === tabName ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-primary'
                  }`}
                onClick={() => setActiveTab(tabName)}
              >
                {tabName}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 container mx-auto"> 
          {activeTab === 'menu' && (
            <>
              {offersData.length > 0 && (
                <div className="bg-card py-4" id="offers-section">
                  <h3 className="px-4 mb-3 text-lg font-semibold text-card-foreground">Special Offers</h3>
                  <div className="flex overflow-x-auto px-4 pb-2 no-scrollbar">
                    <div className="flex space-x-4">
                      {offersData.map((offer) => (
                        <div
                          key={offer.id}
                          className={`${offer.color} rounded-xl p-4 min-w-[260px] shadow-lg text-white`}
                        >
                          <h4 className="font-bold text-xl">{offer.title}</h4>
                          <p className="text-sm mt-1 opacity-90">{offer.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {menuCategoriesWithCounts.length > 0 && (
                <div className="bg-card py-4 mt-2 sticky top-[128px] md:top-[140px] z-10 shadow-sm scrollbar-thin " id="menu-section"> 
                  <h3 className="px-4 mb-3 text-lg font-semibold text-card-foreground">Menu Categories</h3>
                  <div className="flex overflow-x-auto px-4 pb-2 no-scrollbar">
                    <div className="flex space-x-3">
                      {menuCategoriesWithCounts.map((category) => (
                        category.count > 0 && 
                        <div key={category.id} className="bg-muted rounded-xl p-3 min-w-[120px] text-center cursor-pointer hover:bg-muted/80 transition">
                          <p className="font-medium text-sm text-card-foreground">{category.name}</p>
                          <p className="text-xs text-muted-foreground/70">{category.count} items</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-card mt-2 py-4">
                <div className="flex justify-between items-center px-4 mb-3">
                  <h3 className="text-lg font-semibold text-card-foreground">{searchQuery ? 'Search Results' : 'Menu Items'}</h3>
                </div>

                {displayedMenuItems.length > 0 ? (
                  <div className="space-y-1 px-4">
                    {displayedMenuItems.map((item) => (
                      <DishCard 
                        key={item.id}
                        dish={item}
                        restaurantId={restaurantData.id}
                        onAddToCart={handleAddToCart}
                        onToggleFavorite={toggleFavorite}
                        isFavorite={favorites[item.id]}
                        className="bg-transparent shadow-none border-b border-border last:border-b-0 rounded-none hover:bg-muted/20 py-3"
                        context="menu-listing"
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No items match your search or filter.</p>
                )}
              </div>
            </>
          )}
          {activeTab === 'reviews' && (
            <div className="p-4 bg-card mt-2">
              <h3 className="text-lg font-semibold mb-4 text-card-foreground">Customer Reviews</h3>
              <p className="text-muted-foreground">Reviews section coming soon!</p>
            </div>
          )}
          {activeTab === 'info' && (
            <div className="p-4 bg-card mt-2" id="info-section">
              <h3 className="text-lg font-semibold mb-4 text-card-foreground">Restaurant Information</h3>
              <p className="text-muted-foreground"><strong>Address:</strong> {restaurantData.settings?.customDomain || '123 Food Street, Flavor Town, USA'}</p>
              <p className="text-muted-foreground"><strong>Hours:</strong> 11:00 AM - 10:00 PM Daily (Mock)</p>
              <p className="text-muted-foreground mt-2">More details about {restaurantDisplayInfo.name} coming soon!</p>
            </div>
          )}
        </div>
      </div>
      <div className={cn("fixed bottom-0 left-0 right-0 bg-card border-t border-border p-2 transition-transform duration-300 z-40", cartTotalItems > 0 ? 'pb-[70px]' : '')}>
        <div className="container mx-auto flex justify-around">
          <Link href={tableContext ? `/menu/table/${tableContext.docId}` : `/site/${restaurantData.id}`} className="flex flex-col items-center text-primary"> <Home size={20} /> <span className="text-xs mt-1 font-medium">Home</span> </Link>
          <button className="flex flex-col items-center text-muted-foreground"> <Search size={20} /> <span className="text-xs mt-1">Search</span> </button>
          <Link href={`/site/${restaurantData.id}/orders${tableContext ? `?tableId=${tableContext.docId}`: ''}`} className="flex flex-col items-center text-muted-foreground"> <ShoppingBag size={20} /> <span className="text-xs mt-1">Orders</span> </Link>
          <Link href={`/site/${restaurantData.id}/profile`} className="flex flex-col items-center text-muted-foreground"> <User size={20} /> <span className="text-xs mt-1">Account</span> </Link>
        </div>

        {cartTotalItems > 0 && (
          <Link href={checkoutUrl} className="fixed bottom-0 left-0 right-0 md:max-w-screen-sm md:mx-auto md:bottom-2 md:left-1/2 md:-translate-x-1/2 z-50">
            <div className="bg-primary text-primary-foreground rounded-lg mx-4 mb-2 p-3 flex items-center justify-between shadow-lg hover:bg-primary/80 transition cursor-pointer">
              <div>
                <span className="font-bold">{cartTotalItems} item{cartTotalItems > 1 ? 's' : ''}</span>
                <span className="mx-2">|</span>
                <span>${cartTotalPrice.toFixed(2)}</span>
              </div>
              <div className="flex items-center font-semibold">
                <span>View Cart</span>
                <ChevronDown size={18} className="ml-1 transform rotate-[-90deg]" />
              </div>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
