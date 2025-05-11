// src/components/site/public-homepage/top-navigation-bar.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, User as UserIcon, Menu as MenuIcon, Users, Info } from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Table, ClientTableGroup } from '@/types'; 
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface TopNavigationBarProps {
  restaurantName: string;
  restaurantLogoUrl: string;
  cartItemCount: number;
  showShadow: boolean;
  restaurantId: string; 
  tableContext?: Pick<Table, 'tableDocId' | 'tableNumber'>; 
  isUserAnonymous?: boolean;
  userDisplayName?: string;
  activeGroup?: ClientTableGroup; // Added activeGroup
}

const NavLinks = ({ onLinkClick, restaurantId, tableContext, isUserAnonymous, userDisplayName, activeGroup }: { onLinkClick?: () => void, restaurantId: string, tableContext?: Pick<Table, 'tableDocId' | 'tableNumber'>, isUserAnonymous?: boolean, userDisplayName?: string, activeGroup?: ClientTableGroup }) => {
  const menuLink = tableContext ? `/menu/table/${tableContext.tableDocId}${activeGroup ? `?joinGroup=${activeGroup.id}` : ''}` : `/site/${restaurantId}#menu`;
  
  let checkoutLink = `/site/${restaurantId}/checkout`;
  if (tableContext) {
    checkoutLink += `?tableId=${activeGroup?.tableId||tableContext.id||tableContext.tableDocId||tableContext.docId}&tableNumber=${encodeURIComponent(tableContext.tableNumber)}`;
    if (activeGroup) {
      checkoutLink += `&groupId=${activeGroup.id}`;
    }
  }
  
  return (
    <>
      <SheetClose asChild>
        <Link href={menuLink} onClick={onLinkClick} className="block px-4 py-2 text-sm text-foreground hover:bg-muted rounded-md">Menu</Link>
      </SheetClose>
      <SheetClose asChild>
        <Link href={`/site/${restaurantId}#offers`} onClick={onLinkClick} className="block px-4 py-2 text-sm text-foreground hover:bg-muted rounded-md">Offers</Link>
      </SheetClose>
       <SheetClose asChild>
        <Link href={`/site/${restaurantId}#about`} onClick={onLinkClick} className="block px-4 py-2 text-sm text-foreground hover:bg-muted rounded-md">About Us</Link>
      </SheetClose>
      <SheetClose asChild>
        <Link href={`/site/${restaurantId}#contact`} onClick={onLinkClick} className="block px-4 py-2 text-sm text-foreground hover:bg-muted rounded-md">Contact</Link>
      </SheetClose>
      
       {isUserAnonymous && userDisplayName && (
         <div className="px-4 py-2 text-sm text-muted-foreground border-t mt-auto">
           Ordering as: <span className="font-medium text-primary">{userDisplayName}</span>
           {activeGroup && <span className="block text-xs">Group: <strong className="text-accent">{activeGroup.id}</strong></span>}
         </div>
       )}

      <SheetClose asChild>
         <Button asChild variant="default" className="w-full mt-2 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={onLinkClick}>
           <Link href={checkoutLink}>Order Online</Link>
         </Button>
      </SheetClose>
    </>
  );
};


export default function TopNavigationBar({
  restaurantName,
  restaurantLogoUrl,
  cartItemCount,
  showShadow,
  restaurantId,
  tableContext,
  isUserAnonymous,
  userDisplayName,
  activeGroup, // Added activeGroup
}: TopNavigationBarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const displayRestaurantName = restaurantName;
  const homeLink = tableContext ? `/menu/table/${tableContext.tableDocId}${activeGroup ? `?joinGroup=${activeGroup.id}` : ''}` : `/site/${restaurantId}`;
  
  let checkoutLink = `/site/${restaurantId}/checkout`;
  if (tableContext) {
    checkoutLink += `?tableId=${tableContext.tableDocId}&tableNumber=${encodeURIComponent(tableContext.tableNumber)}`;
    if (activeGroup) {
      checkoutLink += `&groupId=${activeGroup.id}`;
    }
  }
  console.log('tableContext', {tableContext}, {activeGroup},{checkoutLink});
  const ordersLink = `/site/${restaurantId}/orders${tableContext ? `?tableId=${tableContext.tableDocId}${activeGroup ? `&groupId=${activeGroup.id}`:''}`: ''}`;


  return (
    <header
      className={cn(
        'sticky top-0 z-50 bg-background/80 backdrop-blur-md transition-shadow duration-200',
        showShadow ? 'shadow-lg' : 'shadow-sm'
      )}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href={homeLink} className="flex items-center gap-2 group">
            <Image
              src={restaurantLogoUrl}
              alt={`${restaurantName} Logo`}
              width={40}
              height={40}
              className="rounded-full border-2 border-primary group-hover:scale-105 transition-transform"
              data-ai-hint="restaurant logo"
            />
            <span className="text-xl font-bold text-primary group-hover:text-accent transition-colors hidden sm:block truncate max-w-[180px] md:max-w-xs">
              {displayRestaurantName}
            </span>
          </Link>

          {activeGroup && (
             <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 text-accent border border-accent/30 cursor-default">
                            <Users size={16} />
                            <span className="text-sm font-semibold">Group: {activeGroup.id}</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Currently in Group Order <strong className="text-primary">{activeGroup.id}</strong></p>
                        <p className="text-xs">Members: {activeGroup.members.length}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
          )}

          <nav className="hidden lg:flex items-center gap-6">
            <Link href={`${homeLink}#menu`} className="text-sm font-medium text-foreground hover:text-primary transition-colors">Menu</Link>
            <Link href={`/site/${restaurantId}#offers`} className="text-sm font-medium text-foreground hover:text-primary transition-colors">Offers</Link>
            <Link href={`/site/${restaurantId}#about`} className="text-sm font-medium text-foreground hover:text-primary transition-colors">About</Link>
            <Link href={`/site/${restaurantId}#contact`} className="text-sm font-medium text-foreground hover:text-primary transition-colors">Contact</Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="icon" asChild className="relative text-foreground hover:text-primary hover:bg-primary/10">
              <Link href={checkoutLink}>
                <ShoppingCart className="h-5 w-5" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
                    {cartItemCount}
                  </span>
                )}
                <span className="sr-only">View Cart</span>
              </Link>
            </Button>

            <Button variant="ghost" size="icon" asChild className="text-foreground hover:text-primary hover:bg-primary/10 hidden sm:inline-flex">
              <Link href={ordersLink}>
                <UserIcon className="h-5 w-5" />
                <span className="sr-only">My Account/Orders</span>
              </Link>
            </Button>
             <Button asChild className="hidden lg:inline-flex bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href={checkoutLink}>Order Now</Link>
            </Button>

            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden text-foreground hover:text-primary hover:bg-primary/10">
                  <MenuIcon className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full max-w-xs p-4 bg-card">
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between pb-4 border-b mb-4">
                         <Link href={homeLink} className="flex items-center gap-2 group" onClick={() => setIsMobileMenuOpen(false)}>
                            <Image
                            src={restaurantLogoUrl}
                            alt={`${restaurantName} Logo`}
                            width={36}
                            height={36}
                            className="rounded-full border-2 border-primary"
                            data-ai-hint="restaurant logo small"
                            />
                            <span className="text-lg font-bold text-primary truncate max-w-[100px]">
                                {displayRestaurantName}
                            </span>
                        </Link>
                         {activeGroup && (
                            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-accent/10 text-accent text-xs border border-accent/20">
                                <Users size={12} /> Group: {activeGroup.id}
                            </div>
                         )}
                        <SheetClose asChild>
                             <Button variant="ghost" size="icon" className="h-7 w-7 -mr-2"><MenuIcon className="h-5 w-5"/></Button>
                        </SheetClose>
                    </div>
                  <nav className="flex flex-col gap-2 flex-grow">
                    <NavLinks 
                        onLinkClick={() => setIsMobileMenuOpen(false)} 
                        restaurantId={restaurantId} 
                        tableContext={tableContext}
                        isUserAnonymous={isUserAnonymous}
                        userDisplayName={userDisplayName}
                        activeGroup={activeGroup}
                    />
                  </nav>
                  <div className="mt-auto pt-4 border-t">
                     <SheetClose asChild>
                        <Button variant="outline" className="w-full" asChild>
                            <Link href={ordersLink}>My Orders</Link> 
                        </Button>
                     </SheetClose>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}

