
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { MenuItem } from '@/types';

export interface CartItem {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  imageUrl?: string; // Optional: for displaying in cart
  // Add other relevant fields like variant choices if needed
}

interface CartState {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (menuItemId: string) => void; // Removes one quantity or the item if quantity becomes 0
  updateQuantity: (menuItemId: string, quantity: number) => void; // Sets specific quantity
  deleteFromCart: (menuItemId: string) => void; // Completely removes item regardless of quantity
  clearCart: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],
      addToCart: (itemToAdd) => {
        set((state) => {
          const existingItemIndex = state.cart.findIndex(
            (item) => item.menuItemId === itemToAdd.menuItemId // && check for variants if they exist
          );
          if (existingItemIndex !== -1) {
            const updatedCart = [...state.cart];
            const existingItem = updatedCart[existingItemIndex];
            existingItem.quantity += itemToAdd.quantity;
            existingItem.totalPrice = existingItem.quantity * existingItem.unitPrice;
            return { cart: updatedCart };
          } else {
            return { cart: [...state.cart, itemToAdd] };
          }
        });
      },
      removeFromCart: (menuItemId) => {
        set((state) => {
          const existingItem = state.cart.find((item) => item.menuItemId === menuItemId);
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
              return { cart: state.cart.filter((item) => item.menuItemId !== menuItemId) };
            }
          }
          return state; // No change if item not found
        });
      },
      updateQuantity: (menuItemId, quantity) => {
        set((state) => {
          if (quantity <= 0) {
            return { cart: state.cart.filter((item) => item.menuItemId !== menuItemId) };
          }
          return {
            cart: state.cart.map((item) =>
              item.menuItemId === menuItemId
                ? { ...item, quantity, totalPrice: quantity * item.unitPrice }
                : item
            ),
          };
        });
      },
      deleteFromCart: (menuItemId) => {
         set((state) => ({
           cart: state.cart.filter((item) => item.menuItemId !== menuItemId)
         }));
      },
      clearCart: () => set({ cart: [] }),
    }),
    {
      name: 'restaurant-food-cart', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
    }
  )
);
