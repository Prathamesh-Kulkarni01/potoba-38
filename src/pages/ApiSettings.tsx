
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Server, Save, CheckCircle } from 'lucide-react';

const ApiSettings = () => {
  const [apiUrl, setApiUrl] = useState<string>(localStorage.getItem('apiBaseUrl') || 'http://localhost:5000/api');
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  const saveApiSettings = () => {
    try {
      localStorage.setItem('apiBaseUrl', apiUrl);
      toast({
        description: "API settings saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save API settings.",
        variant: "destructive",
      });
    }
  };

  const testConnection = async () => {
    setTestStatus('loading');
    try {
      // This would be a real test when you have your backend
      // For now, we'll just simulate a network request
      const response = await fetch(`${apiUrl}/health-check`, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        setTestStatus('success');
        toast({
          description: "Connection successful!",
        });
      } else {
        setTestStatus('error');
        toast({
          title: "Connection Error",
          description: "Could not connect to the API server.",
          variant: "destructive",
        });
      }
    } catch (error) {
      setTestStatus('error');
      toast({
        title: "Connection Error",
        description: "Could not connect to the API server. Please check the URL and ensure your server is running.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">MongoDB/Express API Settings</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Server className="mr-2 h-5 w-5" /> 
            API Connection Configuration
          </CardTitle>
          <CardDescription>
            Configure your connection to your Node.js/Express/MongoDB backend
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-url">API Base URL</Label>
            <Input
              id="api-url"
              placeholder="http://localhost:5000/api"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              This is the base URL of your Node/Express backend API
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={saveApiSettings}
              className="flex-1"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </Button>
            <Button
              onClick={testConnection}
              variant="outline"
              className="flex-1"
              disabled={testStatus === 'loading'}
            >
              {testStatus === 'loading' ? (
                <>Testing connection...</>
              ) : testStatus === 'success' ? (
                <><CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Connected</>
              ) : (
                <>Test Connection</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>MongoDB/Express Backend Setup Instructions</CardTitle>
          <CardDescription>
            Follow these steps to set up your backend server
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-md overflow-auto">
            <pre className="text-xs md:text-sm">
{`// 1. Create a new folder for your backend
mkdir restaurant-app-backend
cd restaurant-app-backend

// 2. Initialize a new Node.js project
npm init -y

// 3. Install dependencies
npm install express mongoose cors dotenv jsonwebtoken bcrypt

// 4. Create a basic server structure:
// - server.js (main entry point)
// - routes/ (API routes)
// - models/ (Mongoose models)
// - controllers/ (route handlers)
// - middleware/ (auth middleware, etc.)

// 5. Set up MongoDB connection
// 6. Implement authentication endpoints
// 7. Create API endpoints for restaurants, menu items, tables, and orders

// 8. Run your server
npm start`}
            </pre>
          </div>
          
          <p className="text-sm">
            Once your backend is set up and running, update the API Base URL above to point to your server.
            Make sure to implement the API endpoints according to the patterns used in the frontend code.
          </p>
          
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <p className="text-sm font-medium text-yellow-800">
              Note: The frontend is already designed to work with a specific API structure. 
              Your backend should implement the following endpoint patterns:
            </p>
            <ul className="text-xs text-yellow-700 list-disc ml-5 mt-2 space-y-1">
              <li><code>/api/auth/login</code> - POST request for user login</li>
              <li><code>/api/auth/register</code> - POST request for user registration</li>
              <li><code>/api/restaurants</code> - GET/POST endpoints for restaurants</li>
              <li><code>/api/restaurants/:id/menu</code> - Endpoints for menu items</li>
              <li><code>/api/restaurants/:id/tables</code> - Endpoints for tables</li>
              <li><code>/api/restaurants/:id/orders</code> - Endpoints for orders</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiSettings;
