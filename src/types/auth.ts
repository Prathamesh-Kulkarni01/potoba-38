
export interface User {
  id: string;
  email: string;
  name?: string;
  role?: 'user' | 'admin' | 'manager' | 'staff';
  permissions?: string[];
  restaurants?: Restaurant[];
}

export interface Restaurant {
  id: string;
  name: string;
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
