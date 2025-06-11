export type OutletType =
  | 'restaurant'
  | 'cafe'
  | 'bar'
  | 'restobar'
  | 'qsr'
  | 'bakery'
  | 'food_truck'
  | 'other';

export const outletTypes: { value: OutletType; label: string }[] = [
  { value: 'restaurant', label: 'Restaurant (General)' },
  { value: 'cafe', label: 'Cafe / Coffee Shop' },
  { value: 'bar', label: 'Bar / Pub' },
  { value: 'restobar', label: 'Restobar (Restaurant & Bar)' },
  { value: 'qsr', label: 'Quick Service (QSR) / Fast Food' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'food_truck', label: 'Food Truck' },
  { value: 'other', label: 'Other' },
];
