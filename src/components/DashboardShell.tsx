
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LayoutDashboard, UtensilsCrossed, TableProperties, ReceiptText, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "sonner";

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, getCurrentRestaurant } = useAuth();
  const currentRestaurant = getCurrentRestaurant();

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

  const menuItems = [
    {
      title: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Menu",
      path: "/dashboard/menu",
      icon: UtensilsCrossed,
    },
    {
      title: "Tables",
      path: "/dashboard/tables",
      icon: TableProperties,
    },
    {
      title: "Orders",
      path: "/dashboard/orders",
      icon: ReceiptText,
    },
    {
      title: "API Settings",
      path: "/dashboard/api-settings",
      icon: Settings,
    }
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-restaurant-background bg-pattern">
        {/* Sidebar for larger screens */}
        <Sidebar variant="inset">
          <SidebarHeader className="flex flex-col items-center justify-center gap-2 p-4 text-center">
            <div className="flex w-full items-center justify-center">
              <h2 className="text-xl font-bold text-sidebar-foreground">TableMaster</h2>
            </div>
            {currentRestaurant && (
              <div className="text-sm text-sidebar-foreground/70">
                {currentRestaurant.name}
              </div>
            )}
          </SidebarHeader>
          
          <SidebarContent className="p-2">
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.path)}
                        tooltip={item.title}
                      >
                        <button onClick={() => navigate(item.path)}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          
          <SidebarFooter className="p-4">
            {user && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8 bg-restaurant-secondary">
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="text-sm leading-none">
                    <div className="font-medium group-data-[collapsible=icon]:hidden">
                      {user.name}
                    </div>
                    <div className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                      {user.email}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="text-sidebar-foreground"
                  tooltip="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
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
          <div className="fixed bottom-0 left-0 right-0 md:hidden bg-restaurant-primary text-white z-30">
            <div className="flex justify-around items-center p-3">
              {menuItems.map((item) => (
                <Button 
                  key={item.path}
                  variant="ghost"
                  className={cn(
                    "flex flex-col items-center justify-center px-0 py-1 h-auto min-w-14 text-white",
                    isActive(item.path) ? "text-restaurant-secondary" : "text-white/80 hover:text-white"
                  )}
                  onClick={() => navigate(item.path)}
                >
                  <item.icon className="h-5 w-5 mb-1" />
                  <span className="text-[10px]">{item.title}</span>
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
