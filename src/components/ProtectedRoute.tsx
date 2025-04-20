
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  requiredPermission?: string;
  requiredRole?: string;
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  requiredPermission, 
  requiredRole, 
  children 
}) => {
  const { user, isAuthenticated } = useAuth();

  // Check if user is authenticated
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  // If a specific role is required, check it
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  // If a specific permission is required, check it
  if (requiredPermission && 
      !user?.permissions?.includes(requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // If children are provided, render them; otherwise, render Outlet
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
