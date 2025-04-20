
/**
 * AIService - Provides AI-related functionality for the restaurant app
 * 
 * In a production application, this would connect to a real AI service
 * like OpenAI, Anthropic or a similar provider.
 */

// Types for menu item generation
export interface MenuItemPrompt {
  description: string;
}

export interface MenuItemSuggestion {
  name: string;
  description: string;
  category: string;
  price: number;
}

export const generateMenuItemSuggestion = async (prompt: MenuItemPrompt): Promise<MenuItemSuggestion> => {
  // In a real app, you'd make an API call to an AI service
  // For now, we'll implement a simple simulation
  
  // This would be replaced with actual API calls in production
  return new Promise((resolve) => {
    setTimeout(() => {
      const words = prompt.description.toLowerCase().split(' ');
      
      let suggestedCategory = 'Main Courses';
      if (words.some(w => ['salad', 'appetizer', 'starter'].includes(w))) {
        suggestedCategory = 'Starters';
      } else if (words.some(w => ['dessert', 'sweet', 'cake', 'ice cream'].includes(w))) {
        suggestedCategory = 'Desserts';
      } else if (words.some(w => ['side', 'fries', 'rice'].includes(w))) {
        suggestedCategory = 'Sides';
      } else if (words.some(w => ['drink', 'beverage', 'coffee', 'tea', 'juice'].includes(w))) {
        suggestedCategory = 'Drinks';
      }
      
      // Generate a price between $5.99 and $24.99
      const price = Math.round((5.99 + Math.random() * 19) * 100) / 100;
      
      // Generate a name based on key ingredients or descriptors in the prompt
      const nameWords = words.filter(w => 
        !['a', 'the', 'and', 'with', 'in', 'on', 'of', 'for', 'to', 'by', 'from'].includes(w)
      ).slice(0, 3);
      
      const firstWord = nameWords[0] ? nameWords[0].charAt(0).toUpperCase() + nameWords[0].slice(1) : 'Signature';
      const suggestion = {
        name: nameWords.length > 1 
          ? `${firstWord} ${nameWords.slice(1).join(' ')}` 
          : `${firstWord} Special`,
        description: prompt.description,
        category: suggestedCategory,
        price: price
      };
      
      resolve(suggestion);
    }, 1500); // Simulate network delay
  });
};

// This function could be expanded to include sales prediction based on historical data
export const predictItemPopularity = async (menuItemId: number): Promise<number> => {
  // In a real app, this would analyze sales data and return a popularity score
  return new Promise((resolve) => {
    setTimeout(() => {
      // Return a random score between 0 and 100
      resolve(Math.floor(Math.random() * 100));
    }, 500);
  });
};

// Mock function to analyze customer preferences
export const analyzeCustomerPreferences = async (): Promise<{ category: string, timeOfDay: string }[]> => {
  // In a real app, this would analyze order data
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { category: 'Main Courses', timeOfDay: 'dinner' },
        { category: 'Starters', timeOfDay: 'lunch' },
        { category: 'Drinks', timeOfDay: 'evening' }
      ]);
    }, 800);
  });
};
