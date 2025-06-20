// src/app/dashboard/layout.tsx
"use client";

import { useEffect, type ReactNode, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { OrderProvider } from "@/contexts/waiter/OrderContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { getRestaurant } from "@/lib/firebase/firestore";
import { useNavigation } from "@/hooks/use-navigation";
import LoadingState from "@/components/dashboard/LoadingState";
import MobileLayout from "@/components/dashboard/MobileLayout";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import UserNav from "@/components/dashboard/user-nav";
import type { RestaurantProfile } from "@/types";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const {
    user,
    role: authContextRole,
    staffRole: authContextStaffRole,
    initialLoading,
    loading: authContextLoading,
  } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  // Get last selected restaurant from localStorage or user profile
  const lastSelected =
    typeof window !== "undefined"
      ? localStorage.getItem(`selectedRestaurant_${user?.uid}`)
      : null;
  const initialId = lastSelected || user?.restaurantId || null;
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(
    initialId
  );
  const [currentRestaurantDetails, setCurrentRestaurantDetails] =
    useState<RestaurantProfile | null>(null);

  const { desktopNavItems } = useNavigation(
    user?.role ?? null,
    user?.staffPermissions ?? null,
    selectedRestaurantId,
    authContextStaffRole
  );

  // Helper: handle role-based redirects
  const handleRedirects = useCallback(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    if (authContextRole === "Waiter") {
      router.replace("/waiter");
      return;
    }
    if (authContextRole === "owner" && user.onboardingComplete === false) {
      router.replace("/onboarding/restaurant-setup");
      return;
    }
    if (!authContextRole && user) {
      router.replace("/login");
    }
  }, [user, authContextRole, router]);

  // Auth and role check effect
  useEffect(() => {
    if (!initialLoading && !authContextLoading) {
      handleRedirects();
    }
  }, [initialLoading, authContextLoading, handleRedirects]);

  // Fetch current restaurant details when selection changes
  useEffect(() => {
    if (selectedRestaurantId && user?.uid) {
      localStorage.setItem(`selectedRestaurant_${user.uid}`, selectedRestaurantId);
      getRestaurant(selectedRestaurantId)
        .then(setCurrentRestaurantDetails)
        .catch((error) => {
          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console
            console.error("Failed to fetch restaurant details:", error);
          }
        });
    }
  }, [selectedRestaurantId, user?.uid]);

  // Loading state
  if (initialLoading || authContextLoading || !user) {
    return (
      <LoadingState
        pathname={pathname}
        authContextRole={authContextRole}
        user={user}
        authContextLoading={authContextLoading}
      />
    );
  }

  // Main layout
  return (
    <OrderProvider>
      <SidebarProvider>
        {isMobile ? (
          <MobileLayout
            navItems={desktopNavItems}
            selectedRestaurantId={selectedRestaurantId}
            currentRestaurantDetails={currentRestaurantDetails}
            onRestaurantChange={setSelectedRestaurantId}
            authContextRole={authContextRole}
          >
            {children}
          </MobileLayout>
        ) : (
          <div className="flex bg-red-50 flex-1">
            <DashboardSidebar
              navItems={desktopNavItems}
              selectedRestaurantId={selectedRestaurantId}
              currentRestaurantDetails={currentRestaurantDetails}
              onRestaurantChange={setSelectedRestaurantId}
            />
            <div
              className="flex-1 bg-background max-h-[calc(100dvh)] overflow-y-auto p-4 pt-6"
            >
              <header className="sticky top-0 z-30 flex h-10 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
                <UserNav />
              </header>
              {children}
            </div>
          </div>
        )}
      </SidebarProvider>
    </OrderProvider>
  );
}
