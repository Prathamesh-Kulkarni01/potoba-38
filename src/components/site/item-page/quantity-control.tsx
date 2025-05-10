
'use client';

import { Button } from '@/components/ui/button';
import { MinusCircle, PlusCircle } from 'lucide-react';

interface QuantityControlProps {
  quantity: number;
  onQuantityChange: (newQuantity: number) => void;
  maxQuantity?: number;
  minQuantity?: number;
}

export default function QuantityControl({ 
  quantity, 
  onQuantityChange,
  maxQuantity = 10, // Default max quantity
  minQuantity = 1   // Default min quantity
}: QuantityControlProps) {
  const handleIncrement = () => {
    if (quantity < maxQuantity) {
      onQuantityChange(quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > minQuantity) {
      onQuantityChange(quantity - 1);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button 
        variant="outline" 
        size="icon" 
        onClick={handleDecrement} 
        disabled={quantity <= minQuantity}
        className="h-9 w-9 rounded-full"
        aria-label="Decrease quantity"
      >
        <MinusCircle className="h-5 w-5" />
      </Button>
      <span className="w-10 text-center text-lg font-medium text-foreground">{quantity}</span>
      <Button 
        variant="outline" 
        size="icon" 
        onClick={handleIncrement} 
        disabled={quantity >= maxQuantity}
        className="h-9 w-9 rounded-full"
        aria-label="Increase quantity"
      >
        <PlusCircle className="h-5 w-5" />
      </Button>
    </div>
  );
}
