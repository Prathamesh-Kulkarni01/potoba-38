
'use client';

import type { RestaurantProfile, MenuCategory, MenuItem as MenuItemType } from '@/types';
import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, MapPin, Clock, Star, ChevronDown, Filter, TrendingUp, Tag, Heart, Menu, User, ShoppingBag, Home, Bell, ShoppingCart as CartIconLucide } from 'lucide-react'; // Renamed ShoppingCart to CartIconLucide
import { Button } from '@/components/ui/button';
import { useCart, type CartItem } from '../public-homepage/cart-store';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

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
}

// Helper function to infer if an item is vegetarian
const isVegetarian = (item: MenuItemType): boolean => {
  if (item.dietaryTags && item.dietaryTags.some(tag => tag.toLowerCase() === 'vegetarian' || tag.toLowerCase() === 'vegan')) {
    return true;
  }
  // Add more sophisticated checks if needed, e.g., based on ingredients
  return false; // Default to non-veg if not explicitly tagged
};


export default function SingleRestaurantFoodAppClient({
  restaurantData,
  restaurantDisplayInfo,
  menuCategoriesData,
  allMenuItemsData,
  popularItemsData,
  offersData
}: SingleRestaurantFoodAppClientProps) {
  const { cart, addToCart, updateQuantity, deleteFromCart } = useCart();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('menu');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true); // For initial page load simulation
  const [favorites, setFavorites] = useState<Record<string, boolean>>({}); // UI-only favorites

  // Calculate cart total items and price
  const cartTotalItems = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const cartTotalPrice = useMemo(() => cart.reduce((sum, item) => sum + item.totalPrice, 0), [cart]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500); // Shorter loading for dynamic data
    return () => clearTimeout(timer);
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
    // Further category filtering could happen here if category tabs were more interactive
    return items.filter(item => item.availability);
  }, [allMenuItemsData, searchQuery]);
  
  const menuCategoriesWithCounts = useMemo(() => {
    return menuCategoriesData.map(category => ({
      ...category,
      count: allMenuItemsData.filter(item => item.categoryId === category.id && item.availability).length
    }));
  }, [menuCategoriesData, allMenuItemsData]);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <LoadingSpinner className="h-12 w-12 text-red-500" />
      </div>
    );
  }
  
  const NavLinks = ({ onLinkClick }: { onLinkClick?: () => void }) => (
  <>
    <Link href={`/site/${restaurantData.id}#menu-section`} onClick={onLinkClick} className="text-sm font-medium text-gray-100 transition-colors hover:text-yellow-300">Menu</Link>
    <Link href={`/site/${restaurantData.id}#offers-section`} onClick={onLinkClick} className="text-sm font-medium text-gray-100 transition-colors hover:text-yellow-300">Offers</Link>
    <Link href={`/site/${restaurantData.id}#info-section`} onClick={onLinkClick} className="text-sm font-medium text-gray-100 transition-colors hover:text-yellow-300">Info</Link>
    <Button asChild variant="ghost" className="text-yellow-300 hover:bg-red-700" onClick={onLinkClick}>
      <Link href={`/site/${restaurantData.id}/checkout`}>Order Now</Link>
    </Button>
  </>
);


  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30">
        <div className="bg-red-600 text-white p-4 shadow-md">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="mr-2 text-white hover:bg-red-700 md:hidden">
                    <Menu size={22} />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-3/4 max-w-xs bg-white p-0">
                    <div className="flex items-center p-4 border-b">
                      <Image 
                        src={restaurantDisplayInfo.logo} 
                        alt="Logo" 
                        width={48} 
                        height={48} 
                        className="rounded-full" 
                        data-ai-hint="restaurant logo"
                      />
                      <div className="ml-3">
                        <h3 className="font-bold text-gray-800">{restaurantDisplayInfo.name}</h3>
                        <p className="text-xs text-gray-500">{restaurantDisplayInfo.cuisine}</p>
                      </div>
                    </div>
                    <div className="space-y-1 p-4">
                        <SheetClose asChild><Link href={`/site/${restaurantData.id}`} className="flex items-center p-3 hover:bg-gray-100 rounded text-gray-700"><Home size={18} className="mr-3 text-gray-600" /> Home</Link></SheetClose>
                        <SheetClose asChild><Link href={`/site/${restaurantData.id}/profile`} className="flex items-center p-3 hover:bg-gray-100 rounded text-gray-700"><User size={18} className="mr-3 text-gray-600" /> My Profile</Link></SheetClose>
                        <SheetClose asChild><Link href={`/site/${restaurantData.id}/orders`} className="flex items-center p-3 hover:bg-gray-100 rounded text-gray-700"><ShoppingBag size={18} className="mr-3 text-gray-600" /> My Orders</Link></SheetClose>
                        <SheetClose asChild><Link href={`/site/${restaurantData.id}/favorites`} className="flex items-center p-3 hover:bg-gray-100 rounded text-gray-700"><Heart size={18} className="mr-3 text-gray-600" /> Favorites</Link></SheetClose>
                    </div>
                     <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
                        <Button className="w-full bg-red-600 hover:bg-red-700 text-white">Sign Out (Mock)</Button>
                    </div>
                </SheetContent>
              </Sheet>
              <Link href={`/site/${restaurantData.id}`}>
                <h1 className="font-bold text-lg cursor-pointer">{restaurantDisplayInfo.name}</h1>
                <p className="text-xs text-white/80 hidden sm:block">{restaurantDisplayInfo.cuisine}</p>
              </Link>
            </div>
             {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-6">
              <NavLinks restaurantId={restaurantData.id} />
            </nav>
            <div className="flex items-center space-x-3 sm:space-x-4">
              <Button variant="ghost" size="icon" className="relative text-white hover:bg-red-700">
                <Bell size={22} />
                <span className="absolute -top-1 -right-1 bg-yellow-400 text-xs rounded-full w-4 h-4 flex items-center justify-center text-red-600 font-bold">2</span>
              </Button>
              <Button asChild variant="ghost" size="icon" className="relative text-white hover:bg-red-700">
                <Link href={`/site/${restaurantData.id}/checkout`}>
                  <CartIconLucide size={22} />
                  {cartTotalItems > 0 && (
                    <span className="absolute -top-1 -right-1 bg-yellow-400 text-xs rounded-full w-4 h-4 flex items-center justify-center text-red-600 font-bold">{cartTotalItems}</span>
                  )}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Restaurant Banner */}
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
        <div className="absolute -bottom-8 left-4 md:left-6 bg-white p-1 md:p-2 rounded-full shadow-lg border-2 border-white">
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

      {/* Restaurant Info */}
      <div className="bg-white pt-10 md:pt-12 pb-3 px-4 container mx-auto rounded-t-lg md:rounded-lg shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-bold text-xl md:text-2xl text-gray-800">{restaurantDisplayInfo.name}</h2>
            <p className="text-sm text-gray-600">{restaurantDisplayInfo.cuisine}</p>
            <div className="flex items-center mt-1 text-xs text-gray-600">
              <Clock size={12} className="mr-1 text-gray-500" />
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
            <span className="text-xs text-gray-500 mt-1">500+ ratings (mock)</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white px-4 py-3 sticky top-[72px] z-20 shadow-sm container mx-auto">
        <div className="flex items-center bg-gray-100 rounded-full px-4 py-2.5">
          <Search size={18} className="text-gray-500 mr-2" />
          <input
            type="text"
            placeholder="Search for dishes..."
            className="bg-transparent w-full text-sm focus:outline-none text-gray-800"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white py-2 px-2 shadow-sm border-b border-gray-200 container mx-auto">
        <div className="flex overflow-x-auto no-scrollbar">
          {/* Tabs: 'menu', 'reviews', 'info' */}
          {['menu', 'reviews', 'info'].map(tabName => (
            <button
              key={tabName}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap capitalize ${
                activeTab === tabName ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-700 hover:text-red-500'
              }`}
              onClick={() => setActiveTab(tabName)}
            >
              {tabName}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Scrollable Area */}
      <div className="flex-1 overflow-y-auto container mx-auto pb-24"> {/* Added pb for bottom nav space */}
        {activeTab === 'menu' && (
          <>
            {/* Offers Carousel */}
            {offersData.length > 0 && (
              <div className="bg-white py-4" id="offers-section">
                 <h3 className="px-4 mb-3 text-lg font-semibold text-gray-800">Special Offers</h3>
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
            
            {/* Menu Categories Display */}
            {menuCategoriesWithCounts.length > 0 && (
              <div className="bg-white py-4 mt-2" id="menu-section">
                <h3 className="px-4 mb-3 text-lg font-semibold text-gray-800">Menu Categories</h3>
                <div className="flex overflow-x-auto px-4 pb-2 no-scrollbar">
                  <div className="flex space-x-3">
                    {menuCategoriesWithCounts.map((category) => (
                      category.count > 0 && // Only show categories with items
                      <div key={category.id} className="bg-gray-100 rounded-xl p-3 min-w-[120px] text-center cursor-pointer hover:bg-gray-200 transition">
                        {/* Placeholder for category image/icon */}
                        <p className="font-medium text-sm text-gray-800">{category.name}</p>
                        <p className="text-xs text-gray-500">{category.count} items</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Menu Items (Popular or Filtered) */}
            <div className="bg-white mt-2 py-4">
              <div className="flex justify-between items-center px-4 mb-3">
                <h3 className="text-lg font-semibold text-gray-800">{searchQuery ? 'Search Results' : 'Menu Items'}</h3>
                {/* Optionally add view all / filter buttons here */}
              </div>
              
              {displayedMenuItems.length > 0 ? (
                <div className="space-y-4 px-4">
                  {displayedMenuItems.map((item) => (
                    <div key={item.id} className="flex border-b border-gray-100 pb-4 last:border-b-0">
                      <div className="relative w-24 h-24">
                        <Image
                          src={item.imageUrl || `https://picsum.photos/seed/${item.id}/120/120`}
                          alt={item.name}
                          width={96}
                          height={96}
                          className="rounded-lg object-cover"
                          data-ai-hint="food dish meal"
                        />
                        {isVegetarian(item) ? (
                          <div className="absolute top-1 left-1 bg-green-100 rounded-sm p-0.5" title="Vegetarian">
                            <div className="w-3 h-3 border border-green-600 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                            </div>
                          </div>
                        ) : (
                           <div className="absolute top-1 left-1 bg-red-100 rounded-sm p-0.5" title="Non-Vegetarian">
                            <div className="w-3 h-3 border border-red-600 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
                            </div>
                          </div>
                        )}
                        <button className="absolute top-1 right-1 bg-white rounded-full p-1 shadow" onClick={() => toggleFavorite(item.id)}>
                          <Heart 
                            size={16} 
                            className={favorites[item.id] ? "text-red-500 fill-red-500" : "text-gray-400 hover:text-red-400"} 
                          />
                        </button>
                      </div>
                      
                      <div className="ml-4 flex-1">
                        <div className="flex justify-between items-start">
                           <Link href={`/site/${restaurantData.id}/item/${item.id}`} className="block">
                            <h4 className="font-semibold text-gray-800 hover:text-red-600">{item.name}</h4>
                           </Link>
                          {/* Mock rating for items */}
                          <div className="flex items-center bg-green-100 px-1.5 py-0.5 rounded text-xs">
                            <span className="font-medium text-green-800 mr-0.5">{(Math.random() * 1 + 4).toFixed(1)}</span>
                            <Star size={10} className="text-green-800 fill-green-800" />
                          </div>
                        </div>
                        
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2 h-8">{item.description}</p>
                        
                        <div className="flex justify-between items-center mt-2">
                          <div className="font-semibold text-gray-800">${item.price.toFixed(2)}</div>
                           <Link href={`/site/${restaurantData.id}/item/${item.id}`} passHref>
                            <Button variant="outline" size="sm" className="text-xs text-red-600 border-red-500 hover:bg-red-50">Customize</Button>
                           </Link>
                          <Button onClick={() => handleAddToCart(item)} size="sm" className="bg-red-600 hover:bg-red-700 text-white px-4 text-xs font-medium">Add</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No items match your search or filter.</p>
              )}
            </div>
          </>
        )}
        {activeTab === 'reviews' && (
          <div className="p-4 bg-white mt-2">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Customer Reviews</h3>
            {/* Placeholder for reviews */}
            <p className="text-gray-600">Reviews section coming soon!</p>
          </div>
        )}
        {activeTab === 'info' && (
          <div className="p-4 bg-white mt-2" id="info-section">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Restaurant Information</h3>
            <p className="text-gray-600"><strong>Address:</strong> 123 Food Street, Flavor Town, USA</p>
            <p className="text-gray-600"><strong>Hours:</strong> 11:00 AM - 10:00 PM Daily</p>
            <p className="text-gray-600 mt-2">More details about {restaurantDisplayInfo.name} coming soon!</p>
          </div>
        )}

      </div>

      {/* Bottom Navigation with Cart View Button */}
      <div className={cn("fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 transition-transform duration-300", cartTotalItems > 0 ? 'pb-[76px]' : '')}>
        <div className="container mx-auto flex justify-around">
           <Link href={`/site/${restaurantData.id}`} className="flex flex-col items-center text-red-600"> <Home size={20} /> <span className="text-xs mt-1 font-medium">Home</span> </Link>
           <button className="flex flex-col items-center text-gray-500"> <Search size={20} /> <span className="text-xs mt-1">Search</span> </button>
           <Link href={`/site/${restaurantData.id}/orders`} className="flex flex-col items-center text-gray-500"> <ShoppingBag size={20} /> <span className="text-xs mt-1">Orders</span> </Link>
           <Link href={`/site/${restaurantData.id}/profile`} className="flex flex-col items-center text-gray-500"> <User size={20} /> <span className="text-xs mt-1">Account</span> </Link>
        </div>
        
        {cartTotalItems > 0 && (
           <Link href={`/site/${restaurantData.id}/checkout`} className="fixed bottom-0 left-0 right-0 md:max-w-screen-sm md:mx-auto md:bottom-2 md:left-1/2 md:-translate-x-1/2">
            <div className="bg-red-600 text-white rounded-lg mx-4 my-2 p-3 flex items-center justify-between shadow-lg hover:bg-red-700 transition cursor-pointer">
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
