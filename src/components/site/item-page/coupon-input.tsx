
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tag } from 'lucide-react';
import LoadingSpinner from '@/components/shared/loading-spinner';

interface CouponInputProps {
  couponCode: string;
  onCouponCodeChange: (code: string) => void;
  onApplyCoupon: () => void;
  appliedDiscount: number; // To show feedback e.g. 0.1 for 10%; -1 for invalid
  isProcessing?: boolean; 
}

export default function CouponInput({ 
    couponCode, 
    onCouponCodeChange, 
    onApplyCoupon, 
    appliedDiscount,
    isProcessing 
}: CouponInputProps) {
  return (
    <div className="space-y-2 rounded-lg border border-input p-4 bg-card shadow-sm">
      <Label htmlFor="couponCode" className="text-sm font-medium text-foreground">
        Have a Coupon?
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id="couponCode"
          type="text"
          placeholder="Enter coupon code"
          value={couponCode}
          onChange={(e) => onCouponCodeChange(e.target.value)}
          className="h-9 text-sm flex-grow"
          disabled={isProcessing}
        />
        <Button 
            onClick={onApplyCoupon} 
            variant="outline" 
            size="sm" 
            className="h-9 text-sm whitespace-nowrap"
            disabled={isProcessing || !couponCode}
        >
          {isProcessing ? <LoadingSpinner className="h-4 w-4" /> : <Tag className="mr-1.5 h-4 w-4" />}
          Apply
        </Button>
      </div>
      {appliedDiscount > 0 && (
        <p className="text-xs text-green-600 font-medium pt-1">
          {(appliedDiscount * 100).toFixed(0)}% discount applied!
        </p>
      )}
       {appliedDiscount === -1 && ( 
        <p className="text-xs text-destructive font-medium pt-1">
          Invalid coupon code.
        </p>
      )}
    </div>
  );
}

