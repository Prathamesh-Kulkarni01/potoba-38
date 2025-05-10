
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tag } from 'lucide-react';

interface CouponInputProps {
  couponCode: string;
  onCouponCodeChange: (code: string) => void;
  onApplyCoupon: () => void;
  appliedDiscount: number; // To show feedback e.g. 0.1 for 10%
  isProcessing?: boolean; // if coupon application involves async call
}

export default function CouponInput({ 
    couponCode, 
    onCouponCodeChange, 
    onApplyCoupon, 
    appliedDiscount,
    isProcessing 
}: CouponInputProps) {
  return (
    <div className="space-y-2 rounded-lg border border-input p-4 bg-card">
      <Label htmlFor="couponCode" className="text-sm font-medium text-foreground">
        Apply Coupon
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id="couponCode"
          type="text"
          placeholder="Enter coupon code"
          value={couponCode}
          onChange={(e) => onCouponCodeChange(e.target.value)}
          className="h-10 text-sm flex-grow"
        />
        <Button 
            onClick={onApplyCoupon} 
            variant="outline" 
            size="default" 
            className="h-10 text-sm whitespace-nowrap"
            disabled={isProcessing || !couponCode}
        >
          <Tag className="mr-2 h-4 w-4" />
          Apply
        </Button>
      </div>
      {appliedDiscount > 0 && (
        <p className="text-xs text-green-600 font-medium">
          {(appliedDiscount * 100).toFixed(0)}% discount applied!
        </p>
      )}
       {appliedDiscount === -1 && ( // Special value to indicate invalid coupon after trying
        <p className="text-xs text-destructive font-medium">
          Invalid coupon code.
        </p>
      )}
    </div>
  );
}
