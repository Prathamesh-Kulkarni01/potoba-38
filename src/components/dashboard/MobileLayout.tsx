import React from "react";
import Link from "next/link";
import Image from "next/image";
import RestaurantSelector from "./restaurant-selector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import BottomNavigationBar from "./BottomNavigationBar";
import { RestaurantProfile } from "@/types";
import { NavItem } from "@/types/navigation";
import UserNav from "./user-nav";

interface MobileLayoutProps {
  children?: React.ReactNode;
  navItems: NavItem[];
  selectedRestaurantId: string | null;
  currentRestaurantDetails: RestaurantProfile | null;
  authContextRole: string | null;
  onRestaurantChange: (restaurantId: string) => void;
}

const MobileLayout = React.memo(
  ({
    children,
    navItems,
    selectedRestaurantId,
    currentRestaurantDetails,
    authContextRole,
    onRestaurantChange,
  }: MobileLayoutProps) => {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/images/logo.png"
              alt="Potoba Logo"
              width={32}
              height={32}
              className="rounded-md"
            />
            <h1 className="text-xl font-bold text-primary">Potoba</h1>
          </Link>
          <div className="flex items-center gap-2">
            {authContextRole === "owner" && (
              <>
                <RestaurantSelector
                  selectedRestaurantId={selectedRestaurantId}
                  currentRestaurantDetails={currentRestaurantDetails}
                  onRestaurantChange={onRestaurantChange}
                  isMobile={true}
                />
              </>
            )}
            {currentRestaurantDetails && (
              <div className="text-sm font-medium text-foreground truncate max-w-[120px]">
                {currentRestaurantDetails.name}
              </div>
            )}
            <UserNav />
          </div>
        </header>
        <main className="flex-1 bg-background max-h-[calc(100dvh-theme(spacing.16)-theme(spacing.16))] overflow-y-auto p-4 pt-6">
          <div className="min-h-full">
            {children}
          </div>
        </main>
        <BottomNavigationBar navItems={navItems} />
      </div>
    );
  }
);

MobileLayout.displayName = "MobileLayout";

export default MobileLayout;
