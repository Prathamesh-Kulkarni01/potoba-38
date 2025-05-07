import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  salesCount: number;
  description?: string;
}

interface Review {
  id: string;
  rating: number;
  text: string;
  createdAt: Date;
}

interface Order {
  id: string;
  items: { itemId: string; quantity: number }[];
  total: number;
  createdAt: Date;
}

interface RawData {
  orders: {
    id: string;
    items: { itemId: string; quantity: number }[];
    total: number;
    createdAt: string;
  }[];
  menuItems: {
    id: string;
    name: string;
    category: string;
    price: number;
    salesCount: number;
  }[];
  reviews: {
    id: string;
    rating: number;
    text: string;
    createdAt: string;
  }[];
  timeRange: 'daily' | 'weekly' | 'monthly';
}

interface AIAnalysisResponse {
  insights: {
    type: 'increase' | 'decrease' | 'alert' | 'suggestion';
    title: string;
    description: string;
    value?: number;
    trend: 'up' | 'down';
  }[];
  menuPerformance: {
    id: string;
    name: string;
    performance: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  staffingInsights: {
    peakHours: string[];
    recommendedStaff: number;
    reason: string;
  };
  inventoryAlerts: {
    itemId: string;
    itemName: string;
    currentStock: number;
    recommendedStock: number;
    urgency: 'high' | 'medium' | 'low';
  }[];
  customerInsights: {
    retentionRate: number;
    averageRating: number;
    topFeedback: string[];
  };
  promotionSuggestions: {
    type: 'discount' | 'bundle' | 'special';
    title: string;
    description: string;
    targetItems: string[];
    expectedImpact: string;
  }[];
  anomalies: {
    type: 'sales' | 'inventory' | 'customer';
    description: string;
    severity: 'high' | 'medium' | 'low';
  }[];
  topSellingItems: {
    id: string;
    name: string;
    sales: number;
    revenue: number;
  }[];
  salesByCategory: {
    category: string;
    sales: number;
    percentage: number;
  }[];
  salesByTime: {
    hour: number;
    sales: number;
    orders: number;
  }[];
  salesSummary: string;
}

export const analyzeCustomerSentiment = async (reviews: Review[]): Promise<{
  positive: number;
  negative: number;
  neutral: number;
  suggestions: string[];
}> => {
  try {
    // Simple sentiment analysis based on rating
    const total = reviews.length;
    const positive = reviews.filter(r => r.rating >= 4).length;
    const negative = reviews.filter(r => r.rating <= 2).length;
    const neutral = total - positive - negative;

    // Generate suggestions based on negative reviews
    const negativeReviews = reviews.filter(r => r.rating <= 2);
    const suggestions: string[] = [];

    if (negativeReviews.length > 0) {
      // Check for common issues in negative reviews
      const hasServiceIssues = negativeReviews.some(r => 
        r.text.toLowerCase().includes('slow') || 
        r.text.toLowerCase().includes('wait') || 
        r.text.toLowerCase().includes('service')
      );
      const hasFoodIssues = negativeReviews.some(r => 
        r.text.toLowerCase().includes('cold') || 
        r.text.toLowerCase().includes('taste') || 
        r.text.toLowerCase().includes('quality')
      );
      const hasPriceIssues = negativeReviews.some(r => 
        r.text.toLowerCase().includes('expensive') || 
        r.text.toLowerCase().includes('price') || 
        r.text.toLowerCase().includes('cost')
      );

      if (hasServiceIssues) {
        suggestions.push("Consider reviewing service speed and staff training procedures");
      }
      if (hasFoodIssues) {
        suggestions.push("Review food quality control and temperature maintenance");
      }
      if (hasPriceIssues) {
        suggestions.push("Evaluate pricing strategy and value proposition");
      }
    }

    if (suggestions.length === 0) {
      suggestions.push("No specific improvement areas identified");
    }

    return {
      positive: (positive / total) * 100,
      negative: (negative / total) * 100,
      neutral: (neutral / total) * 100,
      suggestions
    };
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    return {
      positive: 0,
      negative: 0,
      neutral: 0,
      suggestions: ['Unable to analyze reviews at this time.']
    };
  }
};

export const predictItemPopularity = async (
  menuItems: MenuItem[],
  orders: Order[]
): Promise<{ [key: string]: number }> => {
  try {
    const popularityScores: { [key: string]: number } = {};
    
    // Calculate popularity based on sales count and recent orders
    menuItems.forEach(item => {
      // Base score from sales count (0-50 points)
      const salesScore = Math.min((item.salesCount / 200) * 50, 50);
      
      // Recent order frequency (0-50 points)
      const recentOrders = orders.filter(order => 
        order.items.some(orderItem => orderItem.itemId === item.id)
      );
      const orderScore = Math.min((recentOrders.length / 10) * 50, 50);
      
      // Combine scores
      popularityScores[item.id] = Math.round(salesScore + orderScore);
    });

    return popularityScores;
  } catch (error) {
    console.error('Error predicting popularity:', error);
    return {};
  }
};

export const analyzeCustomerPreferences = async (
  orders: Order[],
  menuItems: MenuItem[]
): Promise<{ category: string; timeOfDay: string }[]> => {
  try {
    const preferences: { category: string; timeOfDay: string }[] = [];
    const categoryMap = new Map<string, number>();
    const timeMap = new Map<string, number>();

    // Analyze orders by time of day
    orders.forEach(order => {
      const hour = order.createdAt.getHours();
      let timeOfDay = 'morning';
      if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
      else if (hour >= 17) timeOfDay = 'evening';

      // Count category popularity by time
      order.items.forEach(item => {
        const menuItem = menuItems.find(mi => mi.id === item.itemId);
        if (menuItem) {
          const key = `${menuItem.category}-${timeOfDay}`;
          categoryMap.set(key, (categoryMap.get(key) || 0) + item.quantity);
        }
      });
    });

    // Convert to preferences array
    categoryMap.forEach((count, key) => {
      const [category, timeOfDay] = key.split('-');
      if (count > 5) { // Only include significant preferences
        preferences.push({ category, timeOfDay });
      }
    });

    return preferences;
  } catch (error) {
    console.error('Error analyzing preferences:', error);
    return [];
  }
};

export const analyzeRawData = async (rawData: RawData): Promise<AIAnalysisResponse> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const structuredPrompt = {
      task: "restaurant_analytics",
      data: {
        orders: rawData.orders,
        menuItems: rawData.menuItems,
        reviews: rawData.reviews,
        timeRange: rawData.timeRange
      },
      required_format: {
        insights: [
          {
            type: "string (increase|decrease|alert|suggestion)",
            title: "string",
            description: "string",
            value: "number (optional)",
            trend: "string (up|down)"
          }
        ],
        menuPerformance: [
          {
            id: "string",
            name: "string",
            performance: "number (0-100)",
            trend: "string (up|down|stable)"
          }
        ],
        staffingInsights: {
          peakHours: ["string"],
          recommendedStaff: "number",
          reason: "string"
        },
        inventoryAlerts: [
          {
            itemId: "string",
            itemName: "string",
            currentStock: "number",
            recommendedStock: "number",
            urgency: "string (high|medium|low)"
          }
        ],
        customerInsights: {
          retentionRate: "number (0-100)",
          averageRating: "number (1-5)",
          topFeedback: ["string"]
        },
        promotionSuggestions: [
          {
            type: "string (discount|bundle|special)",
            title: "string",
            description: "string",
            targetItems: ["string"],
            expectedImpact: "string"
          }
        ],
        anomalies: [
          {
            type: "string (sales|inventory|customer)",
            description: "string",
            severity: "string (high|medium|low)"
          }
        ],
        topSellingItems: [
          {
            id: "string",
            name: "string",
            sales: "number",
            revenue: "number"
          }
        ],
        salesByCategory: [
          {
            category: "string",
            sales: "number",
            percentage: "number"
          }
        ],
        salesByTime: [
          {
            hour: "number (0-23)",
            sales: "number",
            orders: "number"
          }
        ],
        salesSummary: "string"
      }
    };

    const prompt = `You are a restaurant analytics AI. Analyze the provided data and return insights in the exact JSON format specified.
    Do not include any explanations or markdown formatting.
    Only return valid JSON that matches the required_format structure exactly.
    
    ${JSON.stringify(structuredPrompt, null, 2)}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = '';

    // Handle Gemini 2.0 response format
    if (response.candidates && response.candidates[0]?.content?.parts[0]?.text) {
      text = response.candidates[0].content.parts[0].text;
    } else if (typeof response.text === 'function') {
      text = response.text();
    } else {
      throw new Error('Unexpected Gemini response format');
    }

    // Clean up the response
    text = text.trim();
    
    // Remove any markdown formatting if present
    if (text.startsWith('```')) {
      text = text.replace(/^```json\s*/, '');
      text = text.replace(/^```\s*/, '');
      text = text.replace(/```$/, '');
    }

    try {
      const parsedResponse = JSON.parse(text) as AIAnalysisResponse;
      
      // Validate response structure
      const requiredKeys = [
        'insights',
        'menuPerformance',
        'staffingInsights',
        'inventoryAlerts',
        'customerInsights',
        'promotionSuggestions',
        'anomalies',
        'topSellingItems',
        'salesByCategory',
        'salesByTime',
        'salesSummary'
      ];

      const missingKeys = requiredKeys.filter(key => !(key in parsedResponse));
      if (missingKeys.length > 0) {
        throw new Error(`Invalid response format. Missing keys: ${missingKeys.join(', ')}`);
      }

      return parsedResponse;
    } catch (error) {
      console.error('Error parsing AI response:', error);
      throw new Error('Invalid AI response format');
    }
  } catch (error) {
    console.error('Error analyzing data:', error);
    throw error;
  }
}; 