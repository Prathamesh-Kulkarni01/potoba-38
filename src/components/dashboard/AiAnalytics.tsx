
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, TrendingUp, MessageCircle, Star, Award, ChefHat, AlertCircle } from 'lucide-react';
import { analyzeCustomerPreferences, predictItemPopularity } from '@/services/aiService';

interface MenuItem {
  id: number;
  name: string;
  price: number;
  category: string;
  salesCount: number;
}

interface Review {
  id: number;
  rating: number;
  text: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

// In a real app, this would fetch from an API
const generateMockMenuItems = (): MenuItem[] => [
  { id: 1, name: 'Classic Burger', price: 12.99, category: 'Main Courses', salesCount: 142 },
  { id: 2, name: 'Caesar Salad', price: 8.99, category: 'Starters', salesCount: 98 },
  { id: 3, name: 'Margherita Pizza', price: 14.99, category: 'Main Courses', salesCount: 156 },
  { id: 4, name: 'Chocolate Cake', price: 6.99, category: 'Desserts', salesCount: 75 },
  { id: 5, name: 'French Fries', price: 4.99, category: 'Sides', salesCount: 189 },
  { id: 6, name: 'Iced Tea', price: 2.99, category: 'Drinks', salesCount: 210 },
];

// Mock reviews with sentiment
const generateMockReviews = (): Review[] => [
  { id: 1, rating: 5, text: "Amazing food and service! Will definitely come back!", sentiment: 'positive' },
  { id: 2, rating: 4, text: "The food was good but took a bit long to arrive.", sentiment: 'neutral' },
  { id: 3, rating: 5, text: "Best burger I've had in years. Highly recommend!", sentiment: 'positive' },
  { id: 4, rating: 2, text: "The food was cold when it arrived. Disappointed.", sentiment: 'negative' },
  { id: 5, rating: 5, text: "Excellent staff and atmosphere. Food was perfect.", sentiment: 'positive' },
  { id: 6, rating: 3, text: "Average experience. Nothing special.", sentiment: 'neutral' },
];

const AiAnalytics = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [preferences, setPreferences] = useState<{ category: string, timeOfDay: string }[]>([]);
  const [popularityScores, setPopularityScores] = useState<{[key: number]: number}>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('insights');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // In a real app, these would be API calls to real endpoints
        const items = generateMockMenuItems();
        const reviewData = generateMockReviews();
        
        // Using our AI service to get preferences and popularity
        const customerPrefs = await analyzeCustomerPreferences();
        
        // Get popularity scores for each menu item
        const popularityData: {[key: number]: number} = {};
        for (const item of items) {
          const score = await predictItemPopularity(item.id);
          popularityData[item.id] = score;
        }
        
        setMenuItems(items);
        setReviews(reviewData);
        setPreferences(customerPrefs);
        setPopularityScores(popularityData);
      } catch (error) {
        console.error("Error fetching analytics data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const getSentimentRatio = () => {
    const positive = reviews.filter(r => r.sentiment === 'positive').length;
    const negative = reviews.filter(r => r.sentiment === 'negative').length;
    const neutral = reviews.filter(r => r.sentiment === 'neutral').length;
    
    return {
      positive: (positive / reviews.length) * 100,
      negative: (negative / reviews.length) * 100,
      neutral: (neutral / reviews.length) * 100,
    };
  };

  const getBestSellers = () => {
    return [...menuItems].sort((a, b) => b.salesCount - a.salesCount).slice(0, 5);
  };

  const getTopRatedItems = () => {
    return [...menuItems].sort((a, b) => {
      const aScore = popularityScores[a.id] || 0;
      const bScore = popularityScores[b.id] || 0;
      return bScore - aScore;
    }).slice(0, 5);
  };

  const getImprovementSuggestions = () => {
    // In a real app, this would use real data analysis
    const negativeReviews = reviews.filter(r => r.sentiment === 'negative');
    
    if (negativeReviews.length === 0) {
      return ["No specific improvement areas identified."];
    }
    
    // Very simplified version of what would be a more complex NLP analysis
    const suggestions = [
      "Consider reviewing food temperature maintenance procedures.",
      "Evaluate wait times during peak hours.",
      "Ensure consistency in portion sizes across all dishes."
    ];
    
    return suggestions;
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-restaurant-primary"></div>
            <p className="ml-3 text-muted-foreground">Analyzing data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sentimentData = getSentimentRatio();

  return (
    <Card className="mb-6 overflow-hidden border-t-4 border-t-restaurant-primary">
      <CardHeader className="bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-restaurant-primary" />
            <CardTitle className="text-lg">AI-Powered Analytics</CardTitle>
          </div>
          <Badge variant="outline" className="bg-restaurant-primary/10 text-restaurant-primary">
            AI Powered
          </Badge>
        </div>
        <CardDescription>
          Smart insights and recommendations based on AI analysis
        </CardDescription>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-6 pt-2">
          <TabsList className="w-full">
            <TabsTrigger value="insights" className="flex-1">
              Key Insights
            </TabsTrigger>
            <TabsTrigger value="sentiment" className="flex-1">
              Customer Sentiment
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="flex-1">
              Recommendations
            </TabsTrigger>
          </TabsList>
        </div>
        
        <CardContent className="pt-4">
          <TabsContent value="insights" className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center">
                <Award className="h-4 w-4 mr-1 text-restaurant-secondary" />
                Best Selling Items
              </h4>
              <div className="space-y-2">
                {getBestSellers().map((item, index) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <span className="text-sm flex items-center">
                      <span className="w-5 text-muted-foreground">{index + 1}.</span>
                      {item.name}
                    </span>
                    <Badge variant="outline">
                      {item.salesCount} orders
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center">
                <Star className="h-4 w-4 mr-1 text-amber-500" />
                AI Predicted Top Performers
              </h4>
              <div className="space-y-2">
                {getTopRatedItems().map((item, index) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <span className="text-sm">{item.name}</span>
                    <div className="flex items-center">
                      <Progress value={popularityScores[item.id]} className="w-20 h-2 mr-2" />
                      <span className="text-xs text-muted-foreground">
                        {popularityScores[item.id]}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center">
                <TrendingUp className="h-4 w-4 mr-1 text-restaurant-accent" />
                Customer Preferences
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {preferences.map((pref, i) => (
                  <div key={i} className="bg-muted/30 p-2 rounded-md text-xs">
                    <span className="font-medium">{pref.category}</span>
                    <span className="text-muted-foreground ml-1">
                      popular during {pref.timeOfDay}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="sentiment" className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center">
                <MessageCircle className="h-4 w-4 mr-1 text-blue-500" />
                Customer Sentiment Overview
              </h4>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Positive</span>
                    <span>{Math.round(sentimentData.positive)}%</span>
                  </div>
                  <Progress value={sentimentData.positive} className="h-2 bg-muted" 
                    style={{ '--tw-progress-fill': 'rgb(34, 197, 94)' } as React.CSSProperties} />
                </div>
                
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Neutral</span>
                    <span>{Math.round(sentimentData.neutral)}%</span>
                  </div>
                  <Progress value={sentimentData.neutral} className="h-2 bg-muted"
                    style={{ '--tw-progress-fill': 'rgb(234, 179, 8)' } as React.CSSProperties} />
                </div>
                
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Negative</span>
                    <span>{Math.round(sentimentData.negative)}%</span>
                  </div>
                  <Progress value={sentimentData.negative} className="h-2 bg-muted"
                    style={{ '--tw-progress-fill': 'rgb(239, 68, 68)' } as React.CSSProperties} />
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-sm mb-2">Recent Customer Reviews</h4>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                {reviews.map(review => (
                  <div key={review.id} className="bg-muted/30 p-3 rounded-md">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            className={`h-3 w-3 ${i < review.rating ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`} 
                          />
                        ))}
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          review.sentiment === 'positive' ? 'bg-green-500/10 text-green-500' : 
                          review.sentiment === 'negative' ? 'bg-red-500/10 text-red-500' : 
                          'bg-yellow-500/10 text-yellow-500'
                        }`}
                      >
                        {review.sentiment}
                      </Badge>
                    </div>
                    <p className="text-xs">{review.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="recommendations" className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center">
                <ChefHat className="h-4 w-4 mr-1 text-restaurant-primary" />
                Menu Recommendations
              </h4>
              <div className="space-y-2">
                <div className="bg-restaurant-primary/10 p-3 rounded-md">
                  <p className="text-sm font-medium mb-1">Suggested Menu Additions</p>
                  <ul className="text-xs space-y-1">
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-restaurant-primary rounded-full mr-2"></span>
                      Consider adding more vegan options in the Starters category
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-restaurant-primary rounded-full mr-2"></span>
                      Expand your dessert selection with seasonal fruit-based options
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-restaurant-primary rounded-full mr-2"></span>
                      Add more non-alcoholic craft beverages to the Drinks section
                    </li>
                  </ul>
                </div>
                
                <div className="bg-restaurant-secondary/10 p-3 rounded-md">
                  <p className="text-sm font-medium mb-1">Pricing Optimization</p>
                  <ul className="text-xs space-y-1">
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-restaurant-secondary rounded-full mr-2"></span>
                      Consider a 5-10% price increase for your bestselling Classic Burger
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-restaurant-secondary rounded-full mr-2"></span>
                      Create more combo meal options to increase average order value
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1 text-red-500" />
                Improvement Areas
              </h4>
              <div className="bg-red-500/10 p-3 rounded-md">
                <ul className="text-xs space-y-1">
                  {getImprovementSuggestions().map((suggestion, i) => (
                    <li key={i} className="flex items-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center">
                <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
                Sales Forecast
              </h4>
              <div className="bg-green-500/10 p-3 rounded-md">
                <p className="text-xs">Based on historical data, we predict:</p>
                <ul className="text-xs mt-1 space-y-1">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    15% increase in overall sales next month
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Highest traffic expected on Friday and Saturday evenings
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Dessert sales likely to increase by 20% during upcoming holidays
                  </li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
      
      <CardFooter className="bg-muted/30 px-6 py-3">
        <p className="text-xs text-muted-foreground">AI insights are generated based on available data and may not be 100% accurate.</p>
      </CardFooter>
    </Card>
  );
};

export default AiAnalytics;
