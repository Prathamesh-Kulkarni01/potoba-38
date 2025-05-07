import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
        <ShieldAlert className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-gray-600 mb-6">
          You don't have access to this restaurant. Please contact the restaurant administrator for access.
        </p>
        <div className="space-x-4">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
          >
            Go Back
          </Button>
          <Button
            onClick={() => navigate('/dashboard')}
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized; 