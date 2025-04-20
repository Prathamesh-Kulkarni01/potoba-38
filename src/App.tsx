
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

// Pages
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import CreateRestaurantPage from '@/pages/CreateRestaurantPage';
import RestaurantDetailsPage from '@/pages/RestaurantDetailsPage';
import NotFoundPage from '@/pages/NotFoundPage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
          <Route path="/restaurants/create" element={
            <ProtectedRoute>
              <CreateRestaurantPage />
            </ProtectedRoute>
          } />
          <Route path="/restaurants/:id" element={
            <ProtectedRoute>
              <RestaurantDetailsPage />
            </ProtectedRoute>
          } />
          
          {/* Fallback route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </Router>
  );
}

export default App;
