
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2 } from 'lucide-react';
import { MenuItemSuggestion } from '@/services/aiService';
import { useToast } from "@/hooks/use-toast";

// Updated AI service that simulates a network request to the backend
const generateMenuItemSuggestion = async (description: string): Promise<MenuItemSuggestion> => {
  // Simulate a network request to your Node.js backend
  // In a real implementation, this would call your API
  return new Promise((resolve) => {
    setTimeout(() => {
      // Generate a meaningful name from the description
      let name = "";
      const words = description.split(' ');
      if (words.length > 2) {
        // Use first 2-3 notable words for the name
        const notableWords = words
          .filter(word => word.length > 3)
          .slice(0, 2);
        
        if (notableWords.length > 0) {
          name = notableWords.join(' ');
          // Capitalize first letter of each word
          name = name.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          // Add a food-related suffix
          const suffixes = ['Special', 'Delight', 'Fusion', 'Creation', 'Signature'];
          name += ' ' + suffixes[Math.floor(Math.random() * suffixes.length)];
        }
      }
      
      if (!name) {
        name = "Chef's Special";
      }
      
      // Determine category based on description keywords
      let category = 'Main Courses';
      if (/salad|appetizer|starter|soup/i.test(description)) {
        category = 'Starters';
      } else if (/dessert|cake|ice cream|sweet|chocolate/i.test(description)) {
        category = 'Desserts';
      } else if (/side|fries|rice|bread/i.test(description)) {
        category = 'Sides';
      } else if (/drink|beverage|cocktail|juice|water|coffee|tea/i.test(description)) {
        category = 'Drinks';
      }
      
      // Generate a reasonable price based on the category
      let price = 0;
      switch (category) {
        case 'Starters':
          price = parseFloat((Math.random() * 5 + 5).toFixed(2));
          break;
        case 'Main Courses':
          price = parseFloat((Math.random() * 10 + 10).toFixed(2));
          break;
        case 'Sides':
          price = parseFloat((Math.random() * 3 + 3).toFixed(2));
          break;
        case 'Desserts':
          price = parseFloat((Math.random() * 4 + 4).toFixed(2));
          break;
        case 'Drinks':
          price = parseFloat((Math.random() * 3 + 2).toFixed(2));
          break;
      }
      
      const suggestion: MenuItemSuggestion = {
        name,
        description,
        category,
        price
      };
      
      resolve(suggestion);
    }, 1500); // Simulate network delay
  });
};

interface AiMenuGeneratorProps {
  onAddItem?: (item: MenuItemSuggestion) => void;
}

const AiMenuGenerator = ({ onAddItem }: AiMenuGeneratorProps) => {
  const [prompt, setPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [suggestion, setSuggestion] = useState<MenuItemSuggestion | null>(null);
  const { toast } = useToast();

  const handleGenerateSuggestion = async () => {
    if (!prompt.trim()) {
      toast({
        description: "Please enter a description for your menu item",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      const result = await generateMenuItemSuggestion(prompt);
      setSuggestion(result);
    } catch (error) {
      console.error("Error generating menu item:", error);
      toast({
        description: "Failed to generate menu item suggestion. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    if (suggestion && onAddItem) {
      onAddItem(suggestion);
      toast({
        description: `${suggestion.name} has been added to your menu`,
      });
      // Reset the form
      setPrompt('');
      setSuggestion(null);
    }
  };

  return (
    <Card className="mb-6 overflow-hidden border-t-4 border-t-restaurant-secondary">
      <CardHeader>
        <div className="flex items-center">
          <Sparkles className="h-5 w-5 mr-2 text-restaurant-secondary" />
          <CardTitle className="text-lg">AI Menu Item Generator</CardTitle>
        </div>
        <CardDescription>
          Describe a dish and let AI suggest a complete menu item
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <Textarea
            placeholder="Describe the dish (e.g., 'A spicy chicken sandwich with avocado and special sauce')"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-24"
          />
        </div>
        
        <Button 
          onClick={handleGenerateSuggestion} 
          disabled={loading || !prompt.trim()}
          className="w-full bg-restaurant-secondary hover:bg-restaurant-secondary/90"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Suggestion
            </>
          )}
        </Button>
        
        {suggestion && (
          <div className="mt-4 border rounded-md p-4 bg-muted/20">
            <h4 className="font-medium mb-2">{suggestion.name}</h4>
            <p className="text-sm text-muted-foreground mb-2">{suggestion.description}</p>
            <div className="flex justify-between text-sm">
              <span>Category: {suggestion.category}</span>
              <span className="font-medium">${suggestion.price.toFixed(2)}</span>
            </div>
            
            <Button 
              onClick={handleAddItem}
              variant="outline"
              className="w-full mt-4"
            >
              Add to Menu
            </Button>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="bg-muted/30 px-6 py-3">
        <p className="text-xs text-muted-foreground">AI suggestions are based on your description and may need adjustment.</p>
      </CardFooter>
    </Card>
  );
};

export default AiMenuGenerator;
