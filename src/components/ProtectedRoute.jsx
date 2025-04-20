
import { Navigate, Outlet } from 'react-router-dom';
import { isAuthenticated, hasRole } from '../utils/auth';

const ProtectedRoute = ({ requiredRole }) => {
  const authenticated = isAuthenticated();
  
  // If not authenticated, redirect to login
  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // If role is required and user doesn't have it, redirect to unauthorized page
  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  // User is authenticated and has the required role (or no specific role is required)
  return <Outlet />;
};

export default ProtectedRoute;
