
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext';

const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="max-w-3xl text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">Restaurant Management Platform</h1>
        <p className="text-xl text-gray-600 mb-10">
          The easy way to manage your restaurant business - menus, tables, orders, and more.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {isAuthenticated ? (
            <Link to="/dashboard">
              <Button size="lg">Go to Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button size="lg">Sign In</Button>
              </Link>
              <Link to="/register">
                <Button size="lg" variant="outline">Create Account</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
