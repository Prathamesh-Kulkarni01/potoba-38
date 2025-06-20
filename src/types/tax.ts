export interface TaxConfig {
  id: string;
  name: string;
  rate: number;
  type: 'percentage' | 'fixed';
  isDefault?: boolean;
  isInclusive?: boolean;
}
