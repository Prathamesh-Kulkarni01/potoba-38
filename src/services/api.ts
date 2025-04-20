import { toast } from "@/hooks/use-toast";
import {
  ApiResponse,
  AuthResponse,
  User,
  Restaurant,
  MenuItem,
  Table,
  Order,
  CreateRestaurantDto,
  CreateMenuItemDto,
  CreateTableDto,
  CreateOrderDto,
  UpdateOrderStatusDto,
} from "@/types/api";

// Helper to check if we're in offline mode
const isOfflineMode = (): boolean =>
  localStorage.getItem("offlineMode") === "true";

// Helper to get the configured API base URL or use the default
const getApiBaseUrl = (): string => {
  const port = localStorage.getItem("apiPort") || "5000";
  return isOfflineMode()
    ? `http://localhost:${port}/api`
    : localStorage.getItem("apiBaseUrl") || "http://localhost:5000/api";
};

// Function to store data locally in IndexedDB for offline use
const saveToIndexedDB = async <T>(
  storeName: string,
  data: T,
  id?: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("RestaurantAppOfflineDB", 1);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      [
        "restaurants",
        "menuItems",
        "tables",
        "orders",
        "users",
        "syncQueue",
      ].forEach((store) => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, {
            keyPath: store === "syncQueue" ? "id" : "id",
            autoIncrement: store === "syncQueue",
          });
        }
      });
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const operation = id ? store.put({ ...data, id }) : store.put(data);

      operation.onsuccess = () => resolve();
      operation.onerror = () =>
        reject(new Error("Failed to save to IndexedDB"));
      transaction.oncomplete = () => db.close();
    };

    request.onerror = () => reject(new Error("Failed to open IndexedDB"));
  });
};

// Function to retrieve data from IndexedDB
const getFromIndexedDB = async <T>(
  storeName: string,
  id?: string
): Promise<T | T[]> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("RestaurantAppOfflineDB", 1);

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const operation = id ? store.get(id) : store.getAll();

      operation.onsuccess = () => resolve(operation.result as T | T[]);
      operation.onerror = () =>
        reject(new Error("Failed to get data from IndexedDB"));
      transaction.oncomplete = () => db.close();
    };

    request.onerror = () => reject(new Error("Failed to open IndexedDB"));
  });
};

// Function to add operation to sync queue
const addToSyncQueue = async (operation: {
  type: "CREATE" | "UPDATE" | "DELETE";
  endpoint: string;
  method: string;
  data?: any;
  id?: string;
}): Promise<void> =>
  saveToIndexedDB("syncQueue", {
    ...operation,
    timestamp: new Date().toISOString(),
    synced: false,
  });

// Function to sync data with server when online
const syncWithServer = async (): Promise<void> => {
  if (!navigator.onLine) return;

  try {
    const syncQueue = await getFromIndexedDB<any[]>("syncQueue");
    const unsyncedOperations = syncQueue.filter((op) => !op.synced);

    for (const operation of unsyncedOperations) {
      try {
        await apiRequest(
          operation.endpoint,
          operation.method,
          operation.data,
          localStorage.getItem("token") || undefined
        );
        await saveToIndexedDB(
          "syncQueue",
          { ...operation, synced: true },
          operation.id
        );
      } catch (error) {
        console.error("Failed to sync operation:", operation, error);
      }
    }
  } catch (error) {
    console.error("Error during sync:", error);
  }
};

// Error handler helper
const handleApiError = (error: any): never => {
  const errorMessage =
    error.response?.data?.error || error.message || "An unknown error occurred";
  console.error("API Error:", errorMessage);
  toast({
    variant: "destructive",
    description: errorMessage,
  });
  throw new Error(errorMessage);
};

// Generic API request function
const apiRequest = async <T>(
  endpoint: string,
  method: string = "GET",
  data?: any,
  token?: string
): Promise<ApiResponse<T>> => {
  if (isOfflineMode() && !endpoint.includes("health-check")) {
    try {
      const storeName = endpoint.split("/")[1];
      const id = endpoint.split("/").pop();

      switch (method) {
        case "GET":
          const result = id
            ? await getFromIndexedDB<T>(storeName, id)
            : await getFromIndexedDB<T[]>(storeName);
          return { success: true, data: result as T };
        case "POST":
          const newId = Math.random().toString(36).substring(2, 15);
          await saveToIndexedDB(storeName, { ...data, id: newId });
          await addToSyncQueue({ type: "CREATE", endpoint, method, data });
          return { success: true, data: { ...data, id: newId } as T };
        case "PUT":
        case "PATCH":
          await saveToIndexedDB(storeName, data, id);
          await addToSyncQueue({ type: "UPDATE", endpoint, method, data, id });
          return { success: true, data: data as T };
        case "DELETE":
          await saveToIndexedDB(storeName, { id, _deleted: true }, id);
          await addToSyncQueue({ type: "DELETE", endpoint, method, id });
          return { success: true };
        default:
          return {
            success: false,
            error: `Unsupported method ${method} in offline mode`,
          };
      }
    } catch (error: any) {
      console.error("Offline storage error:", error);
      return { success: false, error: error.message };
    }
  }

  try {
    const url = `${getApiBaseUrl()}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const options: RequestInit = { method, headers, credentials: "include" };
    if (data && ["POST", "PUT", "PATCH"].includes(method))
      options.body = JSON.stringify(data);

    const response = await fetch(url, options);
    const responseData = await response.json();

    if (!response.ok)
      throw new Error(
        responseData.error || `Request failed with status ${response.status}`
      );
    return { success: true, data: responseData };
  } catch (error: any) {
    const errorMessage = error.message || "An unknown error occurred";
    console.error("API Error:", errorMessage);
    toast({ variant: "destructive", description: errorMessage });
    return { success: false, error: errorMessage };
  }
};

// Start listening for online/offline events to trigger sync
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    toast({ description: "Connection restored. Syncing data..." });
    syncWithServer();
  });

  window.addEventListener("offline", () => {
    toast({
      variant: "destructive",
      description:
        "You are offline. Changes will be synced when you reconnect.",
    });
  });

  if (navigator.onLine) syncWithServer();
}

// API Functions for authentication
export const authApi = {
  login: async (
    email: string,
    password: string
  ): Promise<ApiResponse<AuthResponse>> =>
    apiRequest<AuthResponse>("/auth/login", "POST", { email, password }),
  register: async (userData: {
    name: string;
    email: string;
    password: string;
  }): Promise<ApiResponse<AuthResponse>> =>
    apiRequest<AuthResponse>("/auth/register", "POST", userData),
  logout: async (): Promise<ApiResponse<void>> =>
    apiRequest<void>("/auth/logout", "POST"),
  getCurrentUser: async (token: string): Promise<ApiResponse<{ user: User }>> =>
    apiRequest<{ user: User }>("/auth/me", "GET", undefined, token),
};

// API Functions for restaurants
export const restaurantApi = {
  getAll: async (token: string): Promise<ApiResponse<Restaurant[]>> => {
    return apiRequest<Restaurant[]>("/restaurants", "GET", undefined, token);
  },

  getById: async (
    id: string,
    token: string
  ): Promise<ApiResponse<Restaurant>> => {
    return apiRequest<Restaurant>(
      `/restaurants/${id}`,
      "GET",
      undefined,
      token
    );
  },

  create: async (
    restaurantData: CreateRestaurantDto,
    token: string
  ): Promise<ApiResponse<Restaurant>> => {
    return apiRequest<Restaurant>(
      "/restaurants",
      "POST",
      restaurantData,
      token
    );
  },

  update: async (
    id: string,
    restaurantData: Partial<Restaurant>,
    token: string
  ): Promise<ApiResponse<Restaurant>> => {
    return apiRequest<Restaurant>(
      `/restaurants/${id}`,
      "PUT",
      restaurantData,
      token
    );
  },

  delete: async (id: string, token: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/restaurants/${id}`, "DELETE", undefined, token);
  },
};

// API Functions for menu items
export const menuApi = {
  getAll: async (
    restaurantId: string,
    token: string
  ): Promise<ApiResponse<MenuItem[]>> => {
    return apiRequest<MenuItem[]>(
      `/restaurants/${restaurantId}/menu`,
      "GET",
      undefined,
      token
    );
  },

  getById: async (
    restaurantId: string,
    menuItemId: string,
    token: string
  ): Promise<ApiResponse<MenuItem>> => {
    return apiRequest<MenuItem>(
      `/restaurants/${restaurantId}/menu/${menuItemId}`,
      "GET",
      undefined,
      token
    );
  },

  create: async (
    restaurantId: string,
    menuItemData: CreateMenuItemDto,
    token: string
  ): Promise<ApiResponse<MenuItem>> => {
    return apiRequest<MenuItem>(
      `/restaurants/${restaurantId}/menu`,
      "POST",
      menuItemData,
      token
    );
  },

  update: async (
    restaurantId: string,
    menuItemId: string,
    menuItemData: Partial<MenuItem>,
    token: string
  ): Promise<ApiResponse<MenuItem>> => {
    return apiRequest<MenuItem>(
      `/restaurants/${restaurantId}/menu/${menuItemId}`,
      "PUT",
      menuItemData,
      token
    );
  },

  delete: async (
    restaurantId: string,
    menuItemId: string,
    token: string
  ): Promise<ApiResponse<void>> => {
    return apiRequest<void>(
      `/restaurants/${restaurantId}/menu/${menuItemId}`,
      "DELETE",
      undefined,
      token
    );
  },
};

// API Functions for tables
export const tableApi = {
  getAll: async (
    restaurantId: string,
    token: string
  ): Promise<ApiResponse<Table[]>> => {
    return apiRequest<Table[]>(
      `/restaurants/${restaurantId}/tables`,
      "GET",
      undefined,
      token
    );
  },

  getById: async (
    restaurantId: string,
    tableId: string,
    token: string
  ): Promise<ApiResponse<Table>> => {
    return apiRequest<Table>(
      `/restaurants/${restaurantId}/tables/${tableId}`,
      "GET",
      undefined,
      token
    );
  },

  create: async (
    restaurantId: string,
    tableData: CreateTableDto,
    token: string
  ): Promise<ApiResponse<Table>> => {
    return apiRequest<Table>(
      `/restaurants/${restaurantId}/tables`,
      "POST",
      tableData,
      token
    );
  },

  update: async (
    restaurantId: string,
    tableId: string,
    tableData: Partial<Table>,
    token: string
  ): Promise<ApiResponse<Table>> => {
    return apiRequest<Table>(
      `/restaurants/${restaurantId}/tables/${tableId}`,
      "PUT",
      tableData,
      token
    );
  },

  delete: async (
    restaurantId: string,
    tableId: string,
    token: string
  ): Promise<ApiResponse<void>> => {
    return apiRequest<void>(
      `/restaurants/${restaurantId}/tables/${tableId}`,
      "DELETE",
      undefined,
      token
    );
  },
};

// API Functions for orders
export const orderApi = {
  getAll: async (
    restaurantId: string,
    token: string
  ): Promise<ApiResponse<Order[]>> => {
    return apiRequest<Order[]>(
      `/restaurants/${restaurantId}/orders`,
      "GET",
      undefined,
      token
    );
  },

  getById: async (
    restaurantId: string,
    orderId: string,
    token: string
  ): Promise<ApiResponse<Order>> => {
    return apiRequest<Order>(
      `/restaurants/${restaurantId}/orders/${orderId}`,
      "GET",
      undefined,
      token
    );
  },

  create: async (
    restaurantId: string,
    tableId: string,
    orderData: CreateOrderDto,
    token: string
  ): Promise<ApiResponse<Order>> => {
    return apiRequest<Order>(
      `/restaurants/${restaurantId}/tables/${tableId}/orders`,
      "POST",
      orderData,
      token
    );
  },

  update: async (
    restaurantId: string,
    orderId: string,
    orderData: Partial<Order>,
    token: string
  ): Promise<ApiResponse<Order>> => {
    return apiRequest<Order>(
      `/restaurants/${restaurantId}/orders/${orderId}`,
      "PUT",
      orderData,
      token
    );
  },

  updateStatus: async (
    restaurantId: string,
    orderId: string,
    status: UpdateOrderStatusDto,
    token: string
  ): Promise<ApiResponse<Order>> => {
    return apiRequest<Order>(
      `/restaurants/${restaurantId}/orders/${orderId}/status`,
      "PATCH",
      status,
      token
    );
  },

  delete: async (
    restaurantId: string,
    orderId: string,
    token: string
  ): Promise<ApiResponse<void>> => {
    return apiRequest<void>(
      `/restaurants/${restaurantId}/orders/${orderId}`,
      "DELETE",
      undefined,
      token
    );
  },
};

// Export all API services
export const api = {
  auth: authApi,
  restaurants: restaurantApi,
  menu: menuApi,
  tables: tableApi,
  orders: orderApi,
  syncData: syncWithServer,
};

export default api;
