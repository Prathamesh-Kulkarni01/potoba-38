'use client';

import type { RestaurantProfile, MenuCategory, MenuItem as MenuItemType, Table, TableGroup, ClientTableGroup } from '@/types';
import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, MapPin, Clock, Star, ChevronDown, Filter, TrendingUp, Tag, Heart, Menu, User, ShoppingBag, Home, Bell, ShoppingCart as CartIconLucide, X, Users, ClipboardCopy, LinkIcon } from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { useCart, type CartItem } from '../public-homepage/cart-store';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from '@/components/shared/loading-spinner';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import DishCard from '@/components/site/shared/dish-card';
import TopNavigationBar from '../public-homepage/top-navigation-bar';
import { useAuth } from '@/lib/auth/context';
import { createTableGroup, joinTableGroup, getTableGroup, addItemToGroupCart } from '@/lib/firebase/groups'; // Import group functions
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { convertFirebaseTimestampToString } from '@/lib/firebase/utils';


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
  const { cart: localCart, addToCart: addLocalCartItem, clearCart: clearLocalCart } = useCart(); // Renamed to localCart
  const { toast } = useToast();
  const { user, loading: authLoading, signInAnonymouslyHandler } = useAuth();

  const [activeTab, setActiveTab] = useState('menu');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({}); 
  const [showNavShadow, setShowNavShadow] = useState(false);

  // Group Order State
  const [activeGroup, setActiveGroup] = useState<ClientTableGroup | null>(null);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isJoiningGroup, setIsJoiningGroup] = useState(false);
  const [joinGroupCode, setJoinGroupCode] = useState('');
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);

  // Determine current cart (local or group)
  const currentCart = useMemo(() => activeGroup ? activeGroup.cartItems : localCart, [activeGroup, localCart]);
  const cartTotalItems = useMemo(() => currentCart.reduce((sum, item) => sum + item.quantity, 0), [currentCart]);
  const cartTotalPrice = useMemo(() => currentCart.reduce((sum, item) => sum + item.totalPrice, 0), [currentCart]);

  useEffect(() => {
    if (tableContext && !user && !authLoading) {
      signInAnonymouslyHandler().then(anonUser => {
        if (anonUser) {
          toast({ title: "Welcome!", description: "You're ordering for your table." });
          // Check local storage for an active group for this table/restaurant
          const storedGroupId = localStorage.getItem(`activeGroup_${restaurantData.id}_${tableContext.id}`);
          if (storedGroupId) {
            fetchAndSetActiveGroup(storedGroupId);
          }
        } else {
          toast({ variant: "destructive", title: "Error", description: "Could not start table order session." });
        }
      });
    } else if (user && tableContext) {
      // If user is already logged in (e.g. permanent user or returning anonymous)
      const storedGroupId = localStorage.getItem(`activeGroup_${restaurantData.id}_${tableContext.id}`);
      if (storedGroupId) {
         fetchAndSetActiveGroup(storedGroupId);
      }
    }
    setIsLoading(false);
  }, [tableContext, user, authLoading, signInAnonymouslyHandler, toast, restaurantData.id]);

   const fetchAndSetActiveGroup = async (groupId: string) => {
    if (!tableContext) return;
    setIsLoading(true);
    const groupData = await getTableGroup(restaurantData.id, groupId);
    if (groupData) {
      setActiveGroup(groupData);
      setShowGroupInfoModal(true); // Show group info when successfully joined/rejoined
    } else {
      localStorage.removeItem(`activeGroup_${restaurantData.id}_${tableContext.id}`); // Clear invalid stored group
    }
    setIsLoading(false);
  };

  // Real-time listener for active group
  useEffect(() => {
    if (activeGroup?.id && db) {
      const groupRef = doc(db, `restaurants/${restaurantData.id}/tableGroups`, activeGroup.id);
      const unsubscribe = onSnapshot(groupRef, (docSnap) => {
        if (docSnap.exists()) {
          const groupData = docSnap.data() as TableGroup;
          setActiveGroup({
             id: docSnap.id,
             ...groupData,
             createdAt: convertFirebaseTimestampToString(groupData.createdAt),
             updatedAt: convertFirebaseTimestampToString(groupData.updatedAt),
          });
        } else {
          // Group was deleted or became invalid
          toast({variant: 'destructive', title: 'Group Ended', description: 'The group order session is no longer active.'});
          setActiveGroup(null);
          if (tableContext) localStorage.removeItem(`activeGroup_${restaurantData.id}_${tableContext.id}`);
        }
      });
      return () => unsubscribe();
    }
  }, [activeGroup?.id, restaurantData.id]);


  useEffect(() => {
    const handleScroll = () => setShowNavShadow(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleStartGroupOrder = async () => {
    if (!user || !tableContext) {
      toast({ variant: 'destructive', title: 'Error', description: 'User or table context is missing.' });
      return;
    }
    setIsCreatingGroup(true);
    try {
      const group = await createTableGroup(restaurantData.id, tableContext.id, tableContext.number, user);
      if (group) {
        setActiveGroup(group);
        localStorage.setItem(`activeGroup_${restaurantData.id}_${tableContext.id}`, group.id);
        toast({ title: 'Group Created!', description: `Share code ${group.id} with others at your table.` });
        setShowGroupInfoModal(true);
        clearLocalCart(); // Clear local cart as group cart is now active
      } else {
        toast({ variant: 'destructive', title: 'Failed', description: 'Could not create group. Please try again.' });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to create group.' });
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleJoinGroupOrder = async () => {
    if (!user || !tableContext || !joinGroupCode) {
      toast({ variant: 'destructive', title: 'Error', description: 'Missing user, table, or group code.' });
      return;
    }
    setIsJoiningGroup(true);
    try {
      const result = await joinTableGroup(restaurantData.id, joinGroupCode, user);
      if (result && 'id' in result) { // Check if it's TableGroup
        setActiveGroup(result);
        localStorage.setItem(`activeGroup_${restaurantData.id}_${tableContext.id}`, result.id);
        toast({ title: 'Joined Group!', description: `You are now part of group ${result.id}.` });
        setShowJoinGroupModal(false);
        setJoinGroupCode('');
        setShowGroupInfoModal(true);
        clearLocalCart();
      } else if (result && 'error' in result) {
        toast({ variant: 'destructive', title: 'Join Failed', description: result.error });
      } else {
        toast({ variant: 'destructive', title: 'Join Failed', description: 'Could not join group. Invalid code or group is full/inactive.' });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to join group.' });
    } finally {
      setIsJoiningGroup(false);
    }
  };
  
  const handleLeaveGroup = () => {
    // Basic leave - just clear local state. More complex logic (updating members in Firestore) could be added.
    if (tableContext) localStorage.removeItem(`activeGroup_${restaurantData.id}_${tableContext.id}`);
    setActiveGroup(null);
    setShowGroupInfoModal(false);
    toast({title: "Left Group", description: "You have left the group order."});
  };

  const handleAddToCart = async (item: MenuItemType) => {
    if (activeGroup && user) {
      try {
        await addItemToGroupCart(restaurantData.id, activeGroup.id, item, 1, user /*, selectedVariants */);
        toast({ title: `${item.name} Added`, description: "Item added to group cart." });
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: `Could not add to group cart: ${error.message}` });
      }
    } else {
      // Add to local cart if not in a group
      const cartItem: CartItem = {
        menuItemId: item.id,
        menuItemName: item.name,
        quantity: 1,
        unitPrice: item.price,
        totalPrice: item.price,
        imageUrl: item.imageUrl || undefined,
      };
      addLocalCartItem(cartItem);
      toast({ title: `${item.name} Added`, description: "Item added to your cart." });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({title: "Copied!", description: "Group code copied to clipboard."});
    }).catch(err => {
      toast({variant: 'destructive', title: "Copy Failed", description: "Could not copy code."});
    });
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
      if (activeGroup) {
        base += `&groupId=${activeGroup.id}`;
      }
    }
    return base;
  }, [restaurantData.id, tableContext, activeGroup]);

  const headerRestaurantName = tableContext 
    ? `${restaurantDisplayInfo.name} - Table ${tableContext.number}` 
    : restaurantDisplayInfo.name;


  if (isLoading || authLoading) {
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
          {/* Group Order Buttons */}
          {tableContext && user && (
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              {!activeGroup ? (
                <>
                  <Button onClick={handleStartGroupOrder} disabled={isCreatingGroup} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground">
                    {isCreatingGroup ? <LoadingSpinner className="mr-2 h-4 w-4" /> : <Users className="mr-2 h-4 w-4" />} Start Group Order
                  </Button>
                  <Button variant="outline" onClick={() => setShowJoinGroupModal(true)} className="flex-1">
                    <LinkIcon className="mr-2 h-4 w-4" /> Join Group Order
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setShowGroupInfoModal(true)} className="w-full">
                  <Users className="mr-2 h-4 w-4" /> View Group (Code: {activeGroup.id})
                </Button>
              )}
            </div>
          )}
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
          <Link href={`/site/${restaurantData.id}/orders${tableContext ? `?tableId=${tableContext.docId}${activeGroup ? `&groupId=${activeGroup.id}`:''}`: ''}`} className="flex flex-col items-center text-muted-foreground"> <ShoppingBag size={20} /> <span className="text-xs mt-1">Orders</span> </Link>
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
      {/* Join Group Modal */}
      <Dialog open={showJoinGroupModal} onOpenChange={setShowJoinGroupModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Group Order</DialogTitle>
            <DialogDescription>Enter the 4-digit code shared by the group host.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="groupCode">Group Code</Label>
            <Input 
              id="groupCode" 
              value={joinGroupCode} 
              onChange={(e) => setJoinGroupCode(e.target.value.toUpperCase())} 
              maxLength={4}
              className="uppercase tracking-widest text-center text-lg"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJoinGroupModal(false)}>Cancel</Button>
            <Button onClick={handleJoinGroupOrder} disabled={isJoiningGroup || joinGroupCode.length !== 4} className="bg-primary hover:bg-primary/90">
              {isJoiningGroup ? <LoadingSpinner className="mr-2 h-4 w-4" /> : "Join Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Info Modal */}
      {activeGroup && (
      <Dialog open={showGroupInfoModal} onOpenChange={setShowGroupInfoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-primary"/> Group Order Active</DialogTitle>
            <DialogDescription>You are part of group <strong className="text-primary">{activeGroup.id}</strong> for Table {activeGroup.tableNumber}.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold">Group Code: <span className="text-accent tracking-wider">{activeGroup.id}</span></p>
              <Button variant="ghost" size="icon" onClick={() => copyToClipboard(activeGroup.id)}><ClipboardCopy className="h-4 w-4"/></Button>
            </div>
            <div>
              <h4 className="font-medium mb-1">Members ({activeGroup.members.length}):</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                {activeGroup.members.map(member => <li key={member.uid}>{member.name || member.uid.substring(0,6)} {member.uid === activeGroup.creatorUid && '(Host)'}</li>)}
              </ul>
            </div>
             <p className="text-xs text-muted-foreground">Share this code with others at your table to add items to a shared cart.</p>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={handleLeaveGroup}>Leave Group</Button>
            <Button onClick={() => setShowGroupInfoModal(false)} className="bg-primary hover:bg-primary/90">Continue Ordering</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}

