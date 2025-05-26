
import type { MenuItem } from '@/lib/types'; // Import MenuItem for better typing

export interface Suggestion {
  message: string;
  suggestedMenuItemId?: string; // ID of the item to suggest
  suggestedItemName?: string; // Display name of the suggested item, for the button
}

export interface SuggestionsMap {
  [triggerMenuItemId: string]: Suggestion;
}

export const SUGGESTIONS_MAP: SuggestionsMap = {
  'pasta-001': { // Spaghetti Carbonara
    message: "Customers often enjoy Garlic Bread with Carbonara.",
    suggestedMenuItemId: 'side-001',
    suggestedItemName: 'Garlic Bread'
  },
  'pizza-001': { // Margherita Pizza
    message: "A Coke pairs perfectly with Margherita!",
    suggestedMenuItemId: 'drink-001',
    suggestedItemName: 'Coca-Cola'
  },
  'pizza-002': { // Pepperoni Pizza
    message: "How about some extra cheese or a side of chili flakes for your Pepperoni Pizza?",
    // No specific item to add via button here, just a general suggestion
  },
  'drink-001': { // Coca-Cola
    message: "Great choice! How about some French Fries to go with your Coke?",
    suggestedMenuItemId: 'side-002',
    suggestedItemName: 'French Fries'
  },
  'salad-001': { // Caesar Salad
    message: "Would you like to add grilled chicken to your Caesar Salad for ₹50?", // Updated price text for INR context
    suggestedMenuItemId: 'protein-001', 
    suggestedItemName: 'Grilled Chicken'
  }
};
