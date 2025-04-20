
import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ExternalLink, Code } from 'lucide-react';

const ApiDocs = () => {
  const [activeTab, setActiveTab] = useState('auth');

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-2xl font-bold mb-6">Restaurant App API Documentation</h2>
        
        <p className="mb-4">
          This documentation describes the API endpoints required for the 
          Restaurant Management App. Implement these endpoints in your 
          Node.js/Express/MongoDB backend to ensure compatibility.
        </p>
        
        <div className="flex flex-wrap gap-2 mb-6">
          <Button variant="outline" size="sm" className="text-xs">
            <Code className="h-3 w-3 mr-1" /> Node.js
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            <Code className="h-3 w-3 mr-1" /> Express
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            <Code className="h-3 w-3 mr-1" /> MongoDB
          </Button>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="auth">Authentication</TabsTrigger>
            <TabsTrigger value="restaurants">Restaurants</TabsTrigger>
            <TabsTrigger value="menu">Menu</TabsTrigger>
            <TabsTrigger value="tables">Tables</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
          </TabsList>
          
          <div className="py-4">
            <TabsContent value="auth" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Authentication Endpoints</h3>
                
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded mr-2">POST</span>
                        <span className="font-mono text-sm">/api/auth/login</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Login existing user</span>
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Request Body</h4>
                      <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`{
  "email": "user@example.com",
  "password": "password123"
}`}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Response (200 OK)</h4>
                      <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`{
  "success": true,
  "data": {
    "token": "jwt-token-here",
    "user": {
      "id": "user-id-here",
      "name": "User Name",
      "email": "user@example.com",
      "restaurants": [
        {
          "id": "restaurant-id",
          "name": "Restaurant Name",
          "description": "Restaurant Description",
          "logo": "/path/to/logo.png",
          "cuisine": "Italian",
          "address": "123 Main St",
          "phone": "555-1234",
          "tables": 10
        }
      ]
    }
  }
}`}
                      </pre>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded mr-2">POST</span>
                        <span className="font-mono text-sm">/api/auth/register</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Register new user</span>
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Request Body</h4>
                      <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`{
  "name": "New User",
  "email": "newuser@example.com",
  "password": "password123"
}`}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Response (201 Created)</h4>
                      <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`{
  "success": true,
  "data": {
    "token": "jwt-token-here",
    "user": {
      "id": "user-id-here",
      "name": "New User",
      "email": "newuser@example.com",
      "restaurants": []
    }
  }
}`}
                      </pre>
                    </div>
                  </div>
                </div>
                
                {/* Additional auth endpoints would go here */}
                <div className="text-center">
                  <Button variant="outline" size="sm" className="text-xs">
                    View All Auth Endpoints <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="restaurants" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Restaurant Endpoints</h3>
                
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded mr-2">GET</span>
                        <span className="font-mono text-sm">/api/restaurants</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Get user's restaurants</span>
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Headers</h4>
                      <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`Authorization: Bearer jwt-token-here`}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Response (200 OK)</h4>
                      <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`{
  "success": true,
  "data": [
    {
      "id": "restaurant-id",
      "name": "Restaurant Name",
      "description": "Restaurant Description",
      "logo": "/path/to/logo.png",
      "cuisine": "Italian",
      "address": "123 Main St",
      "phone": "555-1234",
      "tables": 10
    }
  ]
}`}
                      </pre>
                    </div>
                  </div>
                </div>
                
                {/* Additional restaurant endpoints would go here */}
                <div className="text-center">
                  <Button variant="outline" size="sm" className="text-xs">
                    View All Restaurant Endpoints <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="menu" className="space-y-6">
              {/* Menu endpoints would go here */}
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-2">Menu endpoints documentation</p>
                <Button variant="outline" size="sm" className="text-xs">
                  View All Menu Endpoints <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="tables" className="space-y-6">
              {/* Table endpoints would go here */}
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-2">Table endpoints documentation</p>
                <Button variant="outline" size="sm" className="text-xs">
                  View All Table Endpoints <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="orders" className="space-y-6">
              {/* Order endpoints would go here */}
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-2">Order endpoints documentation</p>
                <Button variant="outline" size="sm" className="text-xs">
                  View All Order Endpoints <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </TabsContent>
          </div>
        </Tabs>
        
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Need Help?</h3>
          <p className="text-sm mb-4">
            For more detailed API documentation, sample code, and implementation guides, check out the following resources:
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-3 w-3 mr-1" />
              API Reference
            </Button>
            <Button variant="outline" size="sm">
              <ExternalLink className="h-3 w-3 mr-1" />
              Sample Backend Code
            </Button>
            <Button variant="outline" size="sm">
              <ExternalLink className="h-3 w-3 mr-1" />
              Integration Guide
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApiDocs;
