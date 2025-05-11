
'use client';

import type { RestaurantProfile, MenuCategory, MenuItem as MenuItemType, Table, TableGroup, ClientTableGroup } from '@/types';
import { useState, useEffect, useMemo, Suspense, useCallback } from 'react'; 
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, MapPin, Clock, Star, ChevronDown, Filter, TrendingUp, Tag, Heart, Menu, User, ShoppingBag, Home, Bell, ShoppingCart as CartIconLucide, X, Users, ClipboardCopy, LinkIcon, QrCode as QrCodeIcon } from 'lucide-react'; 
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
import { createTableGroup, joinTableGroup, getTableGroup, addItemToGroupCart } from '@/lib/firebase/groups';
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
  const { cart: localCart, addToCart: addLocalCartItem, clearCart: clearLocalCart } = useCart();
  const { toast } = useToast();
  const { user, loading: authLoading, signInAnonymouslyHandler } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState('menu');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({}); 
  const [showNavShadow, setShowNavShadow] = useState(false);

  const [activeGroup, setActiveGroup] = useState<ClientTableGroup | null>(null);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isJoiningGroup, setIsJoiningGroup] = useState(false);
  const [joinGroupCode, setJoinGroupCode] = useState('');
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [showGroupQRCodeModal, setShowGroupQRCodeModal] = useState(false);

  const currentCart = useMemo(() => activeGroup ? activeGroup.cartItems : localCart, [activeGroup, localCart]);
  const cartTotalItems = useMemo(() => currentCart.reduce((sum, item) => sum + item.quantity, 0), [currentCart]);
  const cartTotalPrice = useMemo(() => currentCart.reduce((sum, item) => sum + item.totalPrice, 0), [currentCart]);

  const joinGroupCodeFromUrl = searchParams.get('joinGroup');

  const attemptJoinGroup = useCallback(async (code: string, currentUser: NonNullable<typeof user>) => {
    if (!tableContext) return null;
    setIsJoiningGroup(true);
    const result = await joinTableGroup(restaurantData.id, code, currentUser);
    setIsJoiningGroup(false);
    if (result && 'id' in result && result.id) { // Ensure result is a group and has an id
      setActiveGroup(result);
      localStorage.setItem(`activeGroup_${restaurantData.id}_${tableContext.id}`, result.id);
      toast({ title: 'Joined Group!', description: `You are now part of group ${result.id}.` });
      clearLocalCart();
      return result;
    } else {
      const errorMsg = (result && 'error' in result) ? result.error : 'Could not join group. Invalid code or group is inactive.';
      toast({ variant: 'destructive', title: 'Join Failed', description: errorMsg });
      return null;
    }
  }, [restaurantData.id, tableContext, toast, clearLocalCart]);

  const fetchAndSetActiveGroup = useCallback(async (groupId: string) => {
    if (!tableContext) return;
    const groupData = await getTableGroup(restaurantData.id, groupId);
    if (groupData) {
      setActiveGroup(groupData);
    } else {
      localStorage.removeItem(`activeGroup_${restaurantData.id}_${tableContext.id}`);
    }
  }, [restaurantData.id, tableContext]);

  useEffect(() => {
    if (tableContext && !user && !authLoading) {
      setIsLoading(true);
      signInAnonymouslyHandler().then(anonUser => {
        if (anonUser) {
          toast({ title: "Welcome!", description: "You're ordering for your table." });
        } else {
          toast({ variant: "destructive", title: "Error", description: "Could not start table order session." });
        }
      });
      return; 
    }

    if (tableContext && user) {
      const performGroupLogic = async () => {
        setIsLoading(true);
        if (joinGroupCodeFromUrl) {
          const group = await attemptJoinGroup(joinGroupCodeFromUrl, user);
          if (group) {
            router.replace(`/menu/table/${tableContext.docId}`, { scroll: false });
          }
        } else {
          const storedGroupId = localStorage.getItem(`activeGroup_${restaurantData.id}_${tableContext.id}`);
          if (storedGroupId) {
            await fetchAndSetActiveGroup(storedGroupId);
          }
        }
        setIsLoading(false);
      };
      performGroupLogic();
    } else if (!tableContext) { 
        setIsLoading(false);
    } else if (tableContext && !user && authLoading) {
        setIsLoading(true); 
    }


    const handleScroll = () => setShowNavShadow(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);

  }, [
    tableContext, 
    user, 
    authLoading, 
    restaurantData.id, 
    joinGroupCodeFromUrl, 
    signInAnonymouslyHandler, 
    attemptJoinGroup, 
    fetchAndSetActiveGroup,
    router, 
    toast 
  ]);
  
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
          toast({variant: 'destructive', title: 'Group Ended', description: 'The group order session is no longer active.'});
          setActiveGroup(null);
          if (tableContext) localStorage.removeItem(`activeGroup_${restaurantData.id}_${tableContext.id}`);
        }
      });
      return () => unsubscribe();
    }
  }, [activeGroup?.id, restaurantData.id, tableContext, toast]);


  const handleStartGroupOrder = async () => {
    if (!user || !tableContext) {
      toast({ variant: 'destructive', title: 'Error', description: 'User or table context is missing.' });
      return;
    }
    setIsCreatingGroup(true);
    try {
      const group = await createTableGroup(restaurantData.id, tableContext.id, tableContext.number, user);
      if (group) { 
        setActiveGroup(group); // group is already ClientTableGroup
        localStorage.setItem(`activeGroup_${restaurantData.id}_${tableContext.id}`, group.id);
        toast({ title: 'Group Created!', description: `Share code ${group.id} with others at your table.` });
        setShowGroupInfoModal(true);
        clearLocalCart(); 
      } else {
        toast({ variant: 'destructive', title: 'Failed', description: 'Could not create group. Please try again.' });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error Creating Group', description: error.message || 'Failed to create group.' });
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleJoinGroupOrderSubmit = async () => {
    if (!user) return;
    await attemptJoinGroup(joinGroupCode, user);
    setShowJoinGroupModal(false);
    setJoinGroupCode('');
  };
  
  const handleLeaveGroup = () => {
    if (tableContext) localStorage.removeItem(`activeGroup_${restaurantData.id}_${tableContext.id}`);
    setActiveGroup(null);
    setShowGroupInfoModal(false);
    toast({title: "Left Group", description: "You have left the group order."});
  };

  const handleAddToCart = async (item: MenuItemType) => {
    if (activeGroup && user) {
      setIsLoading(true); 
      try {
        // For group cart, ensure item passed to addItemToGroupCart has correct price if variants are involved
        // This might mean the DishCard needs to pass the calculated price if variants are selected there.
        // For simplicity, assuming `item.price` is the base or already adjusted price for now.
        await addItemToGroupCart(restaurantData.id, activeGroup.id, item, 1, user, item.variants ? [] : undefined); // Pass empty variants or actual if supported by DishCard
        toast({ title: `${item.name} Added`, description: "Item added to group cart." });
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: `Could not add to group cart: ${error.message}` });
      } finally {
        setIsLoading(false);
      }
    } else if (!tableContext) { 
      const cartItem: CartItem = {
        menuItemId: item.id,
        menuItemName: item.name,
        quantity: 1,
        unitPrice: item.price,
        totalPrice: item.price,
        imageUrl: item.imageUrl || undefined,
        // variantChoices: item.variants ? [] : undefined, // Add if DishCard supports variant selection before adding
      };
      addLocalCartItem(cartItem);
      toast({ title: `${item.name} Added`, description: "Item added to your cart." });
    } else {
        toast({ title: "Group Order", description: "Please create or join a group to add items for this table."});
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({title: "Copied!", description: "Group code copied to clipboard."});
    } catch (err) {
      console.error("Failed to copy text: ", err);
      toast({variant: 'destructive', title: "Copy Failed", description: "Could not copy code. Please copy it manually."});
    }
  };

  const shareOnWhatsApp = (code: string) => {
    if (!tableContext) return;
    const message = `Join our food order group for Table ${tableContext.number} at ${restaurantDisplayInfo.name}! Group Code: ${code}. Or use this link: ${window.location.origin}/menu/table/${tableContext.docId}?joinGroup=${code}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };
  
  const getGroupJoinQrLink = () => {
    if (!activeGroup || !tableContext) return '';
    return `${window.location.origin}/menu/table/${tableContext.docId}?joinGroup=${activeGroup.id}`;
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

  const canPlaceOrder = !activeGroup || (activeGroup && user && activeGroup.creatorUid === user.uid);


  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <LoadingSpinner className="h-12 w-12 text-primary" />
      </div>
    );
  }
  
  if (tableContext && !activeGroup && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-background via-muted/10 to-background p-4">
        <TopNavigationBar
            restaurantName={headerRestaurantName}
            restaurantLogoUrl={restaurantDisplayInfo.logo}
            cartItemCount={0} 
            showShadow={false}
            restaurantId={restaurantData.id}
            tableContext={tableContext}
            isUserAnonymous={user?.isAnonymous || false}
            userDisplayName={user?.displayName || user?.email || (user?.isAnonymous ? "Guest" : "")}
        />
        <div className="text-center max-w-md">
            <Users className="mx-auto h-16 w-16 text-primary mb-6" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Welcome to Table {tableContext.number} at {restaurantDisplayInfo.name}!</h1>
            <p className="text-muted-foreground mb-8">
                To start ordering, please create a new group or join an existing one for your table.
            </p>
            <div className="space-y-3 sm:space-y-0 sm:flex sm:gap-4 justify-center">
                <Button onClick={()=>handleStartGroupOrder()} disabled={isCreatingGroup} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground px-6 py-3 text-lg">
                    {isCreatingGroup ? <LoadingSpinner className="mr-2 h-5 w-5" /> : <Users className="mr-2 h-5 w-5" />} Create New Group
                </Button>
                <Button variant="outline" onClick={() => setShowJoinGroupModal(true)} className="w-full sm:w-auto px-6 py-3 text-lg">
                    <LinkIcon className="mr-2 h-5 w-5" /> Join Existing Group
                </Button>
            </div>
        </div>
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
                <Button onClick={handleJoinGroupOrderSubmit} disabled={isJoiningGroup || joinGroupCode.length !== 4} className="bg-primary hover:bg-primary/90">
                {isJoiningGroup ? <LoadingSpinner className="mr-2 h-4 w-4" /> : "Join Group"}
                </Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>
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
        activeGroup={activeGroup || undefined}
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
              <p className="text-sm text-muted-foreground">{restaurantDisplayInfo.cuisine} 
                {tableContext && <span className="text-primary font-semibold">(Table {tableContext.number})</span>}
                {activeGroup && <span className="text-accent font-semibold ml-1">(Group: {activeGroup.id})</span>}
              </p>
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
         {tableContext && user && activeGroup && (
            <div className="mt-3">
                <Button variant="outline" size="sm" onClick={() => setShowGroupInfoModal(true)} className="w-full sm:w-auto">
                  <Users className="mr-2 h-4 w-4" /> View Group Details
                </Button>
            </div>
          )}
        </div>

        <div className="bg-card px-4 py-3 sticky top-[0px] md:top-[10px] z-20 shadow-sm container mx-auto"> 
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
                <div className="bg-card py-4 mt-2 sticky top-[80px] md:top-[80px] z-10 shadow-sm scrollbar-thin " id="menu-section"> 
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
          <Link 
            href={checkoutUrl} 
            className={cn(
                "fixed bottom-0 left-0 right-0 md:max-w-screen-sm md:mx-auto md:bottom-2 md:left-1/2 md:-translate-x-1/2 z-50",
                !canPlaceOrder && "pointer-events-none opacity-70" 
            )}
            onClick={(e) => { if (!canPlaceOrder) e.preventDefault(); }}
            aria-disabled={!canPlaceOrder}
            title={!canPlaceOrder ? "Only the group host can proceed to checkout" : ""}
          >
            <div className="bg-primary text-primary-foreground rounded-lg mx-4 mb-2 p-3 flex items-center justify-between shadow-lg hover:bg-primary/80 transition cursor-pointer">
              <div>
                <span className="font-bold">{cartTotalItems} item{cartTotalItems > 1 ? 's' : ''}</span>
                <span className="mx-2">|</span>
                <span>${cartTotalPrice.toFixed(2)}</span>
              </div>
              <div className="flex items-center font-semibold">
                <span>{canPlaceOrder ? "View Cart" : "Group Cart"}</span>
                <ChevronDown size={18} className="ml-1 transform rotate-[-90deg]" />
              </div>
            </div>
          </Link>
        )}
      </div>
        <Dialog open={showJoinGroupModal} onOpenChange={setShowJoinGroupModal}>
            <DialogContent>
            <DialogHeader>
                <DialogTitle>Join Group Order</DialogTitle>
                <DialogDescription>Enter the 4-digit code shared by the group host.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Label htmlFor="groupCodeJoinModal">Group Code</Label>
                <Input 
                id="groupCodeJoinModal" 
                value={joinGroupCode} 
                onChange={(e) => setJoinGroupCode(e.target.value.toUpperCase())} 
                maxLength={4}
                className="uppercase tracking-widest text-center text-lg"
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setShowJoinGroupModal(false)}>Cancel</Button>
                <Button onClick={handleJoinGroupOrderSubmit} disabled={isJoiningGroup || joinGroupCode.length !== 4} className="bg-primary hover:bg-primary/90">
                {isJoiningGroup ? <LoadingSpinner className="mr-2 h-4 w-4" /> : "Join Group"}
                </Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>

      {activeGroup && (
      <Dialog open={showGroupInfoModal} onOpenChange={setShowGroupInfoModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-primary"/> Group Order Active</DialogTitle>
            <DialogDescription>You are part of group <strong className="text-primary">{activeGroup.id}</strong> for Table {activeGroup.tableNumber}.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-md">
              <p className="text-lg font-semibold">Code: <span className="text-accent tracking-wider font-mono">{activeGroup.id}</span></p>
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(activeGroup.id)}><ClipboardCopy className="mr-1.5 h-3.5 w-3.5"/>Copy</Button>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => shareOnWhatsApp(activeGroup.id)} className="flex-1">
                   <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.35 3.43 16.84L2.05 22L7.31 20.63C8.75 21.39 10.36 21.81 12.04 21.81C17.5 21.81 21.95 17.36 21.95 11.91C21.95 6.45 17.5 2 12.04 2M12.04 3.64C16.57 3.64 20.29 7.36 20.29 11.91C20.29 16.45 16.57 20.17 12.04 20.17C10.49 20.17 9.01 19.78 7.74 19.07L7.07 18.71L4.27 19.49L5.08 16.77L4.71 16.06C3.93 14.74 3.79 13.28 3.79 11.91C3.79 7.36 7.51 3.64 12.04 3.64M17.17 14.48C16.91 14.74 15.77 15.32 15.31 15.54C14.84 15.75 14.28 15.78 13.93 15.61C13.58 15.43 12.59 15.11 11.41 14.01C10.02 12.72 9.21 11.28 8.95 10.81C8.7 10.33 8.89 10.13 9.09 9.93C9.27 9.75 9.47 9.5 9.66 9.31C9.81 9.16 9.86 9.04 9.96 8.85C10.05 8.65 9.99 8.48 9.91 8.31C9.83 8.13 9.35 6.91 9.14 6.44C8.93 5.97 8.72 6.03 8.57 6.03C8.41 6.03 8.27 6.03 8.12 6.04C7.97 6.04 7.67 6.1 7.42 6.36C7.17 6.62 6.57 7.21 6.57 8.13C6.57 9.05 7.46 9.93 7.58 10.08C7.71 10.23 9.03 12.32 11.09 13.25C12.82 14.03 13.26 13.83 13.79 13.79C14.31 13.75 15.32 13.13 15.56 12.87C15.8 12.61 15.8 12.39 15.74 12.28C15.68 12.17 15.56 12.11 15.35 12.02C15.15 11.92 14.93 11.86 14.75 11.86C14.58 11.86 14.43 11.91 14.24 12.11C14.05 12.32 13.73 12.67 13.58 12.83C13.43 12.97 13.28 13.01 13.07 12.92C12.86 12.84 12.05 12.56 11.07 11.7C10.29 11.02 9.73 10.21 9.59 9.97C9.45 9.73 9.32 9.34 9.32 9.01C9.32 8.68 9.21 8.41 9.09 8.21C8.97 8.01 8.75 7.82 8.51 7.82C8.27 7.82 8.04 8.01 7.92 8.21C7.81 8.41 7.69 8.68 7.69 9.01C7.69 9.34 7.82 9.73 7.96 9.97C8.1 10.21 8.67 11.02 9.44 11.7C10.23 12.56 11.25 13.01 11.47 13.01C11.69 13.01 11.86 12.96 12.04 12.81C12.22 12.67 12.87 11.99 13.07 11.7C13.28 11.41 13.43 11.36 13.58 11.36C13.73 11.36 14.05 11.53 14.24 11.74C14.43 11.95 14.58 12.01 14.75 12.01C14.93 12.01 15.15 11.94 15.35 11.84C15.56 11.75 15.68 11.69 15.74 11.58C15.8 11.47 15.8 11.25 15.56 10.99C15.32 10.73 14.31 10.11 13.79 10.07C13.26 10.03 12.82 10.23 11.09 9.3C9.03 8.37 7.71 6.28 7.58 6.13C7.46 5.98 6.57 5.1 6.57 4.18C6.57 3.26 7.17 2.67 7.42 2.41C7.67 2.15 7.97 2.09 8.12 2.09C8.27 2.09 8.41 2.09 8.57 2.09C8.72 2.09 8.93 2.15 9.14 2.62C9.35 3.09 9.83 4.31 9.91 4.48C9.99 4.65 10.05 4.82 9.96 5.02C9.86 5.21 9.81 5.33 9.66 5.48C9.47 5.67 9.27 5.91 9.09 6.09C8.89 6.29 8.7 6.49 8.95 6.96C9.21 7.43 10.02 8.87 11.41 10.16C12.59 11.26 13.58 11.58 13.93 11.76C14.28 11.94 14.84 11.97 15.31 11.75C15.77 11.53 16.91 10.95 17.17 10.69Z"></path></svg>
                    WhatsApp
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowGroupQRCodeModal(true)} className="flex-1">
                    <QrCodeIcon className="mr-1.5 h-4 w-4"/>Show QR to Join
                </Button>
            </div>
            
            <div>
              <h4 className="font-medium mb-1 text-sm">Members ({activeGroup.members.length}):</h4>
              <ScrollArea className="h-24 border rounded-md p-2 bg-muted/30">
                <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                    {activeGroup.members.map(member => <li key={member.uid}>{member.name || member.uid.substring(0,6)} {member.uid === activeGroup.creatorUid && <span className="text-primary text-xs">(Host)</span>}</li>)}
                </ul>
              </ScrollArea>
            </div>
             <p className="text-xs text-muted-foreground">Share the code or QR with others at your table to add items to a shared cart.</p>
          </div>
          <DialogFooter className="sm:justify-between mt-4">
            <Button variant="destructive" size="sm" onClick={handleLeaveGroup}>Leave Group</Button>
            <Button onClick={() => setShowGroupInfoModal(false)} className="bg-primary hover:bg-primary/90 text-primary-foreground" size="sm">Continue Ordering</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}
      {activeGroup && tableContext && (
          <Dialog open={showGroupQRCodeModal} onOpenChange={setShowGroupQRCodeModal}>
            <DialogContent className="sm:max-w-xs">
                <DialogHeader>
                    <DialogTitle className="text-center">Scan to Join Group <strong className="text-primary">{activeGroup.id}</strong></DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-4 space-y-2">
                    <Image 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(getGroupJoinQrLink())}`} 
                        alt={`QR Code to join group ${activeGroup.id}`} 
                        width={180} 
                        height={180}
                        className="border rounded-md shadow-md"
                        data-ai-hint="group join qr"
                    />
                    <p className="text-xs text-muted-foreground text-center">Others at Table {tableContext.number} can scan this to join.</p>
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setShowGroupQRCodeModal(false)} className="w-full">Close</Button>
                </DialogFooter>
            </DialogContent>
          </Dialog>
      )}
    </div>
  );
}

