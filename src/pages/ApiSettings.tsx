import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Server, Save, Globe, Code, Webhook, Database, FileJson, RefreshCw, CloudOff, CloudSync, CheckCircle, XCircle } from 'lucide-react';
import { ApiConnectionStatus } from '@/components/ApiConnectionStatus';
import { Switch } from "@/components/ui/switch";

const ApiSettings = () => {
  const [apiUrl, setApiUrl] = useState<string>(localStorage.getItem('apiBaseUrl') || 'http://localhost:5000/api');
  const [mongoUrl, setMongoUrl] = useState<string>(localStorage.getItem('mongoUrl') || 'mongodb://localhost:27017/restaurant-app');
  const [port, setPort] = useState<string>(localStorage.getItem('apiPort') || '5000');
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [offlineMode, setOfflineMode] = useState<boolean>(localStorage.getItem('offlineMode') === 'true');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  useEffect(() => {
    const checkConnection = async () => {
      if (localStorage.getItem('connectionTested') === 'true') {
        await testConnection();
      }
    };
    
    checkConnection();
  }, []);

  const saveApiSettings = () => {
    try {
      localStorage.setItem('apiBaseUrl', apiUrl);
      localStorage.setItem('mongoUrl', mongoUrl);
      localStorage.setItem('apiPort', port);
      localStorage.setItem('offlineMode', offlineMode.toString());
      
      toast({
        description: "API settings saved successfully. Please restart your Node.js server with these settings.",
      });
      
      testConnection();
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
      const healthCheckUrl = offlineMode 
        ? 'http://localhost:' + port + '/api/health-check'
        : apiUrl.endsWith('/') 
          ? `${apiUrl}health-check` 
          : `${apiUrl}/health-check`;
      
      const response = await fetch(healthCheckUrl, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        setTestStatus('success');
        localStorage.setItem('connectionTested', 'true');
        toast({
          description: `Connection successful! Your ${offlineMode ? 'local' : 'remote'} MongoDB backend is running.`,
        });
      } else {
        setTestStatus('error');
        localStorage.setItem('connectionTested', 'false');
        toast({
          title: "Connection Error",
          description: `Could not connect to the ${offlineMode ? 'local' : 'remote'} API server. Please check your server is running.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      setTestStatus('error');
      localStorage.setItem('connectionTested', 'false');
      toast({
        title: "Connection Error",
        description: `Could not connect to the ${offlineMode ? 'local' : 'remote'} API server. Please check the URL and ensure your server is running.`,
        variant: "destructive",
      });
    }
  };

  const toggleOfflineMode = (value: boolean) => {
    setOfflineMode(value);
    localStorage.setItem('offlineMode', value.toString());
    
    toast({
      description: `Switched to ${value ? 'offline' : 'online'} mode. Settings will apply after saving.`,
    });
  };

  const syncDatabases = async () => {
    setSyncStatus('syncing');
    try {
      const syncEndpoint = apiUrl.endsWith('/') 
        ? `${apiUrl}sync-databases` 
        : `${apiUrl}/sync-databases`;
      
      const response = await fetch(syncEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          localMongoUrl: 'mongodb://localhost:27017/restaurant-app',
          remoteMongoUrl: mongoUrl 
        })
      });
      
      if (response.ok) {
        setSyncStatus('success');
        toast({
          description: "Databases synchronized successfully!",
        });
      } else {
        setSyncStatus('error');
        toast({
          title: "Sync Error",
          description: "Failed to synchronize databases. Check server logs for details.",
          variant: "destructive",
        });
      }
    } catch (error) {
      setSyncStatus('error');
      toast({
        title: "Sync Error",
        description: "Failed to synchronize databases. Make sure both servers are running.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">API Settings & Backend Configuration</h1>
      
      <Tabs defaultValue="settings">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="settings">API Settings</TabsTrigger>
          <TabsTrigger value="docs">API Documentation</TabsTrigger>
          <TabsTrigger value="setup">Backend Setup</TabsTrigger>
        </TabsList>
        
        <TabsContent value="settings">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Server className="mr-2 h-5 w-5" /> 
                Node.js & MongoDB Configuration
              </CardTitle>
              <CardDescription>
                Configure your connection to your Node.js/Express/MongoDB backend
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between space-x-2 p-4 border rounded-md bg-muted/20">
                <div className="space-y-0.5">
                  <div className="flex items-center">
                    {offlineMode ? (
                      <CloudOff className="mr-2 h-4 w-4 text-amber-500" />
                    ) : (
                      <Globe className="mr-2 h-4 w-4 text-green-500" />
                    )}
                    <Label htmlFor="offline-mode" className="font-medium">
                      {offlineMode ? 'Offline Mode' : 'Online Mode'}
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {offlineMode 
                      ? 'Working with local MongoDB database only' 
                      : 'Connected to remote MongoDB database'}
                  </p>
                </div>
                <Switch
                  id="offline-mode"
                  checked={offlineMode}
                  onCheckedChange={toggleOfflineMode}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-url">
                  {offlineMode ? 'Local API Base URL' : 'Remote API Base URL'}
                </Label>
                <Input
                  id="api-url"
                  placeholder={offlineMode ? "http://localhost:5000/api" : "https://your-remote-server.com/api"}
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  {offlineMode 
                    ? 'The base URL of your local Node/Express backend API'
                    : 'The base URL of your remote Node/Express backend API'}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="mongo-url">
                  {offlineMode ? 'Local MongoDB Connection String' : 'Remote MongoDB Connection String'}
                </Label>
                <Input
                  id="mongo-url"
                  placeholder={offlineMode ? "mongodb://localhost:27017/restaurant-app" : "mongodb+srv://username:password@cluster.mongodb.net/restaurant-app"}
                  value={mongoUrl}
                  onChange={(e) => setMongoUrl(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  The MongoDB connection URL for your {offlineMode ? 'local' : 'remote'} Node.js server
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="port">API Server Port</Label>
                <Input
                  id="port"
                  placeholder="5000"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  The port your Node.js server is running on
                </p>
              </div>
              
              <div className="pt-2">
                <ApiConnectionStatus status={testStatus} />
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
                  <RefreshCw className={`mr-2 h-4 w-4 ${testStatus === 'loading' ? 'animate-spin' : ''}`} />
                  Test Connection
                </Button>
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="font-medium mb-2 flex items-center">
                  <CloudSync className="mr-2 h-5 w-5" />
                  Database Synchronization
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Synchronize data between your local and remote MongoDB databases
                </p>
                
                <div className="bg-muted/30 p-4 rounded-md">
                  <div className="mb-4">
                    <p className="text-sm">
                      When working offline, your data is stored locally. Use synchronization to push local changes to your remote database or pull remote changes to your local database.
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      {syncStatus === 'syncing' && (
                        <span className="flex items-center text-amber-500">
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Synchronizing...
                        </span>
                      )}
                      {syncStatus === 'success' && (
                        <span className="flex items-center text-green-500">
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Sync completed
                        </span>
                      )}
                      {syncStatus === 'error' && (
                        <span className="flex items-center text-destructive">
                          <XCircle className="mr-2 h-4 w-4" />
                          Sync failed
                        </span>
                      )}
                    </div>
                    <Button 
                      onClick={syncDatabases}
                      variant="outline"
                      disabled={syncStatus === 'syncing' || testStatus !== 'success'}
                    >
                      <CloudSync className="mr-2 h-4 w-4" />
                      Sync Databases
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="mr-2 h-5 w-5" /> 
                API Status
              </CardTitle>
              <CardDescription>
                Current connection and server status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-md">
                    <h3 className="font-medium mb-2">Backend Server</h3>
                    <ApiConnectionStatus status={testStatus} />
                  </div>
                  
                  <div className="p-4 border rounded-md">
                    <h3 className="font-medium mb-2">API Mode</h3>
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${offlineMode ? 'bg-amber-500' : localStorage.getItem('connectionTested') === 'true' ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                      <span>{offlineMode ? 'Offline Mode' : localStorage.getItem('connectionTested') === 'true' ? 'Online Mode' : 'Not Connected'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="docs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileJson className="mr-2 h-5 w-5" />
                API Documentation
              </CardTitle>
              <CardDescription>
                Complete documentation for all available API endpoints
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs defaultValue="auth">
                <TabsList className="w-full mb-4">
                  <TabsTrigger value="auth">Authentication</TabsTrigger>
                  <TabsTrigger value="restaurants">Restaurants</TabsTrigger>
                  <TabsTrigger value="menu">Menu Items</TabsTrigger>
                  <TabsTrigger value="tables">Tables</TabsTrigger>
                  <TabsTrigger value="orders">Orders</TabsTrigger>
                </TabsList>
                
                <TabsContent value="auth" className="space-y-4">
                  <div className="bg-muted/30 p-4 rounded-md space-y-2">
                    <h3 className="font-medium">POST /api/auth/login</h3>
                    <p className="text-sm text-muted-foreground">Authenticate a user and receive a JWT token</p>
                    <div className="mt-2">
                      <h4 className="text-sm font-medium">Request Body:</h4>
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
{`{
  "email": "user@example.com",
  "password": "password123"
}`}
                      </pre>
                    </div>
                    <div className="mt-2">
                      <h4 className="text-sm font-medium">Response:</h4>
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
{`{
  "success": true,
  "data": {
    "user": {
      "id": "user-123",
      "name": "User Name",
      "email": "user@example.com",
      "restaurants": [...]
    },
    "token": "jwt-token-here"
  }
}`}
                      </pre>
                    </div>
                  </div>
                  
                  <div className="bg-muted/30 p-4 rounded-md space-y-2">
                    <h3 className="font-medium">POST /api/auth/register</h3>
                    <p className="text-sm text-muted-foreground">Register a new user account</p>
                    <div className="mt-2">
                      <h4 className="text-sm font-medium">Request Body:</h4>
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
{`{
  "name": "New User",
  "email": "newuser@example.com",
  "password": "password123"
}`}
                      </pre>
                    </div>
                    <div className="mt-2">
                      <h4 className="text-sm font-medium">Response:</h4>
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
{`{
  "success": true,
  "data": {
    "user": {
      "id": "user-123",
      "name": "New User",
      "email": "newuser@example.com",
      "restaurants": []
    },
    "token": "jwt-token-here"
  }
}`}
                      </pre>
                    </div>
                  </div>
                  
                  <div className="bg-muted/30 p-4 rounded-md space-y-2">
                    <h3 className="font-medium">POST /api/auth/logout</h3>
                    <p className="text-sm text-muted-foreground">Log out the current user</p>
                    <div className="mt-2">
                      <h4 className="text-sm font-medium">Response:</h4>
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
{`{
  "success": true
}`}
                      </pre>
                    </div>
                  </div>
                  
                  <div className="bg-muted/30 p-4 rounded-md space-y-2">
                    <h3 className="font-medium">GET /api/auth/me</h3>
                    <p className="text-sm text-muted-foreground">Get the current user's profile</p>
                    <div className="mt-2">
                      <h4 className="text-sm font-medium">Headers:</h4>
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
{`Authorization: Bearer jwt-token-here`}
                      </pre>
                    </div>
                    <div className="mt-2">
                      <h4 className="text-sm font-medium">Response:</h4>
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
{`{
  "success": true,
  "data": {
    "user": {
      "id": "user-123",
      "name": "User Name",
      "email": "user@example.com",
      "restaurants": [...]
    }
  }
}`}
                      </pre>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="restaurants" className="space-y-4">
                  <div className="bg-muted/30 p-4 rounded-md space-y-2">
                    <h3 className="font-medium">GET /api/restaurants</h3>
                    <p className="text-sm text-muted-foreground">Get all restaurants owned by the current user</p>
                    <div className="mt-2">
                      <h4 className="text-sm font-medium">Headers:</h4>
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
{`Authorization: Bearer jwt-token-here`}
                      </pre>
                    </div>
                    <div className="mt-2">
                      <h4 className="text-sm font-medium">Response:</h4>
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
{`{
  "success": true,
  "data": [
    {
      "id": "rest-123",
      "name": "Restaurant Name",
      "description": "Restaurant description",
      "cuisine": "Italian",
      "tables": 10,
      ...
    }
  ]
}`}
                      </pre>
                    </div>
                  </div>
                  
                  <div className="text-center py-2">
                    <Button variant="link" onClick={() => window.open('/api-docs.pdf')}>
                      View Complete Restaurant API Documentation
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="menu" className="space-y-4">
                  <div className="bg-muted/30 p-4 rounded-md space-y-2">
                    <h3 className="font-medium">GET /api/restaurants/:restaurantId/menu</h3>
                    <p className="text-sm text-muted-foreground">Get all menu items for a restaurant</p>
                    <div className="mt-2">
                      <h4 className="text-sm font-medium">Headers:</h4>
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
{`Authorization: Bearer jwt-token-here`}
                      </pre>
                    </div>
                    <div className="mt-2">
                      <h4 className="text-sm font-medium">Response:</h4>
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
{`{
  "success": true,
  "data": [
    {
      "id": "item-123",
      "name": "Pasta Carbonara",
      "description": "Creamy pasta with bacon",
      "price": 12.99,
      "category": "Main Courses",
      "image": "/uploads/pasta.jpg",
      "restaurantId": "rest-123"
    }
  ]
}`}
                      </pre>
                    </div>
                  </div>
                  
                  <div className="text-center py-2">
                    <Button variant="link" onClick={() => window.open('/api-docs.pdf')}>
                      View Complete Menu API Documentation
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="tables" className="space-y-4">
                  <div className="bg-muted/30 p-4 rounded-md space-y-2">
                    <h3 className="font-medium">GET /api/restaurants/:restaurantId/tables</h3>
                    <p className="text-sm text-muted-foreground">Get all tables for a restaurant</p>
                    <div className="mt-2">
                      <h4 className="text-sm font-medium">Headers:</h4>
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
{`Authorization: Bearer jwt-token-here`}
                      </pre>
                    </div>
                    <div className="mt-2">
                      <h4 className="text-sm font-medium">Response:</h4>
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
{`{
  "success": true,
  "data": [
    {
      "id": "table-123",
      "number": 1,
      "capacity": 4,
      "status": "available",
      "restaurantId": "rest-123"
    }
  ]
}`}
                      </pre>
                    </div>
                  </div>
                  
                  <div className="text-center py-2">
                    <Button variant="link" onClick={() => window.open('/api-docs.pdf')}>
                      View Complete Tables API Documentation
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="orders" className="space-y-4">
                  <div className="bg-muted/30 p-4 rounded-md space-y-2">
                    <h3 className="font-medium">GET /api/restaurants/:restaurantId/orders</h3>
                    <p className="text-sm text-muted-foreground">Get all orders for a restaurant</p>
                    <div className="mt-2">
                      <h4 className="text-sm font-medium">Headers:</h4>
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
{`Authorization: Bearer jwt-token-here`}
                      </pre>
                    </div>
                    <div className="mt-2">
                      <h4 className="text-sm font-medium">Response:</h4>
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
{`{
  "success": true,
  "data": [
    {
      "id": "order-123",
      "tableId": "table-123",
      "status": "in-progress",
      "items": [
        {
          "menuItemId": "item-123",
          "name": "Pasta Carbonara",
          "price": 12.99,
          "quantity": 2
        }
      ],
      "total": 25.98,
      "createdAt": "2025-04-06T12:00:00Z",
      "restaurantId": "rest-123"
    }
  ]
}`}
                      </pre>
                    </div>
                  </div>
                  
                  <div className="text-center py-2">
                    <Button variant="link" onClick={() => window.open('/api-docs.pdf')}>
                      View Complete Orders API Documentation
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="setup">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="mr-2 h-5 w-5" />
                Backend Setup Instructions
              </CardTitle>
              <CardDescription>
                Follow these steps to set up your Node.js/Express/MongoDB backend server
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

// 4. Create a sample server structure:
mkdir -p src/{routes,controllers,models,middleware,config}
touch src/server.js src/config/db.js src/middleware/auth.js

// 5. Setup MongoDB connection
// In src/config/db.js:
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;

// 6. Create a basic server setup
// In src/server.js:
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/restaurants', require('./routes/restaurants'));
// Add other routes here

// Health check endpoint
app.get('/api/health-check', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));

// 7. Create .env file
// .env
MONGO_URI=mongodb://localhost:27017/restaurant-app
JWT_SECRET=your-secret-key

// 8. Run your server
npm start`}
                </pre>
              </div>
              
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                <p className="text-sm font-medium text-yellow-800">
                  Important: API Structure Requirements
                </p>
                <p className="text-xs text-yellow-700 mt-2">
                  Your Express/MongoDB backend must implement the following API structure to be compatible with this frontend application:
                </p>
                <ul className="text-xs text-yellow-700 list-disc ml-5 mt-2 space-y-1">
                  <li>Authentication endpoints at <code>/api/auth/login</code>, <code>/api/auth/register</code>, etc.</li>
                  <li>Restaurant endpoints at <code>/api/restaurants</code></li>
                  <li>Menu items endpoints at <code>/api/restaurants/:id/menu</code></li>
                  <li>Table endpoints at <code>/api/restaurants/:id/tables</code></li>
                  <li>Order endpoints at <code>/api/restaurants/:id/orders</code></li>
                </ul>
              </div>
              
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">Required Models</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium">User Model</h4>
                    <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
{`const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);`}
                    </pre>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium">Restaurant Model</h4>
                    <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
{`const mongoose = require('mongoose');

const RestaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  logo: String,
  cuisine: String,
  address: String,
  phone: String,
  tables: Number,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Restaurant', RestaurantSchema);`}
                    </pre>
                  </div>
                  
                  <Button variant="outline" className="w-full" onClick={() => window.open('/backend-starter.zip')}>
                    Download Complete Backend Starter Code
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ApiSettings;
