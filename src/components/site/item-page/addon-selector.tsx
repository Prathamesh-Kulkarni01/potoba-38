
'use client';

import type { MenuItem } from '@/types';
import Image from 'next/image';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Utensils } from 'lucide-react';

// Define an Addon type that extends MenuItem and includes an addonPrice
export interface AddonItem extends MenuItem {
  addonPrice: number;
}

interface AddonSelectorProps {
  addons: AddonItem[];
  selectedAddons: Record<string, boolean>; // { addonItemId: true/false }
  onAddonToggle: (addonId: string, isSelected: boolean) => void;
}

export default function AddonSelector({ addons, selectedAddons, onAddonToggle }: AddonSelectorProps) {
  if (!addons || addons.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-lg border-border/50">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-foreground">Add Extras</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {addons.map(addon => (
          <Label 
            key={addon.id} 
            htmlFor={`addon-${addon.id}`}
            className="flex items-center justify-between p-3 border border-input rounded-lg hover:bg-muted/50 cursor-pointer has-[:checked]:bg-primary/10 has-[:checked]:border-primary transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Checkbox
                id={`addon-${addon.id}`}
                checked={!!selectedAddons[addon.id]}
                onCheckedChange={(checked) => onAddonToggle(addon.id, !!checked)}
                className="shrink-0"
              />
              <div>
                <span className="text-sm font-medium text-foreground">{addon.name}</span>
                <p className="text-xs text-muted-foreground">(${addon.addonPrice.toFixed(2)})</p>
              </div>
            </div>
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md">
              {addon.imageUrl ? (
                <Image 
                    src={addon.imageUrl} 
                    alt={addon.name} 
                    layout="fill" 
                    objectFit="cover" 
                    data-ai-hint="food addon item"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground/30">
                    <Utensils className="h-5 w-5" />
                </div>
              )}
            </div>
          </Label>
        ))}
      </CardContent>
    </Card>
  );
}
