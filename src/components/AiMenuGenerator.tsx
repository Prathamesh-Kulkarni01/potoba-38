
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2 } from 'lucide-react';
import { MenuItemPrompt, MenuItemSuggestion } from '@/services/aiService';
import { useToast } from "@/hooks/use-toast";

// This would connect to your Node.js/Express backend in the future
const generateMenuItemSuggestion = async (prompt: MenuItemPrompt): Promise<MenuItemSuggestion> => {
  // For now, we'll simulate a network request
  return new Promise((resolve) => {
    setTimeout(() => {
      // Mock response - this would come from your Node backend in the future
      const suggestion: MenuItemSuggestion = {
        name: `${prompt.description.split(' ').slice(0, 3).join(' ')} Special`,
        description: prompt.description,
        category: ['Starters', 'Main Courses', 'Sides', 'Desserts', 'Drinks'][
          Math.floor(Math.random() * 5)
        ],
        price: parseFloat((Math.random() * 15 + 5).toFixed(2)) // Random price between $5-$20
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
      const menuItemPrompt: MenuItemPrompt = { description: prompt };
      const result = await generateMenuItemSuggestion(menuItemPrompt);
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
