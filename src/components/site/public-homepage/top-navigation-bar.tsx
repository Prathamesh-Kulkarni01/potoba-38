
// src/components/site/public-homepage/top-navigation-bar.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, User as UserIcon, Menu as MenuIcon } from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Table } from '@/types'; 

interface TopNavigationBarProps {
  restaurantName: string;
  restaurantLogoUrl: string;
  cartItemCount: number;
  showShadow: boolean;
  restaurantId: string; 
  tableContext?: Pick<Table, 'id' | 'number' | 'docId'>; 
  isUserAnonymous?: boolean; // Added
  userDisplayName?: string; // Added
}

const NavLinks = ({ onLinkClick, restaurantId, tableContext, isUserAnonymous, userDisplayName }: { onLinkClick?: () => void, restaurantId: string, tableContext?: Pick<Table, 'id' | 'number' | 'docId'>, isUserAnonymous?: boolean, userDisplayName?: string }) => {
  const menuLink = tableContext ? `/menu/table/${tableContext.docId}` : `/site/${restaurantId}#menu`;
  const checkoutLink = tableContext ? `/site/${restaurantId}/checkout?tableId=${tableContext.docId}&tableNumber=${encodeURIComponent(tableContext.number)}` : `/site/${restaurantId}/checkout`;
  
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
           Logged in as: <span className="font-medium text-primary">{userDisplayName}</span>
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
}: TopNavigationBarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const displayRestaurantName = tableContext ? `${restaurantName}` : restaurantName; // Table number is part of restaurantName prop now
  const homeLink = tableContext ? `/menu/table/${tableContext.docId}` : `/site/${restaurantId}`;
  const checkoutLink = tableContext ? `/site/${restaurantId}/checkout?tableId=${tableContext.docId}&tableNumber=${encodeURIComponent(tableContext.number)}` : `/site/${restaurantId}/checkout`;
  const ordersLink = `/site/${restaurantId}/orders${tableContext ? `?tableId=${tableContext.docId}` : ''}`;


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
            <span className="text-xl font-bold text-primary group-hover:text-accent transition-colors hidden sm:block truncate max-w-[200px] md:max-w-xs">
              {displayRestaurantName}
            </span>
          </Link>

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
                            <span className="text-lg font-bold text-primary truncate max-w-[150px]">
                            {displayRestaurantName}
                            </span>
                        </Link>
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
