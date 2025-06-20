import React, { useState, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarMenuSubContent,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { NavItem } from '@/types/navigation';
import { UserRole, StaffRole, StaffPermissions, RestaurantProfile } from '@/types';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronsLeftRight, ExternalLink, PlusCircle } from 'lucide-react';
import RestaurantSelector from './restaurant-selector';

interface DashboardSidebarProps {
  navItems: NavItem[];
  selectedRestaurantId: string | null;
  currentRestaurantDetails: RestaurantProfile | null;
  onRestaurantChange: (restaurantId: string) => void;
}

const DashboardSidebar = React.memo(({
  navItems,
  selectedRestaurantId,
  currentRestaurantDetails,
  onRestaurantChange,
}: DashboardSidebarProps) => {
  const pathname = usePathname();
  const [openCollapsibles, setOpenCollapsibles] = useState<Record<string, boolean>>({});

  const toggleCollapsible = (label: string) => {
    setOpenCollapsibles(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const renderNavMenu = (items: NavItem[], isSubmenu = false) => {
    return (
      <SidebarMenu className={cn(isSubmenu && "pl-4 group-data-[collapsible=icon]:pl-0")}>
        {items.map((item) => {
          if (item.isGroup && (!item.children || item.children.length === 0)) {
            return null;
          }
          return (
            <SidebarMenuItem key={item.label + (item.href || "")}>
              {item.isGroup && item.children && item.children.length > 0 ? (
                <Collapsible
                  open={openCollapsibles[item.label] || false}
                  onOpenChange={() => toggleCollapsible(item.label)}
                >
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={item.children.some(
                        (child) =>
                          child.href &&
                          pathname.startsWith(child.href.split("[")[0].replace(/\/(undefined|null)$/, ""))
                      )}
                      variant="default"
                      className="justify-between w-full bg-sidebar-background hover:bg-sidebar-accent focus:bg-sidebar-accent data-[state=open]:bg-sidebar-accent"
                      tooltip={{
                        children: item.label,
                        side: "right",
                        align: "center",
                      }}
                      size={isSubmenu ? "sm" : "default"}
                    >
                      <div className="flex items-center gap-2">
                        <item.icon className={cn("h-5 w-5", isSubmenu && "h-4 w-4")} />
                        <span className={cn("ml-1 group-data-[collapsible=icon]:hidden truncate", isSubmenu && "text-sm")}>
                          {item.label}
                        </span>
                      </div>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform group-data-[collapsible=icon]:hidden",
                          openCollapsibles[item.label] && "rotate-180"
                        )}
                      />
                      {item.badgeCount && item.badgeCount > 0 && (
                        <SidebarMenuBadge>{item.badgeCount}</SidebarMenuBadge>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSubContent>
                      {renderNavMenu(item.children, true)}
                    </SidebarMenuSubContent>
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <SidebarMenuButton
                  asChild={!!item.href}
                  isActive={item.href ? (pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href.split("[")[0].replace(/\/(undefined|null)$/, "")))) : false}
                  tooltip={{
                    children: item.label,
                    side: "right",
                    align: "center",
                  }}
                  size={isSubmenu ? "sm" : "default"}
                  disabled={!item.href && !item.isHeader}
                  variant="default"
                  className="bg-sidebar-background hover:bg-sidebar-accent focus:bg-sidebar-accent data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground"
                >
                  {item.href ? (
                    <Link href={item.href} prefetch target={item.target} rel={item.rel} className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <item.icon className={cn("h-5 w-5", isSubmenu && "h-4 w-4")} />
                        <span className={cn("ml-1 group-data-[collapsible=icon]:hidden truncate", isSubmenu && "text-sm", item.isHeader && "font-semibold text-muted-foreground")}>{item.label}</span>
                      </div>
                      {item.badgeCount && item.badgeCount > 0 && (
                        <SidebarMenuBadge>{item.badgeCount}</SidebarMenuBadge>
                      )}
                    </Link>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <item.icon className={cn("h-5 w-5", isSubmenu && "h-4 w-4")} />
                        <span className={cn("ml-1 group-data-[collapsible=icon]:hidden truncate", isSubmenu && "text-sm", item.isHeader && "font-semibold text-muted-foreground")}>
                          {item.label}
                        </span>
                      </div>
                      {item.badgeCount && item.badgeCount > 0 && (
                        <SidebarMenuBadge>{item.badgeCount}</SidebarMenuBadge>
                      )}
                    </div>
                  )}
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    );
  };

  const renderRestaurantSelector = () => (
    <>
      <RestaurantSelector
        selectedRestaurantId={selectedRestaurantId}
        currentRestaurantDetails={currentRestaurantDetails}
        onRestaurantChange={onRestaurantChange}
      />
      <SidebarSeparator className="my-2" />
    </>
  );

  return (
    <SidebarProvider style={{width: '250px'}} defaultOpen>
      <Sidebar >
        <SidebarHeader className="p-4 ">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/images/logo.png"
              alt="Potoba Logo"
              width={40}
              height={40}
              className="rounded-md"
            />
            <h1 className="text-2xl font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              Potoba
            </h1>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          {renderRestaurantSelector()}
          {renderNavMenu(navItems)}
        </SidebarContent>
        <SidebarFooter className="flex p-2 border-t border-sidebar-border">
          <SidebarTrigger className="self-end hidden md:flex mt-2 h-8 w-8 p-0 group-data-[collapsible=icon]:mt-auto">
            <ChevronsLeftRight className="h-4 w-4" />
          </SidebarTrigger>
        </SidebarFooter>
      </Sidebar>
    </SidebarProvider>
  );
});

DashboardSidebar.displayName = 'DashboardSidebar';

export default DashboardSidebar;
