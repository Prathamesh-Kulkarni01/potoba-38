
// This file provides mock implementations of API endpoints
// Replace with actual API calls when your backend is ready

import { toast } from "sonner";

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Sample data
const USERS = [
  { 
    id: "user-1", 
    name: "Demo User", 
    email: "demo@example.com",
    restaurants: [
      {
        id: "rest-1",
        name: "Potoba Restaurant",
        logo: "/images/potoba-logo.svg",
        description: "Authentic cuisine with a modern twist",
        cuisine: "Fusion",
        tables: 20,
      }
    ]
  }
];

const MENU_ITEMS = [
  { 
    id: "1", 
    name: "Classic Burger", 
    description: "Beef patty with lettuce, tomato, and our special sauce",
    category: "Main Courses",
    price: 12.99,
    image: "/placeholder.svg",
    restaurantId: "rest-1"
  },
  { 
    id: "2", 
    name: "Caesar Salad", 
    description: "Romaine lettuce with Caesar dressing, croutons, and parmesan",
    category: "Starters",
    price: 8.99,
    image: "/placeholder.svg",
    restaurantId: "rest-1"
  },
  // ... additional items omitted for brevity
];

const TABLES = [
  { id: "table-1", number: 1, capacity: 4, status: "available", restaurantId: "rest-1" },
  { id: "table-2", number: 2, capacity: 2, status: "occupied", restaurantId: "rest-1" },
  { id: "table-3", number: 3, capacity: 6, status: "available", restaurantId: "rest-1" },
  { id: "table-4", number: 4, capacity: 4, status: "reserved", restaurantId: "rest-1" },
];

const ORDERS = [
  { 
    id: "order-1", 
    tableId: "table-2", 
    status: "in-progress",
    items: [
      { menuItemId: "1", quantity: 2, name: "Classic Burger", price: 12.99 },
      { menuItemId: "2", quantity: 1, name: "Caesar Salad", price: 8.99 }
    ],
    total: 34.97,
    createdAt: new Date().toISOString(),
    restaurantId: "rest-1"
  }
];

// Mock API functions
export const mockApi = {
  auth: {
    login: async (email: string, password: string) => {
      await delay(800);
      const user = USERS.find(u => u.email === email && password === "password");
      
      if (!user) {
        toast.error("Invalid credentials");
        return { success: false, error: "Invalid credentials" };
      }
      
      const token = "mock-jwt-token";
      localStorage.setItem("token", token);
      
      return { 
        success: true, 
        data: { user, token } 
      };
    },
    
    register: async (userData: any) => {
      await delay(1000);
      const newUser = {
        id: `user-${Math.random().toString(36).substr(2, 9)}`,
        name: userData.name,
        email: userData.email,
        restaurants: []
      };
      
      const token = "mock-jwt-token";
      localStorage.setItem("token", token);
      
      return { 
        success: true, 
        data: { user: newUser, token } 
      };
    },
    
    logout: async () => {
      await delay(500);
      localStorage.removeItem("token");
      return { success: true };
    },
    
    getCurrentUser: async (token: string) => {
      await delay(600);
      if (token !== "mock-jwt-token") {
        return { success: false, error: "Invalid token" };
      }
      
      return { 
        success: true, 
        data: { user: USERS[0] } 
      };
    }
  },
  
  restaurants: {
    getAll: async () => {
      await delay(800);
      return { 
        success: true, 
        data: USERS[0].restaurants 
      };
    },
    
    getById: async (id: string) => {
      await delay(600);
      const restaurant = USERS[0].restaurants.find(r => r.id === id);
      
      if (!restaurant) {
        return { success: false, error: "Restaurant not found" };
      }
      
      return { 
        success: true, 
        data: restaurant 
      };
    },
    
    create: async (restaurantData: any) => {
      await delay(1000);
      const newRestaurant = {
        id: `rest-${Math.random().toString(36).substr(2, 9)}`,
        ...restaurantData
      };
      
      return { 
        success: true, 
        data: newRestaurant 
      };
    },
    
    update: async (id: string, restaurantData: any) => {
      await delay(800);
      const restaurant = USERS[0].restaurants.find(r => r.id === id);
      
      if (!restaurant) {
        return { success: false, error: "Restaurant not found" };
      }
      
      const updatedRestaurant = {
        ...restaurant,
        ...restaurantData
      };
      
      return { 
        success: true, 
        data: updatedRestaurant 
      };
    },
    
    delete: async (id: string) => {
      await delay(600);
      return { success: true };
    }
  },
  
  menu: {
    getAll: async (restaurantId: string) => {
      await delay(700);
      const items = MENU_ITEMS.filter(item => item.restaurantId === restaurantId);
      
      return { 
        success: true, 
        data: items 
      };
    },
    
    getById: async (restaurantId: string, menuItemId: string) => {
      await delay(500);
      const item = MENU_ITEMS.find(
        item => item.restaurantId === restaurantId && item.id === menuItemId
      );
      
      if (!item) {
        return { success: false, error: "Menu item not found" };
      }
      
      return { 
        success: true, 
        data: item 
      };
    },
    
    create: async (restaurantId: string, menuItemData: any) => {
      await delay(900);
      const newItem = {
        id: `item-${Math.random().toString(36).substr(2, 9)}`,
        restaurantId,
        ...menuItemData
      };
      
      return { 
        success: true, 
        data: newItem 
      };
    },
    
    update: async (restaurantId: string, menuItemId: string, menuItemData: any) => {
      await delay(700);
      const item = MENU_ITEMS.find(
        item => item.restaurantId === restaurantId && item.id === menuItemId
      );
      
      if (!item) {
        return { success: false, error: "Menu item not found" };
      }
      
      const updatedItem = {
        ...item,
        ...menuItemData
      };
      
      return { 
        success: true, 
        data: updatedItem 
      };
    },
    
    delete: async (restaurantId: string, menuItemId: string) => {
      await delay(500);
      return { success: true };
    }
  },
  
  tables: {
    getAll: async (restaurantId: string) => {
      await delay(600);
      const tables = TABLES.filter(table => table.restaurantId === restaurantId);
      
      return { 
        success: true, 
        data: tables 
      };
    },
    
    getById: async (restaurantId: string, tableId: string) => {
      await delay(400);
      const table = TABLES.find(
        table => table.restaurantId === restaurantId && table.id === tableId
      );
      
      if (!table) {
        return { success: false, error: "Table not found" };
      }
      
      return { 
        success: true, 
        data: table 
      };
    },
    
    create: async (restaurantId: string, tableData: any) => {
      await delay(800);
      const newTable = {
        id: `table-${Math.random().toString(36).substr(2, 9)}`,
        restaurantId,
        ...tableData
      };
      
      return { 
        success: true, 
        data: newTable 
      };
    },
    
    update: async (restaurantId: string, tableId: string, tableData: any) => {
      await delay(600);
      const table = TABLES.find(
        table => table.restaurantId === restaurantId && table.id === tableId
      );
      
      if (!table) {
        return { success: false, error: "Table not found" };
      }
      
      const updatedTable = {
        ...table,
        ...tableData
      };
      
      return { 
        success: true, 
        data: updatedTable 
      };
    },
    
    delete: async (restaurantId: string, tableId: string) => {
      await delay(400);
      return { success: true };
    }
  },
  
  orders: {
    getAll: async (restaurantId: string) => {
      await delay(700);
      const orders = ORDERS.filter(order => order.restaurantId === restaurantId);
      
      return { 
        success: true, 
        data: orders 
      };
    },
    
    getById: async (restaurantId: string, orderId: string) => {
      await delay(500);
      const order = ORDERS.find(
        order => order.restaurantId === restaurantId && order.id === orderId
      );
      
      if (!order) {
        return { success: false, error: "Order not found" };
      }
      
      return { 
        success: true, 
        data: order 
      };
    },
    
    create: async (restaurantId: string, tableId: string, orderData: any) => {
      await delay(1000);
      const newOrder = {
        id: `order-${Math.random().toString(36).substr(2, 9)}`,
        restaurantId,
        tableId,
        status: "new",
        createdAt: new Date().toISOString(),
        ...orderData
      };
      
      return { 
        success: true, 
        data: newOrder 
      };
    },
    
    update: async (restaurantId: string, orderId: string, orderData: any) => {
      await delay(800);
      const order = ORDERS.find(
        order => order.restaurantId === restaurantId && order.id === orderId
      );
      
      if (!order) {
        return { success: false, error: "Order not found" };
      }
      
      const updatedOrder = {
        ...order,
        ...orderData
      };
      
      return { 
        success: true, 
        data: updatedOrder 
      };
    },
    
    updateStatus: async (restaurantId: string, orderId: string, status: string) => {
      await delay(600);
      const order = ORDERS.find(
        order => order.restaurantId === restaurantId && order.id === orderId
      );
      
      if (!order) {
        return { success: false, error: "Order not found" };
      }
      
      const updatedOrder = {
        ...order,
        status
      };
      
      return { 
        success: true, 
        data: updatedOrder 
      };
    },
    
    delete: async (restaurantId: string, orderId: string) => {
      await delay(500);
      return { success: true };
    }
  }
};

export default mockApi;
