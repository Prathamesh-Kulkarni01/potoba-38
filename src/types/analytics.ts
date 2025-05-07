import { ReactNode } from 'react';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  salesCount: number;
  description?: string;
}

export interface Review {
  id: string;
  rating: number;
  text: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  createdAt: Date;
}

export interface Order {
  id: string;
  items: { itemId: string; quantity: number }[];
  total: number;
  createdAt: Date;
}

export interface AiAnalyticsProps {
  useDummyData?: boolean;
}

export interface CachedData {
  sentimentData: {
    positive: number;
    negative: number;
    neutral: number;
    suggestions: string[];
  };
  popularityScores: { [key: string]: number };
  preferences: { category: string; timeOfDay: string }[];
  timestamp: number;
}

export interface SalesSummary {
  totalSales: number;
  averageOrderValue: number;
  topSellingItems: { name: string; quantity: number }[];
  salesByCategory: { category: string; amount: number }[];
  salesByTime: { time: string; amount: number }[];
  summary: string;
}

export interface SalesInsight {
  type: 'increase' | 'decrease' | 'alert' | 'suggestion';
  title: string;
  description: string;
  value?: number;
  trend: 'up' | 'down';
  icon?: ReactNode;
}

export interface AnalyticsData {
  salesSummary: {
    totalSales: number;
    averageOrderValue: number;
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
    summary: string;
    comparison: {
      previous: number;
      change: number;
      trend: 'up' | 'down';
    };
  };
  insights: SalesInsight[];
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
}

export interface Insight {
  type: 'increase' | 'decrease' | 'alert' | 'suggestion';
  title: string;
  description: string;
  value?: number;
  trend: 'up' | 'down';
}

export interface MenuPerformanceItem {
  id: string;
  name: string;
  performance: number;
  trend: 'up' | 'down' | 'stable';
}

export interface StaffingInsights {
  peakHours: string[];
  recommendedStaff: number;
  reason: string;
}

export interface InventoryAlert {
  itemId: string;
  itemName: string;
  currentStock: number;
  recommendedStock: number;
  urgency: 'high' | 'medium' | 'low';
}

export interface CustomerInsights {
  retentionRate: number;
  averageRating: number;
  topFeedback: string[];
}

export interface PromotionSuggestion {
  type: 'discount' | 'bundle' | 'special';
  title: string;
  description: string;
  targetItems: string[];
  expectedImpact: string;
}

export interface Anomaly {
  type: 'sales' | 'inventory' | 'customer';
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export interface TopSellingItem {
  id: string;
  name: string;
  sales: number;
  revenue: number;
}

export interface CategorySales {
  category: string;
  sales: number;
  percentage: number;
}

export interface HourlySales {
  hour: number;
  sales: number;
  orders: number;
}

export interface AIAnalysisResponse {
  insights: Insight[];
  menuPerformance: MenuPerformanceItem[];
  staffingInsights: StaffingInsights;
  inventoryAlerts: InventoryAlert[];
  customerInsights: CustomerInsights;
  promotionSuggestions: PromotionSuggestion[];
  anomalies: Anomaly[];
  topSellingItems: TopSellingItem[];
  salesByCategory: CategorySales[];
  salesByTime: HourlySales[];
  salesSummary: string;
} 