
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, UserCircle, Menu as MenuIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface TopNavigationBarProps {
  restaurantName: string;
  restaurantLogoUrl: string;
  cartItemCount: number;
  showShadow: boolean;
}

const NavLinks = () => (
  <>
    <Link href="#menu-section" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">Menu</Link>
    <Link href="#offers-section" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">Offers</Link>
    <Link href="#about-section" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">About</Link>
    <Link href="#contact-section" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">Contact</Link>
    <Button asChild variant="ghost" className="text-primary hover:bg-primary/10">
      <Link href="#">Order Online</Link>
    </Button>
  </>
);

export default function TopNavigationBar({
  restaurantName,
  restaurantLogoUrl,
  cartItemCount,
  showShadow,
}: TopNavigationBarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b border-transparent bg-background transition-shadow duration-300",
      showShadow && "shadow-md border-border"
    )}>
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        {/* Left: Restaurant Logo */}
        <Link href="#" className="flex items-center gap-2">
          <Image
            src={restaurantLogoUrl}
            alt={`${restaurantName} Logo`}
            width={36}
            height={36}
            className="rounded-md"
            data-ai-hint="restaurant logo"
          />
          <span className="hidden text-lg font-semibold text-foreground sm:block">
            {restaurantName}
          </span>
        </Link>

        {/* Center: Navigation Links (Desktop) */}
        <nav className="hidden items-center gap-6 md:flex">
          <NavLinks />
        </nav>

        {/* Right: Cart and Profile/Account (Desktop) & Mobile Menu Trigger */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="relative">
            <ShoppingCart className="h-5 w-5 text-foreground" />
            {cartItemCount > 0 && (
              <Badge variant="destructive" className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full p-0 text-xs">
                {cartItemCount}
              </Badge>
            )}
            <span className="sr-only">View Cart</span>
          </Button>
          <Button variant="ghost" size="icon" className="hidden md:flex">
            <UserCircle className="h-5 w-5 text-foreground" />
            <span className="sr-only">Account</span>
          </Button>

          {/* Mobile Menu Trigger */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <MenuIcon className="h-6 w-6 text-foreground" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-xs bg-background p-6">
              <div className="flex flex-col items-start space-y-4 pt-8">
                <NavLinks />
                <Button variant="outline" className="w-full justify-start">
                  <UserCircle className="mr-2 h-4 w-4" /> Account
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
