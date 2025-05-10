

'use client';

import type { RestaurantProfile, MenuCategory, MenuSubcategory, MenuItem } from '@/types';
import { useState, useMemo, useEffect } from 'react';
import TopNavigationBar from './top-navigation-bar';
import HeroSection from './hero-section';
import MenuDisplaySection from './menu-display-section';
import SpecialOffersSection from './special-offers-section';
import AboutRestaurantSection from './about-restaurant-section';
import SiteFooter from './site-footer';
import type { CartItem } from './cart-store'; 
import { useCart } from './cart-store'; 

interface RestaurantHomepageClientProps {
  restaurant: RestaurantProfile & { createdAt: string; updatedAt: string };
  categories: (MenuCategory & { createdAt: string; updatedAt: string })[];
  subcategories: (MenuSubcategory & { createdAt: string; updatedAt: string })[];
  menuItems: (MenuItem & { createdAt: string; updatedAt: string })[];
  popularDishes: (MenuItem & { createdAt: string; updatedAt: string })[];
  specialOffers: { id: string; title: string; description: string; imageUrl: string; dataAiHint: string; }[];
}

export default function RestaurantHomepageClient({
  restaurant,
  categories,
  subcategories,
  menuItems: allMenuItems,
  popularDishes,
  specialOffers,
}: RestaurantHomepageClientProps) {
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart } = useCart();
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all'); // 'all' or category.id

  const filteredMenuItems = useMemo(() => {
    if (activeCategoryId === 'all') {
      return allMenuItems.filter(item => item.availability);
    }
    return allMenuItems.filter(item => item.categoryId === activeCategoryId && item.availability);
  }, [allMenuItems, activeCategoryId]);

  const [showNavShadow, setShowNavShadow] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setShowNavShadow(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleAddToCart = (item: MenuItem, quantity: number = 1) => {
    const cartItem: CartItem = {
      menuItemId: item.id,
      menuItemName: item.name,
      quantity: quantity,
      unitPrice: item.price,
      totalPrice: item.price * quantity,
      imageUrl: item.imageUrl || undefined, 
    };
    addToCart(cartItem);
  };


  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <TopNavigationBar
        restaurantName={restaurant.name}
        restaurantLogoUrl={`https://picsum.photos/seed/${restaurant.id}logo/40/40`}
        cartItemCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        showShadow={showNavShadow}
      />
      <main className="flex-grow">
        <HeroSection
          restaurantName={restaurant.name}
          cuisineType={restaurant.type || 'Delicious'}
          heroImageUrl={`https://picsum.photos/seed/${restaurant.id}hero/1920/1080`}
          onOrderNowClick={() => {
            const menuSection = document.getElementById('menu-section');
            if (menuSection) {
              menuSection.scrollIntoView({ behavior: 'smooth' });
            }
            setActiveCategoryId(categories[0]?.id || 'all');
          }}
        />
        
        <MenuDisplaySection
          restaurantId={restaurant.id}
          popularDishes={popularDishes}
          menuItems={filteredMenuItems}
          allMenuItems={allMenuItems} 
          categories={categories}
          subcategories={subcategories} 
          activeCategoryId={activeCategoryId}
          onCategorySelect={setActiveCategoryId}
          onAddToCart={handleAddToCart}
        />

        {specialOffers.length > 0 && (
           <SpecialOffersSection offers={specialOffers} />
        )}
       
        <AboutRestaurantSection
          restaurantName={restaurant.name}
          aboutText={restaurant.settings?.notificationEmail ? `Contact us at ${restaurant.settings.notificationEmail}. More about our story coming soon!` : `More about our story and unique culinary experience coming soon! We are passionate about serving the best ${restaurant.type || 'food'}.`}
          chefImageUrl={`https://picsum.photos/seed/${restaurant.id}chef/400/400`}
        />
      </main>
      <SiteFooter restaurantName={restaurant.name} />
    </div>
  );
}
