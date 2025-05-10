
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, CheckCircle, CreditCard } from 'lucide-react';
import Link from 'next/link';
import LoadingSpinner from '@/components/shared/loading-spinner';

interface OrderSummarySidebarProps {
  restaurantId: string;
  itemName: string;
  quantity: number;
  baseItemPrice: number; // Price of the item itself without variants/addons for display
  finalTotal: number;    // Calculated total including variants, addons, tax
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  onAddToCart: () => void;
  isProcessing?: boolean; // For Add to Cart button loading state
  cartItemCount: number; // Total items in global cart
}

export default function OrderSummarySidebar({
  restaurantId,
  itemName,
  quantity,
  baseItemPrice,
  finalTotal,
  subtotal,
  taxAmount,
  discountAmount,
  onAddToCart,
  isProcessing,
  cartItemCount,
}: OrderSummarySidebarProps) {
  return (
    <Card className="sticky top-24 shadow-xl border-primary/30"> {/* Adjust top based on header height */}
      <CardHeader>
        <CardTitle className="text-xl font-semibold flex items-center text-foreground">
          <ShoppingCart className="mr-3 h-5 w-5 text-primary" />
          Your Order Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex justify-between font-medium">
          <span>{itemName} (x{quantity})</span>
          <span>${(baseItemPrice * quantity).toFixed(2)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
            Customizations and addons will adjust the final price.
        </p>
        
        <Separator />
        
        <div className="flex justify-between">
          <span>Subtotal (Selected Item):</span>
          <span className="font-medium">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax (Est.):</span>
          <span className="font-medium">${taxAmount.toFixed(2)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount:</span>
            <span className="font-medium">-${discountAmount.toFixed(2)}</span>
          </div>
        )}
        
        <Separator />
        
        <div className="flex justify-between text-lg font-bold text-primary">
          <span>Item Total:</span>
          <span>${finalTotal.toFixed(2)}</span>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 pt-4">
        <Button 
            onClick={onAddToCart} 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-md py-3"
            disabled={isProcessing}
        >
          {isProcessing ? <LoadingSpinner className="mr-2 h-5 w-5" /> : <CheckCircle className="mr-2 h-5 w-5" />}
          Add {quantity} to Cart
        </Button>
        <Button variant="outline" asChild className="w-full">
          <Link href={`/site/${restaurantId}/checkout`}>
            <CreditCard className="mr-2 h-4 w-4" />
            Proceed to Checkout ({cartItemCount} items)
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
