
import { useState, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface MenuItem {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  image: string;
}

interface AiRecommendationsProps {
  menuItems: MenuItem[];
  onSelectItem: (item: MenuItem) => void;
}

const AiRecommendations = ({ menuItems, onSelectItem }: AiRecommendationsProps) => {
  const [recommendations, setRecommendations] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateRecommendations = async () => {
      try {
        setLoading(true);
        
        // In a real app, we would call an AI service to get recommendations
        // For demo purposes, we'll just randomly select 3 items from the menu
        if (menuItems.length > 0) {
          // Shuffle array and take the first 3
          const shuffled = [...menuItems].sort(() => 0.5 - Math.random());
          setRecommendations(shuffled.slice(0, 3));
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error generating recommendations:', error);
        setLoading(false);
      }
    };
    
    generateRecommendations();
  }, [menuItems]);
  
  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-4 mb-6">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-restaurant-primary mr-2" />
          <p className="text-muted-foreground">Generating recommendations...</p>
        </div>
      </div>
    );
  }
  
  if (recommendations.length === 0) {
    return null;
  }
  
  return (
    <div className="mb-6">
      <div className="flex items-center mb-3">
        <Sparkles className="h-5 w-5 text-restaurant-primary mr-2" />
        <h3 className="font-semibold">AI Recommended for You</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recommendations.map((item) => (
          <Card 
            key={item.id}
            className="overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer"
            onClick={() => onSelectItem(item)}
          >
            <div className="h-32 bg-gray-100">
              <img 
                src={item.image} 
                alt={item.name} 
                className="w-full h-full object-cover" 
              />
            </div>
            <CardHeader className="p-3">
              <CardTitle className="text-md">{item.name}</CardTitle>
              <CardDescription className="text-sm line-clamp-2">
                {item.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <p className="text-restaurant-primary font-semibold">${item.price.toFixed(2)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AiRecommendations;
