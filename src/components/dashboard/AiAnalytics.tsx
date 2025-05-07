import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, TrendingUp, MessageCircle, Star, Award, ChefHat, AlertCircle, 
  RefreshCw, BarChart3, Calendar, Users, Clock, Package, Bell, 
  TrendingDown, TrendingUp as TrendingUpIcon, AlertTriangle, 
  DollarSign, ShoppingBag, Coffee, Utensils, Users2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { analyzeCustomerSentiment, predictItemPopularity, analyzeCustomerPreferences, analyzeRawData } from '@/services/geminiService';
import { collection, query, where, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from "@/components/ui/use-toast";
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import {
  MenuItem,
  Review,
  Order,
  AiAnalyticsProps,
  CachedData,
  SalesInsight,
  AnalyticsData,
  SalesSummary
} from '@/types/analytics';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Dummy data for testing
const dummyMenuItems: MenuItem[] = [
  { id: '1', name: 'Classic Burger', price: 12.99, category: 'Main Courses', salesCount: 142 },
  { id: '2', name: 'Caesar Salad', price: 8.99, category: 'Starters', salesCount: 98 },
  { id: '3', name: 'Margherita Pizza', price: 14.99, category: 'Main Courses', salesCount: 156 },
  { id: '4', name: 'Chocolate Cake', price: 6.99, category: 'Desserts', salesCount: 75 },
  { id: '5', name: 'French Fries', price: 4.99, category: 'Sides', salesCount: 189 },
  { id: '6', name: 'Iced Tea', price: 2.99, category: 'Drinks', salesCount: 210 },
];

const dummyReviews: Review[] = [
  { id: '1', rating: 5, text: "Amazing food and service! Will definitely come back!", sentiment: 'positive', createdAt: new Date() },
  { id: '2', rating: 4, text: "The food was good but took a bit long to arrive.", sentiment: 'neutral', createdAt: new Date() },
  { id: '3', rating: 5, text: "Best burger I've had in years. Highly recommend!", sentiment: 'positive', createdAt: new Date() },
  { id: '4', rating: 2, text: "The food was cold when it arrived. Disappointed.", sentiment: 'negative', createdAt: new Date() },
  { id: '5', rating: 5, text: "Excellent staff and atmosphere. Food was perfect.", sentiment: 'positive', createdAt: new Date() },
  { id: '6', rating: 3, text: "Average experience. Nothing special.", sentiment: 'neutral', createdAt: new Date() },
];

const dummyOrders: Order[] = [
  { 
    id: '1', 
    items: [{ itemId: '1', quantity: 2 }, { itemId: '5', quantity: 1 }], 
    total: 30.97, 
    createdAt: new Date() 
  },
  { 
    id: '2', 
    items: [{ itemId: '3', quantity: 1 }, { itemId: '6', quantity: 2 }], 
    total: 20.97, 
    createdAt: new Date() 
  },
];

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

const AiAnalytics: React.FC<AiAnalyticsProps> = ({ useDummyData = true }) => {
  const { currentRestaurantId } = useAuth();
  const { toast } = useToast();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [preferences, setPreferences] = useState<{ category: string, timeOfDay: string }[]>([]);
  const [popularityScores, setPopularityScores] = useState<{[key: string]: number}>({});
  const [sentimentData, setSentimentData] = useState<{
    positive: number;
    negative: number;
    neutral: number;
    suggestions: string[];
  }>({
    positive: 0,
    negative: 0,
    neutral: 0,
    suggestions: []
  });
  const [loading, setLoading] = useState(true);
  const [dataInitialized, setDataInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState('sales');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  // Function to get cached data
  const getCachedData = (): CachedData | null => {
    const cached = localStorage.getItem('aiAnalyticsCache');
    if (!cached) return null;

    const data: CachedData = JSON.parse(cached);
    const now = Date.now();
    
    if (now - data.timestamp > CACHE_DURATION) {
      localStorage.removeItem('aiAnalyticsCache');
      return null;
    }

    return data;
  };

  // Function to save data to cache
  const saveToCache = (data: Omit<CachedData, 'timestamp'>) => {
    const cacheData: CachedData = {
      ...data,
      timestamp: Date.now()
    };
    localStorage.setItem('aiAnalyticsCache', JSON.stringify(cacheData));
    setLastUpdated(new Date());
  };

  // Function to refresh data
  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      // Clear cache before refreshing
      localStorage.removeItem('aiAnalyticsCache');
      
      // Force reload Firebase data
      if (currentRestaurantId) {
        const restaurantId = currentRestaurantId;
        
        // Fetch fresh data from Firebase
        const menuItemsSnapshot = await getDocs(
          query(collection(db, 'menuItems'), where('restaurantId', '==', restaurantId))
        );
        const menuItemsData = menuItemsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MenuItem[];
        setMenuItems(menuItemsData);

        const reviewsSnapshot = await getDocs(
          query(
            collection(db, 'reviews'),
            where('restaurantId', '==', restaurantId),
            orderBy('createdAt', 'desc'),
            limit(50)
          )
        );
        const reviewsData = reviewsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        })) as Review[];
        setReviews(reviewsData);

        const ordersSnapshot = await getDocs(
          query(
            collection(db, 'orders'),
            where('restaurantId', '==', restaurantId),
            orderBy('createdAt', 'desc'),
            limit(100)
          )
        );
        const ordersData = ordersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        })) as Order[];
        setOrders(ordersData);

        // Force a refresh by incrementing the counter
        setForceRefresh(prev => prev + 1);
      }

      toast({
        title: "Refreshing",
        description: "Fetching latest analytics data...",
      });
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast({
        title: "Error",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      });
      setIsRefreshing(false);
    }
  };

  // Modified analyzeData function
  const analyzeData = async () => {
    if (!dataInitialized) return;
    if (menuItems.length === 0 && reviews.length === 0 && orders.length === 0) {
      console.log('No data to analyze');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Check cache first, but skip if forceRefresh is triggered
      // const cached = getCachedData();
      // if (cached && !isRefreshing) {
      //   setSentimentData(cached.sentimentData);
      //   setPopularityScores(cached.popularityScores);
      //   setPreferences(cached.preferences);
      //   setLastUpdated(new Date(cached.timestamp));
      //   setLoading(false);
      //   return;
      // }

      console.log('Making API calls for analysis...', {
        reviewsCount: reviews.length,
        menuItemsCount: menuItems.length,
        ordersCount: orders.length
      });

      // If no cache or refreshing, analyze data
      const sentiment = await analyzeCustomerSentiment(reviews);
      console.log('Sentiment analysis complete:', sentiment);

      const popularity = await predictItemPopularity(menuItems, orders);
      console.log('Popularity analysis complete:', popularity);

      const prefs = await analyzeCustomerPreferences(orders, menuItems);
      console.log('Preferences analysis complete:', prefs);

      setSentimentData(sentiment);
      setPopularityScores(popularity);
      setPreferences(prefs);
      setLastUpdated(new Date());

      // Save to cache
      saveToCache({
        sentimentData: sentiment,
        popularityScores: popularity,
        preferences: prefs
      });

      if (isRefreshing) {
        toast({
          title: "Success",
          description: "Analytics data refreshed successfully",
        });
      }
    } catch (error) {
      console.error("Error analyzing data:", error);
      toast({
        title: "Error",
        description: "Failed to analyze data. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initialize data
  useEffect(() => {
    if (useDummyData) {
      setMenuItems(dummyMenuItems);
      setReviews(dummyReviews);
      setOrders(dummyOrders);
      setDataInitialized(true);
      setLoading(false);
      return;
    }

    if (!currentRestaurantId) {
      setLoading(false);
      return;
    }

    const restaurantId = currentRestaurantId;
    let dataLoaded = 0;
    const requiredDataPoints = 3; // menuItems, reviews, orders

    const checkAllDataLoaded = () => {
      dataLoaded++;
      console.log(`Data loaded: ${dataLoaded}/${requiredDataPoints}`);
      if (dataLoaded === requiredDataPoints) {
        setDataInitialized(true);
      }
    };

    // Subscribe to menu items
    const menuItemsUnsubscribe = onSnapshot(
      query(collection(db, 'menuItems'), where('restaurantId', '==', restaurantId)),
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MenuItem[];
        console.log('Menu items updated:', items.length);
        setMenuItems(items);
        checkAllDataLoaded();
      },
      (error) => {
        console.error("Error fetching menu items:", error);
        toast({
          title: "Error",
          description: "Failed to fetch menu items. Using dummy data instead.",
          variant: "destructive",
        });
        setMenuItems(dummyMenuItems);
        checkAllDataLoaded();
      }
    );

    // Subscribe to reviews
    const reviewsUnsubscribe = onSnapshot(
      query(
        collection(db, 'reviews'),
        where('restaurantId', '==', restaurantId),
        orderBy('createdAt', 'desc'),
        limit(50)
      ),
      (snapshot) => {
        const reviewData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        })) as Review[];
        setReviews(reviewData);
        checkAllDataLoaded();
      },
      (error) => {
        console.error("Error fetching reviews:", error);
        toast({
          title: "Error",
          description: "Failed to fetch reviews. Using dummy data instead.",
          variant: "destructive",
        });
        setReviews(dummyReviews);
        checkAllDataLoaded();
      }
    );

    // Subscribe to orders
    const ordersUnsubscribe = onSnapshot(
      query(
        collection(db, 'orders'),
        where('restaurantId', '==', restaurantId),
        orderBy('createdAt', 'desc'),
        limit(100)
      ),
      (snapshot) => {
        const orderData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        })) as Order[];
        setOrders(orderData);
        checkAllDataLoaded();
      },
      (error) => {
        console.error("Error fetching orders:", error);
        toast({
          title: "Error",
          description: "Failed to fetch orders. Using dummy data instead.",
          variant: "destructive",
        });
        setOrders(dummyOrders);
        checkAllDataLoaded();
      }
    );

    return () => {
      menuItemsUnsubscribe();
      reviewsUnsubscribe();
      ordersUnsubscribe();
    };
  }, [currentRestaurantId, useDummyData, toast]);

  // Modified useEffect for analysis
  useEffect(() => {
    if (dataInitialized) {
      console.log('Data initialized, running analysis...'); // Debug log
      analyzeData();
    }
  }, [dataInitialized, menuItems, reviews, orders, forceRefresh]); // Add forceRefresh to dependencies

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

  // Function to generate sales summary
  const generateSalesSummary = (orders: Order[], menuItems: MenuItem[]): SalesSummary => {
    const now = new Date();
    const filteredOrders = orders.filter(order => {
      const orderDate = order.createdAt;
      switch (timeRange) {
        case 'daily':
          return orderDate.toDateString() === now.toDateString();
        case 'weekly':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return orderDate >= weekAgo;
        case 'monthly':
          return orderDate.getMonth() === now.getMonth() && 
                 orderDate.getFullYear() === now.getFullYear();
      }
    });

    // Calculate total sales
    const totalSales = filteredOrders.reduce((sum, order) => sum + order.total, 0);
    const averageOrderValue = totalSales / (filteredOrders.length || 1);

    // Calculate top selling items
    const itemCounts = new Map<string, number>();
    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        itemCounts.set(item.itemId, (itemCounts.get(item.itemId) || 0) + item.quantity);
      });
    });

    const topSellingItems = Array.from(itemCounts.entries())
      .map(([itemId, quantity]) => {
        const menuItem = menuItems.find(item => item.id === itemId);
        return { name: menuItem?.name || 'Unknown', quantity };
      })
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Calculate sales by category
    const categorySales = new Map<string, number>();
    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        const menuItem = menuItems.find(mi => mi.id === item.itemId);
        if (menuItem) {
          categorySales.set(
            menuItem.category,
            (categorySales.get(menuItem.category) || 0) + (menuItem.price * item.quantity)
          );
        }
      });
    });

    const salesByCategory = Array.from(categorySales.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    // Calculate sales by time
    const timeSlots = ['Morning', 'Afternoon', 'Evening', 'Night'];
    const salesByTime = timeSlots.map(time => {
      const timeOrders = filteredOrders.filter(order => {
        const hour = order.createdAt.getHours();
        switch (time) {
          case 'Morning': return hour >= 6 && hour < 12;
          case 'Afternoon': return hour >= 12 && hour < 17;
          case 'Evening': return hour >= 17 && hour < 22;
          case 'Night': return hour >= 22 || hour < 6;
        }
      });
      return {
        time,
        amount: timeOrders.reduce((sum, order) => sum + order.total, 0)
      };
    });

    // Generate natural language summary
    const summary = generateNaturalLanguageSummary({
      totalSales,
      averageOrderValue,
      topSellingItems,
      salesByCategory,
      salesByTime,
      timeRange
    });

    return {
      totalSales,
      averageOrderValue,
      topSellingItems,
      salesByCategory,
      salesByTime,
      summary
    };
  };

  const generateNaturalLanguageSummary = (data: Omit<SalesSummary, 'summary'> & { timeRange: string }): string => {
    const { totalSales, averageOrderValue, topSellingItems, salesByCategory, salesByTime, timeRange } = data;
    const timeFrame = timeRange === 'daily' ? 'today' : timeRange === 'weekly' ? 'this week' : 'this month';
    
    const topCategory = salesByCategory[0];
    const bestTimeSlot = salesByTime.reduce((a, b) => a.amount > b.amount ? a : b);
    
    return `Sales ${timeFrame} totaled ₹${totalSales.toFixed(2)} with an average order value of ₹${averageOrderValue.toFixed(2)}. ` +
           `${topCategory.category} was the top performing category, generating ₹${topCategory.amount.toFixed(2)} in sales. ` +
           `The ${bestTimeSlot.time} period saw the highest sales activity. ` +
           `Top selling items included ${topSellingItems.slice(0, 3).map(item => item.name).join(', ')}.`;
  };

  // Update sales summary when data changes
  useEffect(() => {
    if (orders.length > 0 && menuItems.length > 0) {
      const summary = generateSalesSummary(orders, menuItems);
      setSalesSummary(summary);
    }
  }, [orders, menuItems, timeRange]);

  // Function to generate comprehensive analytics
  const generateAnalytics = async (orders: Order[], menuItems: MenuItem[], reviews: Review[]): Promise<AnalyticsData> => {
    const now = new Date();
    const filteredOrders = orders.filter(order => {
      const orderDate = order.createdAt;
      switch (timeRange) {
        case 'daily':
          return orderDate.toDateString() === now.toDateString();
        case 'weekly':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return orderDate >= weekAgo;
        case 'monthly':
          return orderDate.getMonth() === now.getMonth() && 
                 orderDate.getFullYear() === now.getFullYear();
      }
    });

    // Prepare data for AI analysis
    const rawData = {
      orders: filteredOrders.map(order => ({
        id: order.id,
        items: order.items,
        total: order.total,
        createdAt: order.createdAt.toISOString()
      })),
      menuItems: menuItems.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        salesCount: item.salesCount
      })),
      reviews: reviews.map(review => ({
        id: review.id,
        rating: review.rating,
        text: review.text,
        createdAt: review.createdAt.toISOString()
      })),
      timeRange
    };

    try {
      // Get AI analysis
      const aiAnalysis = await analyzeRawData(rawData);
      console.log('AI Analysis:', aiAnalysis);

      // Calculate basic metrics
      const totalSales = filteredOrders.reduce((sum, order) => sum + order.total, 0);
      const averageOrderValue = totalSales / (filteredOrders.length || 1);

      // Calculate sales comparison
      const previousPeriodOrders = orders.filter(order => {
        const orderDate = order.createdAt;
        const previousDate = new Date(now.getTime() - (timeRange === 'daily' ? 24 : timeRange === 'weekly' ? 7 * 24 : 30 * 24) * 60 * 60 * 1000);
        return orderDate >= previousDate && orderDate < now;
      });
      const previousSales = previousPeriodOrders.reduce((sum, order) => sum + order.total, 0);
      const salesChange = previousSales ? ((totalSales - previousSales) / previousSales) * 100 : 0;

      // Add icons to insights
      const insightsWithIcons = aiAnalysis?.insights?.map(insight => ({
        ...insight,
        icon: getInsightIcon(insight.type)
      }));

      return {
        salesSummary: {
          totalSales,
          averageOrderValue,
          topSellingItems: aiAnalysis.topSellingItems,
          salesByCategory: aiAnalysis.salesByCategory,
          salesByTime: aiAnalysis.salesByTime,
          summary: aiAnalysis.salesSummary,
          comparison: {
            previous: previousSales,
            change: salesChange,
            trend: salesChange > 0 ? 'up' : 'down'
          }
        },
        insights: insightsWithIcons,
        menuPerformance: aiAnalysis.menuPerformance,
        staffingInsights: aiAnalysis.staffingInsights,
        inventoryAlerts: aiAnalysis.inventoryAlerts,
        customerInsights: aiAnalysis.customerInsights,
        promotionSuggestions: aiAnalysis.promotionSuggestions,
        anomalies: aiAnalysis.anomalies
      };
    } catch (error) {
      console.error('Error analyzing data with AI:', error);
      throw error;
    }
  };

  // Helper function to get appropriate icon for insight type
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'increase':
        return <TrendingUpIcon className="h-4 w-4" />;
      case 'decrease':
        return <TrendingDown className="h-4 w-4" />;
      case 'alert':
        return <AlertTriangle className="h-4 w-4" />;
      case 'suggestion':
        return <Sparkles className="h-4 w-4" />;
      default:
        return <TrendingUp className="h-4 w-4" />;
    }
  };

  // Update analytics when data changes
  useEffect(() => {
    if (dataInitialized && orders.length > 0 && menuItems.length > 0) {
      setLoading(true);
      generateAnalytics(orders, menuItems, reviews)
        .then(data => {
          setAnalyticsData(data);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error generating analytics:', error);
          toast({
            title: "Error",
            description: "Failed to generate analytics. Please try again.",
            variant: "destructive",
          });
          setLoading(false);
        });
    }
  }, [dataInitialized, orders, menuItems, reviews, timeRange]);

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

  return (
    <Card className="mb-6 overflow-hidden border-t-4 border-t-restaurant-primary">
      <CardHeader className="bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-restaurant-primary" />
            <CardTitle className="text-lg">AI-Powered Analytics</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshData}
              disabled={isRefreshing}
              className="h-8 w-8"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          <Badge variant="outline" className="bg-restaurant-primary/10 text-restaurant-primary">
            AI Powered
          </Badge>
          </div>
        </div>
        <CardDescription>
          Smart insights and recommendations based on AI analysis
        </CardDescription>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-6 pt-2">
          <TabsList className="w-full">
            <TabsTrigger  value="sales" className="flex-1">
              Sales Analytics
            </TabsTrigger>
            <TabsTrigger value="menu" className="flex-1">
              Menu Insights
            </TabsTrigger>
            <TabsTrigger value="operations" className="flex-1">
              Operations
            </TabsTrigger>
          </TabsList>
        </div>
        
        <CardContent className="pt-4">
          <TabsContent value="sales" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium text-sm flex items-center">
                <BarChart3 className="h-4 w-4 mr-1 text-restaurant-primary" />
                Sales Analytics
              </h4>
              <div className="flex gap-2">
                <Button
                  variant={timeRange === 'daily' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeRange('daily')}
                >
                  Daily
                </Button>
                <Button
                  variant={timeRange === 'weekly' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeRange('weekly')}
                >
                  Weekly
                </Button>
                <Button
                  variant={timeRange === 'monthly' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeRange('monthly')}
                >
                  Monthly
                </Button>
              </div>
            </div>

            {salesSummary && (
              <>
                <div className="bg-muted/30 p-4 rounded-lg">
                  <p className="text-sm">{salesSummary.summary}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Sales by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Bar
                        data={{
                          labels: salesSummary.salesByCategory.map(item => item.category),
                          datasets: [{
                            label: 'Sales ($)',
                            data: salesSummary.salesByCategory.map(item => item.amount),
                            backgroundColor: 'rgba(59, 130, 246, 0.5)',
                            borderColor: 'rgb(59, 130, 246)',
                            borderWidth: 1
                          }]
                        }}
                        options={{
                          responsive: true,
                          plugins: {
                            legend: {
                              display: false
                            }
                          }
                        }}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Sales by Time of Day</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Line
                        data={{
                          labels: salesSummary.salesByTime.map(item => item.time),
                          datasets: [{
                            label: 'Sales ($)',
                            data: salesSummary.salesByTime.map(item => item.amount),
                            borderColor: 'rgb(59, 130, 246)',
                            tension: 0.1
                          }]
                        }}
                        options={{
                          responsive: true,
                          plugins: {
                            legend: {
                              display: false
                            }
                          }
                        }}
                      />
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Top Selling Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {salesSummary.topSellingItems.map((item, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-sm">{item.name}</span>
                          <Badge variant="outline">
                            {item.quantity} sold
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="menu" className="space-y-4">
            <div>
              {/* Top Insights Grid */}
              <div className="grid grid-cols-2 gap-4">
                  {analyticsData?.insights?.map((insight, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center">
                          {insight.icon}
                          <CardTitle className="text-sm ml-2">{insight.title}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
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
          
          <TabsContent value="operations" className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center">
                <ChefHat className="h-4 w-4 mr-1 text-restaurant-primary" />
                Menu Recommendations
              </h4>
              <div className="space-y-2">
                <div className="bg-restaurant-primary/10 p-3 rounded-md">
                  <p className="text-sm font-medium mb-1">Suggested Menu Additions</p>
                  <ul className="text-xs space-y-1">
                    {sentimentData.suggestions.map((suggestion, i) => (
                      <li key={i} className="flex items-center">
                      <span className="w-2 h-2 bg-restaurant-primary rounded-full mr-2"></span>
                        {suggestion}
                    </li>
                    ))}
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
                  {sentimentData.suggestions.map((suggestion, i) => (
                    <li key={i} className="flex items-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
             {/* Alerts Section */}
             <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
                      Important Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analyticsData?.inventoryAlerts?.map((alert, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                          <div className="flex items-center">
                            <Package className="h-4 w-4 mr-2 text-red-500" />
                            <span className="text-sm">{alert.itemName} stock running low</span>
                          </div>
                          <Badge variant="destructive">High Priority</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
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
