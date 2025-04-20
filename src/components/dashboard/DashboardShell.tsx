
import React from "react";
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
  ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import RestaurantSelector from "./RestaurantSelector";
import { ThemeToggle } from "../theme/ThemeToggle";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";

interface DashboardShellProps {
  children: React.ReactNode;
}

export  function DashboardShell({ children }: DashboardShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, getCurrentRestaurant, hasPermission } = useAuth();
  const currentRestaurant = user ? getCurrentRestaurant() : undefined;

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getUserInitials = () => {
    if (!user) return "U";
    const names = user.name.split(" ");
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
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
  const filteredMainMenuItems = mainMenuItems.filter(item => 
    hasPermission(item.permission)
  );
  
  const filteredMarketingMenuItems = marketingMenuItems.filter(item => 
    hasPermission(item.permission)
  );
  
  const filteredLoyaltyMenuItems = loyaltyMenuItems.filter(item => 
    hasPermission(item.permission)
  );
  
  const showSettingsMenuItem = hasPermission(settingsMenuItem.permission);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-restaurant-background bg-pattern">
        {/* Sidebar for larger screens */}
        <Sidebar variant="inset">
          <SidebarHeader className="flex flex-col gap-3 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-sidebar-accent rounded-md flex items-center justify-center">
                  <span className="text-lg font-bold text-sidebar-accent-foreground">TM</span>
                </div>
                <h2 className="text-lg font-bold text-sidebar-foreground">TableMaster</h2>
              </div>
              <ThemeToggle />
            </div>
            
            <RestaurantSelector />
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
                <SidebarGroupLabel className="mt-4">Marketing</SidebarGroupLabel>
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
          <div className="container mx-auto p-4 relative">
            {children}
          </div>
          
          {/* Bottom Navigation for Mobile */}
          <div className="fixed bottom-0 left-0 right-0 md:hidden  bg-restaurant-background bg-pattern text-white z-30">
            <div className="flex justify-around items-center p-3">
              {[...filteredMainMenuItems,...filteredMarketingMenuItems,...filteredLoyaltyMenuItems].slice(0, 8).map((item) => (
                <Button 
                  key={item.path}
                  variant="ghost"
                  className={cn(
                    "flex flex-col items-center justify-center px-0 py-1 h-auto min-w-14 text-white",
                    isActive(item.path) ? "text-restaurant-secondary" : "text-white/80 hover:text-white"
                  )}
                  onClick={() => navigate(item.path)}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-[10px]">{item.title?.split(" ")[0]}</span>
                </Button>
              ))}
            </div>
          </div>
          
          <div className="h-16 md:hidden">
            {/* Spacer for mobile bottom navigation */}
          </div>
        </SidebarInset>

        {/* Toaster for notifications */}
        <Toaster position="top-right" />
      </div>
    </SidebarProvider>
  );
}
