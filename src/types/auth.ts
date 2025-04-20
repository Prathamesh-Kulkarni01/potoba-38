
export interface User {
  id: string;
  _id?: string; // MongoDB ID format support
  email: string;
  name?: string;
  role?: 'user' | 'admin' | 'manager' | 'staff';
  permissions?: string[];
  restaurants?: Restaurant[];
}

export interface Restaurant {
  id: string;
  _id?: string; // MongoDB ID format support
  name?: string;
  logo?: string;
  description?: string;
  address?: string;
  phone?: string;
  cuisine?: string;
  tables?: number;
}

export interface AuthResponse {
  data: {
    token: string;
    user: User;
  };
}
