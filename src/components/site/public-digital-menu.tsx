
'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, MapPin, Clock, Star, ChevronDown, Filter, TrendingUp, Tag, Heart, Menu, User, ShoppingBag, HomeIcon, Bell, ShoppingCart, LogOut, Settings, X, Utensils, Pizza, Salad, Coffee, Cake, Fish, Soup } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart, type CartItem } from './public-homepage/cart-store'; // Adjusted path
import type { RestaurantProfile, MenuCategory as MenuCategoryType, MenuItem as MenuItemType } from '@/types';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast'; // For add to cart notifications

interface Offer {
  id: string;
  title: string;
  description: string;
  color: string;
  dataAiHint?: string;
}

interface DisplayMenuItem extends MenuItemType {
  isVeg?: boolean; // Example, derive from dietaryTags
  isBestseller?: boolean; // Example, could be a flag or derived
  rating?: number; // Example, could come from reviews
}

interface DisplayMenuCategory {
  id: string;
  name: string;
  count: number;
  icon?: React.ElementType;
}

interface PublicDigitalMenuProps {
  restaurantData: RestaurantProfile & { createdAt: string; updatedAt: string };
  menuCategoriesData: (MenuCategoryType & { createdAt: string; updatedAt: string })[];
  menuItemsData: (MenuItemType & { createdAt: string; updatedAt: string })[];
}

const getCategoryIcon = (categoryName: string): React.ElementType => {
  const lowerName = categoryName.toLowerCase();
  if (lowerName.includes('pizza')) return Pizza;
  if (lowerName.includes('salad')) return Salad;
  if (lowerName.includes('beverage') || lowerName.includes('drink') || lowerName.includes('coffee')) return Coffee;
  if (lowerName.includes('dessert') || lowerName.includes('cake')) return Cake;
  if (lowerName.includes('fish') || lowerName.includes('sea')) return Fish;
  if (lowerName.includes('soup') || lowerName.includes('shorba')) return Soup;
  if (lowerName.includes('starter') || lowerName.includes('appetizer')) return TrendingUp; // Using TrendingUp as a placeholder
  return Utensils; // Default icon
};


export default function PublicDigitalMenu({
  restaurantData,
  menuCategoriesData,
  menuItemsData,
}: PublicDigitalMenuProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('menu');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true); // For initial page load feel

  const { cart, addToCart: addStoreItem, clearCart } = useCart();
  const cartItemsCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const cartTotalPrice = useMemo(() => cart.reduce((sum, item) => sum + item.totalPrice, 0), [cart]);


  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500); // Shorter timeout as data is pre-fetched by parent
    return () => clearTimeout(timer);
  }, []);

  const restaurantInfo = useMemo(() => ({
    id: restaurantData.id,
    name: restaurantData.name,
    logo: `https://picsum.photos/seed/${restaurantData.id}logo/60/60`,
    coverImage: `https://picsum.photos/seed/${restaurantData.id}cover/400/150`,
    cuisine: restaurantData.type || "Delicious Food",
    rating: 4.6, // Placeholder
    deliveryTime: "25-30 min", // Placeholder
    minOrder: "$10", // Placeholder
    isOpen: true // Placeholder, ideally from restaurantData.settings
  }), [restaurantData]);

  const menuCategories: DisplayMenuCategory[] = useMemo(() =>
    menuCategoriesData.map(cat => ({
      id: cat.id,
      name: cat.name,
      count: menuItemsData.filter(item => item.categoryId === cat.id && item.availability).length,
      icon: getCategoryIcon(cat.name),
    })).filter(cat => cat.count > 0) // Only show categories with items
  , [menuCategoriesData, menuItemsData]);

  const processedMenuItems = useMemo((): DisplayMenuItem[] =>
    menuItemsData.filter(item => item.availability).map(item => ({
      ...item,
      isVeg: item.dietaryTags?.some(tag => tag.toLowerCase().includes('veg')),
      isBestseller: item.order < 5, // Example: items with low order are bestsellers
      rating: (item.price % 5) + 3.5, // Placeholder rating
      image: item.imageUrl || `https://picsum.photos/seed/${item.id}/120/80`,
    }))
  , [menuItemsData]);
  
  const popularItems = useMemo(() =>
    processedMenuItems.filter(item => item.isBestseller).slice(0, 6)
  , [processedMenuItems]);

  const itemsForActiveCategory = useMemo(() => {
    if (activeTab === 'all-menu' || activeTab === 'menu') { // 'menu' initially shows popular
      return popularItems.length > 0 ? popularItems : processedMenuItems.slice(0,10); // Show some items if no popular
    }
    return processedMenuItems.filter(item => item.categoryId === activeTab);
  }, [activeTab, popularItems, processedMenuItems]);
  
  const filteredDisplayItems = useMemo(() => {
    if (!searchQuery) return itemsForActiveCategory;
    // If searching, search across all processed menu items
    return processedMenuItems.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, itemsForActiveCategory, processedMenuItems]);


  const offers: Offer[] = useMemo(() => [ // Example offers, make dynamic if needed
    { 
      id: "1", 
      title: "50% OFF", 
      description: `Up to $10 on first order!`,
      color: "bg-gradient-to-r from-purple-500 to-indigo-600",
      dataAiHint: "discount welcome"
    },
    { 
      id: "2", 
      title: "FREE DELIVERY", 
      description: `On orders above $20`,
      color: "bg-gradient-to-r from-orange-400 to-pink-500",
      dataAiHint: "delivery offer"
    },
  ], []);

  const handleAddToCart = (item: MenuItemType) => {
    const cartItem: CartItem = {
      menuItemId: item.id,
      menuItemName: item.name,
      quantity: 1,
      unitPrice: item.price,
      totalPrice: item.price,
      imageUrl: item.imageUrl || undefined,
    };
    addStoreItem(cartItem);
    toast({
      title: `${item.name} added to cart!`,
      description: `Price: $${item.price.toFixed(2)}`,
    });
  };


  const renderMenuContent = () => (
    <>
      {/* Offers Carousel */}
      <div className="bg-white py-4">
        <div className="flex overflow-x-auto px-4 pb-2 no-scrollbar">
          <div className="flex space-x-4">
            {offers.map((offer) => (
              <div 
                key={offer.id} 
                className={`${offer.color} rounded-lg p-4 min-w-[250px] shadow-sm text-white`}
                data-ai-hint={offer.dataAiHint || "food deal"}
              >
                <h4 className="font-bold text-xl">{offer.title}</h4>
                <p className="text-sm mt-1">{offer.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Menu Categories Chips */}
      <div className="bg-white py-4 mt-2">
        <h3 className="px-4 mb-3 text-lg font-semibold text-gray-800">Menu Categories</h3>
        <div className="flex overflow-x-auto px-4 pb-2 no-scrollbar">
          <div className="flex space-x-3">
             <Button 
                variant={activeTab === 'menu' || activeTab === 'all-menu' ? 'default' : 'outline'}
                size="sm"
                className={`rounded-full px-4 py-2 h-auto text-xs font-medium whitespace-nowrap ${activeTab === 'menu' || activeTab === 'all-menu' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => setActiveTab('all-menu')}
              >
                All Items
              </Button>
            {menuCategories.map((category) => (
              <Button 
                key={category.id}
                variant={activeTab === category.id ? 'default' : 'outline'}
                size="sm"
                className={`rounded-full px-4 py-2 h-auto text-xs font-medium whitespace-nowrap flex items-center gap-2 ${activeTab === category.id ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => setActiveTab(category.id)}
              >
                {category.icon && <category.icon size={14} />}
                {category.name} ({category.count})
              </Button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Items List */}
      <div className="bg-white mt-2 py-4">
        <div className="flex justify-between items-center px-4 mb-2">
          <h3 className="text-lg font-semibold text-gray-800">
            {searchQuery ? `Search Results for "${searchQuery}"` : (activeTab === 'all-menu' || activeTab === 'menu' ? (popularItems.length > 0 ? 'Popular Items' : 'All Items') : menuCategories.find(c=>c.id === activeTab)?.name || 'Menu')}
          </h3>
          {(activeTab === 'all-menu' || activeTab === 'menu') && popularItems.length > 0 && (
            <Button variant="link" size="sm" className="text-sm text-red-600 font-medium" onClick={() => setActiveTab('all-menu')}>View All</Button>
          )}
        </div>
        
        {filteredDisplayItems.length > 0 ? (
          <div className="space-y-4 px-4">
            {filteredDisplayItems.map((item) => (
              <div key={item.id} className="flex border-b border-gray-100 pb-4 last:border-b-0">
                 <Link href={`/site/${restaurantInfo.id}/item/${item.id}`} className="block w-24 h-24 shrink-0 relative">
                    <Image
                      src={item.imageUrl || `https://picsum.photos/seed/${item.id}item/120/80`}
                      alt={item.name}
                      width={96}
                      height={96}
                      className="rounded-lg object-cover"
                      data-ai-hint="food item delicious"
                    />
                  {item.isVeg ? (
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
                </Link>
                
                <div className="ml-3 flex-1">
                  <div className="flex justify-between items-start">
                    <Link href={`/site/${restaurantInfo.id}/item/${item.id}`} className="block">
                      <h4 className="font-semibold text-gray-800 hover:text-red-600 transition-colors">{item.name}</h4>
                    </Link>
                    {item.rating && (
                      <div className="flex items-center bg-green-100 px-1.5 py-0.5 rounded text-xs">
                        <span className="font-medium text-green-800 mr-0.5">{item.rating.toFixed(1)}</span>
                        <Star size={12} className="text-green-800 fill-current" />
                      </div>
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                  
                  <div className="flex justify-between items-center mt-2">
                    <div className="font-semibold text-gray-800">${item.price.toFixed(2)}</div>
                    <Button 
                        onClick={() => handleAddToCart(item)}
                        size="sm" 
                        className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-1.5 rounded-lg text-xs font-medium h-auto"
                    >
                        ADD
                    </Button>
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
  );

  const renderReviewsContent = () => (
    <div className="p-4 bg-white min-h-[200px] text-center">
      <Star size={48} className="mx-auto text-gray-300 my-4" />
      <h3 className="text-lg font-semibold text-gray-700">Customer Reviews</h3>
      <p className="text-sm text-gray-500 mt-2">Reviews are coming soon for {restaurantInfo.name}!</p>
    </div>
  );

  const renderInfoContent = () => (
     <div className="p-4 bg-white space-y-3 text-sm">
        <h3 className="text-lg font-semibold text-gray-700">About {restaurantInfo.name}</h3>
        <p className="text-gray-600">
          {restaurantData.type && `Specializing in ${restaurantData.type} cuisine, `}
          {restaurantInfo.name} offers a delightful dining experience with fresh ingredients and authentic flavors.
        </p>
        <div className="flex items-center text-gray-600"><MapPin size={16} className="mr-2 text-red-500" /> 123 Flavor Street, Food City</div>
        <div className="flex items-center text-gray-600"><Clock size={16} className="mr-2 text-red-500" /> Delivery: {restaurantInfo.deliveryTime}</div>
        <div className="flex items-center text-gray-600"><ShoppingBag size={16} className="mr-2 text-red-500" /> Min Order: {restaurantInfo.minOrder}</div>
        {restaurantData.settings?.notificationEmail && (
            <div className="flex items-center text-gray-600"><Mail size={16} className="mr-2 text-red-500" /> Contact: {restaurantData.settings.notificationEmail}</div>
        )}
     </div>
  );


  return (
    <div className="flex flex-col min-h-screen bg-gray-100 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-20">
        <div className="bg-red-600 text-white p-3 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-white hover:bg-red-700 mr-2">
                <Menu size={24} />
              </Button>
              <div>
                <h1 className="font-bold text-lg leading-tight">{restaurantInfo.name}</h1>
                <p className="text-xs text-white/90 leading-tight">{restaurantInfo.cuisine}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="icon" className="text-white hover:bg-red-700 relative">
                <Bell size={22} />
                <span className="absolute -top-0.5 -right-0.5 bg-yellow-400 text-xs rounded-full w-3.5 h-3.5 flex items-center justify-center text-red-600 font-bold border-2 border-red-600">2</span>
              </Button>
               <Link href={`/site/${restaurantInfo.id}/checkout`} passHref>
                <Button variant="ghost" size="icon" className="text-white hover:bg-red-700 relative">
                    <ShoppingCart size={22} />
                    {cartItemsCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-yellow-400 text-xs rounded-full w-3.5 h-3.5 flex items-center justify-center text-red-600 font-bold border-2 border-red-600">{cartItemsCount}</span>
                    )}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Sliding Menu */}
        {isMenuOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-30" onClick={() => setIsMenuOpen(false)}>
            <div className="bg-white w-4/5 max-w-xs h-full shadow-lg p-4 flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center mb-6 pb-4 border-b">
                  <Image src={restaurantInfo.logo} alt="Logo" width={48} height={48} className="rounded-full" data-ai-hint="restaurant brand logo"/>
                  <div className="ml-3">
                    <h3 className="font-bold text-gray-800">{restaurantInfo.name}</h3>
                    <p className="text-xs text-gray-500">{restaurantInfo.cuisine}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)} className="ml-auto text-gray-500 hover:bg-gray-100">
                    <X size={20}/>
                  </Button>
                </div>
              
              <nav className="space-y-2 flex-grow">
                <Link href="#" className="flex items-center p-2.5 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"> <User size={18} className="mr-3" /> My Profile </Link>
                <Link href="#" className="flex items-center p-2.5 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"> <ShoppingBag size={18} className="mr-3" /> My Orders </Link>
                <Link href="#" className="flex items-center p-2.5 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"> <Heart size={18} className="mr-3" /> Favorites </Link>
                <Link href="#" className="flex items-center p-2.5 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"> <MapPin size={18} className="mr-3" /> Delivery Address </Link>
                <Link href="#" className="flex items-center p-2.5 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"> <Bell size={18} className="mr-3" /> Notifications </Link>
                <Link href="#" className="flex items-center p-2.5 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"> <Settings size={18} className="mr-3" /> Settings </Link>
              </nav>
              
              <div className="mt-auto">
                <Button className="w-full bg-red-600 text-white hover:bg-red-700 py-2.5 rounded-lg">
                  <LogOut size={16} className="mr-2"/> Sign Out
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Restaurant Banner & Info */}
      <div className="relative mb-2">
        <Image 
          src={restaurantInfo.coverImage} 
          alt={restaurantInfo.name} 
          width={400} height={150}
          className="w-full h-36 object-cover"
          data-ai-hint="restaurant ambiance food"
        />
        <div className="absolute -bottom-8 left-4 bg-white p-1.5 rounded-full shadow-lg border-2 border-white">
          <Image 
            src={restaurantInfo.logo} 
            alt="Logo" 
            width={60} height={60}
            className="w-16 h-16 rounded-full object-cover"
            data-ai-hint="restaurant brand logo"
          />
        </div>
      </div>

      <div className="bg-white pt-10 pb-3 px-4 shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-bold text-xl text-gray-800">{restaurantInfo.name}</h2>
            <p className="text-sm text-gray-600">{restaurantInfo.cuisine}</p>
            <div className="flex items-center mt-1 text-xs text-gray-500 flex-wrap">
              <span className="flex items-center mr-2"><Clock size={12} className="mr-0.5" /> {restaurantInfo.deliveryTime}</span>
              <span className="mr-2">•</span>
              <span className="flex items-center"><ShoppingBag size={12} className="mr-0.5" /> Min: {restaurantInfo.minOrder}</span>
            </div>
          </div>
          <div className="flex flex-col items-end shrink-0 ml-2">
            <div className="flex items-center bg-green-100 px-2 py-0.5 rounded-md">
              <span className="text-sm font-medium text-green-800 mr-1">{restaurantInfo.rating.toFixed(1)}</span>
              <Star size={14} className="text-green-800 fill-current" />
            </div>
            <span className="text-xs text-gray-500 mt-0.5">500+ ratings</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white px-4 py-3 sticky top-[60px] z-10 shadow-sm"> {/* Adjust top based on header height */}
        <div className="flex items-center bg-gray-100 rounded-full px-3 py-2.5">
          <Search size={18} className="text-gray-500 mr-2.5" />
          <input
            type="text"
            placeholder="Search for dishes..."
            className="bg-transparent w-full text-sm focus:outline-none placeholder-gray-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white py-2 px-2 shadow-sm border-b border-gray-200 sticky top-[124px] z-10"> {/* Adjust top based on header + search height */}
        <div className="flex overflow-x-auto no-scrollbar">
          {['menu', 'reviews', 'info'].map(tabName => (
             <button
                key={tabName}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap capitalize ${
                activeTab === tabName ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-600 hover:text-red-500'
                }`}
                onClick={() => setActiveTab(tabName)}
            >
                {tabName}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Scrollable Area */}
      <div className="flex-1 overflow-y-auto pb-24"> {/* Padding bottom for bottom nav */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48"> <LoadingSpinner className="h-8 w-8 text-red-500"/> </div>
        ) : (
          <>
            {activeTab === 'menu' && renderMenuContent()}
            {activeTab === 'reviews' && renderReviewsContent()}
            {activeTab === 'info' && renderInfoContent()}
          </>
        )}
      </div>

      {/* Bottom Navigation & Cart View Button */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200">
        {cartItemsCount > 0 && (
          <Link href={`/site/${restaurantInfo.id}/checkout`} passHref>
            <div className="bg-red-600 text-white rounded-lg mx-3 my-2 p-3 flex items-center justify-between shadow-lg cursor-pointer hover:bg-red-700 transition-colors">
                <div>
                <span className="font-bold">{cartItemsCount} item{cartItemsCount > 1 ? 's' : ''}</span>
                <span className="mx-2 text-red-200">|</span>
                <span className="font-semibold">${cartTotalPrice.toFixed(2)}</span>
                </div>
                <div className="flex items-center font-semibold">
                <span>View Cart</span>
                <ChevronDown size={20} className="ml-1 transform rotate-[-90deg]" /> 
                </div>
            </div>
          </Link>
        )}
        <div className="flex justify-around py-2">
          {[
            { label: 'Home', icon: HomeIcon, active: true },
            { label: 'Search', icon: Search, active: false },
            { label: 'Orders', icon: ShoppingBag, active: false },
            { label: 'Account', icon: User, active: false }
          ].map(navItem => (
            <button key={navItem.label} className={`flex flex-col items-center w-1/4 ${navItem.active ? 'text-red-600' : 'text-gray-500 hover:text-red-500'}`}>
              <navItem.icon size={22} strokeWidth={navItem.active ? 2.5 : 2} />
              <span className={`text-xs mt-0.5 ${navItem.active ? 'font-semibold' : 'font-normal'}`}>{navItem.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

