
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { MenuItem } from '@/types';

export interface CartItem {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number; // This should be the price of the specific configuration (base + variants + addons)
  totalPrice: number; // quantity * unitPrice
  imageUrl?: string;
  variantChoices?: { variantName: string; optionName: string; optionPrice: number }[];
  // addonChoices?: { addonName: string; addonPrice: number }[]; // Could be added similarly
}

interface CartState {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (menuItemId: string) => void; 
  updateQuantity: (menuItemId: string, quantity: number) => void;
  deleteFromCart: (menuItemId: string) => void; 
  clearCart: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],
      addToCart: (itemToAdd) => {
        set((state) => {
          // For simplicity, we assume items with same menuItemId are merged by quantity.
          // A more complex cart would treat items with different variants as distinct entries,
          // possibly by creating a unique composite ID (menuItemId + variantHash).
          const existingItemIndex = state.cart.findIndex(
            (item) => item.menuItemId === itemToAdd.menuItemId && 
                       JSON.stringify(item.variantChoices) === JSON.stringify(itemToAdd.variantChoices) // Basic check for same variant config
          );

          if (existingItemIndex !== -1) {
            const updatedCart = [...state.cart];
            const existingItem = updatedCart[existingItemIndex];
            existingItem.quantity += itemToAdd.quantity; // Add to quantity
            existingItem.totalPrice = existingItem.quantity * existingItem.unitPrice; // Recalculate total
            return { cart: updatedCart };
          } else {
            // If not existing or different variants, add as new item
            return { cart: [...state.cart, itemToAdd] };
          }
        });
      },
      removeFromCart: (menuItemId) => { // This now refers to decrementing or removing if qty is 1
        set((state) => {
          const existingItem = state.cart.find((item) => item.menuItemId === menuItemId); // Simple find by ID for now
          if (existingItem) {
            if (existingItem.quantity > 1) {
              return {
                cart: state.cart.map((item) =>
                  item.menuItemId === menuItemId
                    ? { ...item, quantity: item.quantity - 1, totalPrice: (item.quantity - 1) * item.unitPrice }
                    : item
                ),
              };
            } else {
              // If quantity is 1, remove the item
              return { cart: state.cart.filter((item) => item.menuItemId !== menuItemId) };
            }
          }
          return state; 
        });
      },
      updateQuantity: (menuItemId, quantity) => {
        set((state) => {
          if (quantity <= 0) {
            // If new quantity is 0 or less, remove the item
            return { cart: state.cart.filter((item) => item.menuItemId !== menuItemId) };
          }
          return {
            cart: state.cart.map((item) =>
              item.menuItemId === menuItemId // Simple find by ID for now
                ? { ...item, quantity, totalPrice: quantity * item.unitPrice }
                : item
            ),
          };
        });
      },
      deleteFromCart: (menuItemId) => { // Explicitly delete item regardless of quantity
         set((state) => ({
           cart: state.cart.filter((item) => item.menuItemId !== menuItemId) // Simple find by ID
         }));
      },
      clearCart: () => set({ cart: [] }),
    }),
    {
      name: 'restaurant-food-cart', 
      storage: createJSONStorage(() => localStorage), 
    }
  )
);

