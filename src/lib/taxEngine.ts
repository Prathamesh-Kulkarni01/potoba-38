import type { TaxConfig, MenuItem, MenuCategory, RestaurantProfile } from '@/types';

export interface TaxBreakup {
  taxId: string;
  name: string;
  amount: number;
  rate: number;
}

export interface TaxCalculationResult {
  subtotal: number;
  taxBreakup: TaxBreakup[];
  totalTax: number;
  total: number;
}

/**
 * Calculate applicable taxes for an order, considering restaurant, category, and item overrides.
 * @param items - Array of MenuItems in the order (with quantity and price)
 * @param restaurant - RestaurantProfile (with taxes)
 * @param categoryMap - Map of categoryId to MenuCategory (with taxOverrides)
 * @returns TaxCalculationResult
 */
export function calculateOrderTaxes({
  items,
  restaurant,
  categoryMap = {},
}: {
  items: { item: MenuItem; quantity: number }[];
  restaurant: RestaurantProfile;
  categoryMap: Record<string, MenuCategory>;
}): TaxCalculationResult {
  let subtotal = 0;
  const taxAccumulator: Record<string, TaxBreakup> = {};

  for (const { item, quantity } of items) {
    const lineTotal = item.price * quantity;
    subtotal += lineTotal;

    // 1. Item-level tax overrides
    let applicableTaxes = item.taxOverrides;
    // 2. Category-level tax overrides
    if (!applicableTaxes && item.categoryId && categoryMap[item.categoryId]?.taxOverrides) {
      applicableTaxes = categoryMap[item.categoryId]?.taxOverrides;
    }
    // 3. Restaurant-level default taxes
    if (!applicableTaxes || applicableTaxes.length === 0) {
      const defaultTaxes = (restaurant.taxes || []).filter(t => t.isDefault);
      applicableTaxes = defaultTaxes.length > 0 ? defaultTaxes : (restaurant.taxes || []);
    }
    // Calculate taxes for this item
    for (const tax of applicableTaxes) {
      let taxAmount = 0;
      if (tax.type === 'percentage') {
        taxAmount = tax.isInclusive ? (lineTotal * tax.rate) / (100 + tax.rate) : (lineTotal * tax.rate) / 100;
      } else {
        taxAmount = tax.isInclusive ? tax.rate : tax.rate * quantity;
      }
      if (!taxAccumulator[tax.id]) {
        taxAccumulator[tax.id] = {
          taxId: tax.id,
          name: tax.name,
          amount: 0,
          rate: tax.rate,
        };
      }
      taxAccumulator[tax.id].amount += taxAmount;
    }
  }

  const taxBreakup = Object.values(taxAccumulator);
  const totalTax = taxBreakup.reduce((sum, t) => sum + t.amount, 0);
  const total = subtotal + totalTax;
  return { subtotal, taxBreakup, totalTax, total };
} 