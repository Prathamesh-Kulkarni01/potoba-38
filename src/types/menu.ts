import type { Timestamp } from 'firebase/firestore';
import type { TaxConfig } from './tax';
import { RecipeIngredientItem } from './inventory';

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  order: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  taxOverrides?: TaxConfig[];
}

export interface MenuSubcategory {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  order: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MenuItemVariantOption {
  name: string;
  price: number;
}

export interface MenuItemVariant {
  name: string;
  options: MenuItemVariantOption[];
}

export interface AvailabilityRule {
  dayOfWeek: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun' | 'Everyday';
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
}

export interface MenuItem {
  id: string;
  itemIdString: string; 
  restaurantId: string;
  categoryId: string;
  subcategoryId?: string | null;
  name:string;
  description?: string | null; 
  price: number;
  imageUrl?: string | null;
  videoUrl?: string | null;
  availability: boolean;
  dietaryTags?: string[];
  allergenInfo?: string[];
  order: number;
  calories?: number | null;
  crossSellItems?: string[];
  upsellItems?: string[];
  variants?: MenuItemVariant[];
  availabilitySchedule?: AvailabilityRule[];
  recipeIngredients?: RecipeIngredientItem[];
  isVegetarian?: boolean | null;
  currency?: string | null;
  portionSize?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  taxOverrides?: TaxConfig[];
  isSpicy?: boolean;
  isGlutenFree?: boolean;
  tags?: string[];
  isAvailable?: boolean; 
}

export interface SpecialOffer {
  id: string;
  title: string;
  description: string;
  specialPrice?: number;
  discountPercentage?: number;
  applicableItems?: string[]; 
  imageUrl?: string;
  tags?: string[];
  dataAiHint?: string; 
}
