
'use client';

import type { MenuItemVariant } from '@/types';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface VariantSelectorProps {
  variants: MenuItemVariant[];
  selectedVariants: Record<string, string>; // { variantName: optionName }
  onVariantChange: (variantName: string, optionName: string) => void;
}

export default function VariantSelector({ variants, selectedVariants, onVariantChange }: VariantSelectorProps) {
  if (!variants || variants.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-lg border-border/50">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-foreground">Customize Your Order</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {variants.map((variant) => (
          <div key={variant.name} className="space-y-2">
            <Label className="text-md font-medium text-foreground block mb-2">{variant.name}</Label>
            <RadioGroup
              value={selectedVariants[variant.name]}
              onValueChange={(value) => onVariantChange(variant.name, value)}
              className="space-y-2"
            >
              {variant.options.map((option) => (
                <Label 
                  key={option.name} 
                  htmlFor={`${variant.name}-${option.name}`}
                  className="flex items-center justify-between p-3 border border-input rounded-lg hover:bg-muted/50 cursor-pointer has-[:checked]:bg-primary/10 has-[:checked]:border-primary transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value={option.name} id={`${variant.name}-${option.name}`} className="shrink-0"/>
                    <span className="text-sm font-medium text-foreground">{option.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-primary">${option.price.toFixed(2)}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

