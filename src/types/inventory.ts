export interface AvailabilityRule {
  dayOfWeek: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun' | 'Everyday';
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
}

export type UnitOfMeasure = 'kg' | 'g' | 'L' | 'ml' | 'pcs' | 'pack' | 'bottle' | 'can' | 'box' | 'dozen' | 'other';

export const unitsOfMeasure: { value: UnitOfMeasure; label: string }[] = [
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'g', label: 'Gram (g)' },
  { value: 'L', label: 'Liter (L)' },
  { value: 'ml', label: 'Milliliter (ml)' },
  { value: 'pcs', label: 'Pieces (pcs)' },
  { value: 'pack', label: 'Pack' },
  { value: 'bottle', label: 'Bottle' },
  { value: 'can', label: 'Can' },
  { value: 'box', label: 'Box' },
  { value: 'dozen', label: 'Dozen' },
  { value: 'other', label: 'Other' },
];

export interface RecipeIngredientItem {
  inventoryItemId: string;
  inventoryItemName: string;
  quantityUsed: number;
  unitOfMeasureUsed: UnitOfMeasure;
}

export type InventoryItemCategory = 
  | 'raw_material' 
  | 'semi_finished' 
  | 'finished_good' 
  | 'beverage_alcoholic' 
  | 'beverage_nonalcoholic' 
  | 'packaging' 
  | 'cleaning_supply' 
  | 'other';

export const inventoryItemCategories: { value: InventoryItemCategory; label: string }[] = [
  { value: 'raw_material', label: 'Raw Material (e.g., Flour, Tomato)' },
  { value: 'semi_finished', label: 'Semi-Finished Good (e.g., Pizza Base, Curry Paste)' },
  { value: 'finished_good', label: 'Finished Good (e.g., Canned Drink, Sauce Bottle)' },
  { value: 'beverage_alcoholic', label: 'Beverage - Alcoholic' },
  { value: 'beverage_nonalcoholic', label: 'Beverage - Non-Alcoholic' },
  { value: 'packaging', label: 'Packaging Material' },
  { value: 'cleaning_supply', label: 'Cleaning Supply' },
  { value: 'other', label: 'Other' },
];

export interface SupplierInfo {
  name?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
}

import type { Timestamp } from 'firebase/firestore';

export interface InventoryItem {
  id: string;
  restaurantId: string;
  name: string;
  category: InventoryItemCategory;
  unitOfMeasure: UnitOfMeasure;
  currentStock: number;
  reorderLevel?: number | null;
  supplierInfo?: SupplierInfo | null;
  costPerUnit?: number | null;
  unitConversionNotes?: string | null;
  lastStockUpdatedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type StockTransactionType =
  | 'purchase'
  | 'sale_usage'
  | 'wastage'
  | 'adjustment_in'
  | 'adjustment_out'
  | 'initial_stock'
  | 'transfer_in'
  | 'transfer_out'
  | 'internal_consumption';

export interface StockTransaction {
  id: string;
  restaurantId: string;
  inventoryItemId: string;
  inventoryItemName: string;
  transactionType: StockTransactionType;
  quantity: number; 
  unitOfMeasure: UnitOfMeasure;
  transactionDate: Timestamp;
  costPerUnitAtTransaction?: number | null;
  notes?: string | null;
  supplierName?: string | null;
  invoiceNumber?: string | null;
  batchNumber?: string | null;
  expiryDate?: Timestamp | null;
  paymentMode?: string | null;
  relatedOrderId?: string | null;
  relatedPurchaseId?: string | null; 
  userId?: string | null; 
}

export interface DailyStockSummary {
  stockInQuantity: number;
  stockOutQuantity: number;
  wastageQuantity: number;
}
