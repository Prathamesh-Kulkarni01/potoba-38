import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarInset,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  UtensilsCrossed,
  TableProperties,
  ReceiptText,
  Settings,
  LogOut,
  ChevronRight,
  Megaphone,
  Award,
  MessageSquareText,
  Bot,
  BadgePercent,
  Gift,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import RestaurantSelector from "./RestaurantSelector";
import { ThemeToggle } from "../theme/ThemeToggle";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getSubdomain, getFullDomain, getCurrentProtocol } from '@/utils/subdomain';

interface DashboardShellProps {
  children: React.ReactNode;
}

interface Restaurant {
  id: string;
  name: string;
  role: string;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, currentRestaurantId, setCurrentRestaurantId } = useAuth();
  const [userRestaurants, setUserRestaurants] = useState<Restaurant[]>([]);
  const [currentRestaurant, setCurrentRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    const initializeRestaurant = async () => {
      if (!user) {
        setIsLoading(false);
        setIsInitialLoad(false);
        return;
      }

      try {
        // Fetch user's restaurants
        const userRef = doc(db, 'users', user.id);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          setIsLoading(false);
          setIsInitialLoad(false);
          return;
        }

        const userData = userDoc.data();
        const restaurants = userData.restaurants || [];
        setUserRestaurants(restaurants);

        // Get current subdomain
        const subdomain = getSubdomain();
        
        // Find restaurant matching current subdomain
        const matchingRestaurant = restaurants.find(r => r.id === subdomain);
        
        if (matchingRestaurant) {
          setCurrentRestaurantId(matchingRestaurant.id);
          setCurrentRestaurant(matchingRestaurant);
        } else if (restaurants.length > 0) {
          // If no matching restaurant found, default to first one
          setCurrentRestaurantId(restaurants[0].id);
          setCurrentRestaurant(restaurants[0]);
        }
      } catch (error) {
        console.error('Failed to initialize restaurant:', error);
      } finally {
        setIsLoading(false);
        setIsInitialLoad(false);
      }
    };

    initializeRestaurant();
  }, [user, setCurrentRestaurantId, navigate, location.pathname, isInitialLoad]);

  // Add effect to update currentRestaurant when currentRestaurantId changes
  useEffect(() => {
    if (currentRestaurantId && userRestaurants.length > 0) {
      const restaurant = userRestaurants.find(r => r.id === currentRestaurantId);
      if (restaurant) {
        setCurrentRestaurant(restaurant);
      }
    }
  }, [currentRestaurantId, userRestaurants]);

  // If loading, show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-restaurant-primary"></div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!user) {
    navigate('/login');
    return null;
  }

  // If no restaurants, show message
  if (userRestaurants.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <ShieldAlert className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">No Restaurants Found</h1>
          <p className="text-gray-600 mb-6">
            You don't have access to any restaurants yet. Please contact your administrator for access.
          </p>
          <Button
            onClick={() => navigate('/onboarding')}
          >
            Create Restaurant
          </Button>
        </div>
      </div>
    );
  }

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  const getUserInitials = () => {
    if (!user) return "U";
    const names = user.name.split(" ");
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (
      names[0].charAt(0) + names[names.length - 1].charAt(0)
    ).toUpperCase();
  };

  const getRoleBadge = () => {
    if (!user?.role) return null;

    const roleStyles = {
      admin: "bg-purple-500",
      manager: "bg-blue-500",
      staff: "bg-green-500",
      user: "bg-gray-500",
    };

    return (
      <Badge className={roleStyles[user.role as keyof typeof roleStyles]}>
        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
      </Badge>
    );
  };

  // Main navigation items with permission checks
  const mainMenuItems = [
    {
      title: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
      permission: "view_dashboard",
    },
    {
      title: "Menu",
      path: "/dashboard/menu",
      icon: UtensilsCrossed,
      permission: "manage_menu",
    },
    {
      title: "Tables",
      path: "/dashboard/tables",
      icon: TableProperties,
      permission: "manage_tables",
    },
    {
      title: "Orders",
      path: "/dashboard/orders",
      icon: ReceiptText,
      permission: "manage_orders",
    },
  ];

  // Marketing menu items with permission checks
  const marketingMenuItems = [
    {
      title: "Campaigns",
      path: "/dashboard/marketing/campaigns",
      icon: Megaphone,
      permission: "manage_marketing",
    },
    {
      title: "WhatsApp Bot",
      path: "/dashboard/marketing/whatsapp",
      icon: MessageSquareText,
      permission: "manage_marketing",
    },
    {
      title: "AI Assistant",
      path: "/dashboard/marketing/ai-assistant",
      icon: Bot,
      permission: "manage_marketing",
    },
  ];

  // Loyalty menu items with permission checks
  const loyaltyMenuItems = [
    {
      title: "Rewards",
      path: "/dashboard/loyalty/rewards",
      icon: Gift,
      permission: "manage_loyalty",
    },
    {
      title: "Promotions",
      path: "/dashboard/loyalty/promotions",
      icon: BadgePercent,
      permission: "manage_loyalty",
    },
    {
      title: "Members",
      path: "/dashboard/loyalty/members",
      icon: Award,
      permission: "manage_loyalty",
    },
  ];

  // Settings menu item with permission check
  const settingsMenuItem = {
    title: "API Settings",
    path: "/dashboard/api-settings",
    icon: Settings,
    permission: "manage_settings",
  };

  // Filter menu items based on user permissions
  const filteredMainMenuItems = mainMenuItems.filter((item) =>
    user?.permissions?.includes(item.permission)
  );

  const filteredMarketingMenuItems = marketingMenuItems.filter((item) =>
    user?.permissions?.includes(item.permission)
  );

  const filteredLoyaltyMenuItems = loyaltyMenuItems.filter((item) =>
    user?.permissions?.includes(item.permission)
  );

  const showSettingsMenuItem = user?.permissions?.includes(settingsMenuItem.permission);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-restaurant-background bg-pattern">
        {/* Sidebar for larger screens */}
        <Sidebar variant="inset">
          <SidebarHeader className="flex flex-col gap-3 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-sidebar-accent rounded-md flex items-center justify-center">
                  <span className="text-lg font-bold text-sidebar-accent-foreground">
                    TM
                  </span>
                </div>
                <h2 className="text-lg font-bold text-sidebar-foreground">
                  Potoba
                </h2>
              </div>
              <ThemeToggle />
            </div>

            <RestaurantSelector 
              restaurants={userRestaurants}
              currentRestaurant={currentRestaurant}
              onRestaurantChange={(restaurantId) => setCurrentRestaurantId?.(restaurantId)}
            />
          </SidebarHeader>

          <SidebarContent className="p-2">
            {/* Main Navigation */}
            {filteredMainMenuItems.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {filteredMainMenuItems.map((item) => (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive(item.path)}
                          tooltip={item.title}
                        >
                          <button onClick={() => navigate(item.path)}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                            <ChevronRight className="ml-auto h-4 w-4 opacity-0 group-data-[active=true]:opacity-70" />
                          </button>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Marketing */}
            {filteredMarketingMenuItems.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="mt-4">
                  Marketing
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {filteredMarketingMenuItems.map((item) => (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive(item.path)}
                          tooltip={item.title}
                        >
                          <button onClick={() => navigate(item.path)}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                            <ChevronRight className="ml-auto h-4 w-4 opacity-0 group-data-[active=true]:opacity-70" />
                          </button>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Loyalty */}
            {filteredLoyaltyMenuItems.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="mt-4">Loyalty</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {filteredLoyaltyMenuItems.map((item) => (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive(item.path)}
                          tooltip={item.title}
                        >
                          <button onClick={() => navigate(item.path)}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                            <ChevronRight className="ml-auto h-4 w-4 opacity-0 group-data-[active=true]:opacity-70" />
                          </button>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Settings */}
            {showSettingsMenuItem && (
              <SidebarGroup>
                <SidebarGroupLabel className="mt-4">Settings</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(settingsMenuItem.path)}
                        tooltip={settingsMenuItem.title}
                      >
                        <button onClick={() => navigate(settingsMenuItem.path)}>
                          <settingsMenuItem.icon className="h-4 w-4" />
                          <span>{settingsMenuItem.title}</span>
                          <ChevronRight className="ml-auto h-4 w-4 opacity-0 group-data-[active=true]:opacity-70" />
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          <SidebarFooter className="p-3">
            {user && (
              <div className="flex flex-col gap-3">
                <Separator className="bg-sidebar-border/50" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 bg-sidebar-accent text-sidebar-accent-foreground">
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                    <div className="text-sm leading-none">
                      <div className="font-medium text-sidebar-foreground group-data-[collapsible=icon]:hidden flex items-center gap-2">
                        {user.name}
                        {getRoleBadge()}
                      </div>
                      <div className="text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden mt-1">
                        {user.email}
                      </div>
                    </div>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleLogout}
                        className="text-sidebar-foreground h-8 w-8"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Logout</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )}
          </SidebarFooter>
        </Sidebar>

        {/* Main Content */}
        <SidebarInset>
          <div className="container mx-auto p-4 relative">{children}</div>
        </SidebarInset>
        <div className="fixed bottom-0 left-0 right-0 md:hidden  bg-restaurant-primary shadow-md text-white z-30">
          <div className="flex justify-around items-center p-3">
            {[
              ...filteredMainMenuItems,
              ...filteredMarketingMenuItems,
              ...filteredLoyaltyMenuItems,
            ]
              .slice(0, 7)
              .map((item) => (
                <Button
                  key={item.path}
                  variant="ghost"
                  className={cn(
                    "flex flex-col items-center justify-center px-0 py-1 h-auto min-w-14 text-white",
                    isActive(item.path)
                      ? "text-restaurant-secondary"
                      : "text-white/80 hover:text-white"
                  )}
                  onClick={() => navigate(item.path)}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-[10px]">
                    {item.title?.split(" ")[0]}
                  </span>
                </Button>
              ))}
          </div>
        </div>

        {/* Toaster for notifications */}
        <Toaster position="top-right" />
      </div>
    </SidebarProvider>
  );
}
