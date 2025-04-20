
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { CheckCircle2, Bot, MessageSquareText, Smartphone, Save, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function WhatsAppBot() {
  const { getCurrentRestaurant } = useAuth();
  const currentRestaurant = getCurrentRestaurant();
  const [botActive, setBotActive] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [orderConfirmation, setOrderConfirmation] = useState('');
  const [reservationMessage, setReservationMessage] = useState('');
  const [isDailySummary, setIsDailySummary] = useState(true);
  const [isAutoReply, setIsAutoReply] = useState(true);
  
  const mockConversation = [
    { id: 1, sender: 'bot', message: 'Hello! Welcome to Potoba Restaurant. How can I help you today?', time: '10:25 AM' },
    { id: 2, sender: 'user', message: 'I want to make a reservation for tonight', time: '10:26 AM' },
    { id: 3, sender: 'bot', message: 'Great! I\'d be happy to help you with that. For how many people would you like to make the reservation?', time: '10:26 AM' },
    { id: 4, sender: 'user', message: '4 people', time: '10:27 AM' },
    { id: 5, sender: 'bot', message: 'Perfect. What time would you prefer for your reservation of 4 people tonight?', time: '10:27 AM' },
    { id: 6, sender: 'user', message: '7:30 PM', time: '10:28 AM' },
    { id: 7, sender: 'bot', message: 'I\'ve checked our availability and we have a table for 4 at 7:30 PM tonight. Would you like me to book this for you?', time: '10:28 AM' },
    { id: 8, sender: 'user', message: 'Yes please', time: '10:29 AM' },
    { id: 9, sender: 'bot', message: 'Great! I\'ve reserved a table for 4 people at 7:30 PM tonight. Could you please provide your name for the reservation?', time: '10:29 AM' },
  ];
  
  const handleConnect = () => {
    if (!apiKey.trim()) {
      toast.error("Please enter your WhatsApp Business API key");
      return;
    }
    
    setIsConnecting(true);
    
    // Mock API connection
    setTimeout(() => {
      setIsConnecting(false);
      setIsConnected(true);
      setBotActive(true);
      toast.success("Successfully connected to WhatsApp Business API");
    }, 1500);
  };
  
  const handleSaveSettings = () => {
    toast.success("Bot settings saved successfully");
  };
  
  const handleToggleBot = (active: boolean) => {
    setBotActive(active);
    toast.success(active ? "WhatsApp bot activated" : "WhatsApp bot deactivated");
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">WhatsApp Bot</h1>
          <p className="text-muted-foreground">
            Configure and manage your restaurant's WhatsApp bot
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Bot Status:</span>
          <Switch
            checked={botActive}
            onCheckedChange={handleToggleBot}
            disabled={!isConnected}
          />
          <span className="text-sm font-medium">
            {botActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
      
      <Tabs defaultValue="setup" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        
        <TabsContent value="setup" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>API Connection</CardTitle>
              <CardDescription>
                Connect to WhatsApp Business API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">WhatsApp Business API Key</Label>
                <Input 
                  id="api-key" 
                  type="password" 
                  placeholder="Enter your API key" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={isConnected}
                />
              </div>
              
              {isConnected ? (
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Connected to WhatsApp Business API</span>
                </div>
              ) : (
                <Button 
                  onClick={handleConnect} 
                  disabled={isConnecting || !apiKey.trim()}
                  className="w-full"
                >
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </Button>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Bot Configuration</CardTitle>
              <CardDescription>
                Configure your WhatsApp bot behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-reply to messages</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically respond to customer messages
                  </p>
                </div>
                <Switch 
                  checked={isAutoReply} 
                  onCheckedChange={setIsAutoReply}
                  disabled={!isConnected}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Daily order summary</Label>
                  <p className="text-sm text-muted-foreground">
                    Send a daily summary of orders to restaurant owner
                  </p>
                </div>
                <Switch 
                  checked={isDailySummary} 
                  onCheckedChange={setIsDailySummary}
                  disabled={!isConnected}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="language">Bot Language</Label>
                <Select defaultValue="en" disabled={!isConnected}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="it">Italian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSaveSettings}
                disabled={!isConnected}
                className="w-full"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Configuration
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="messages" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Bot Messages</CardTitle>
              <CardDescription>
                Customize the messages your bot sends to customers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="welcome">Welcome Message</Label>
                <Textarea 
                  id="welcome" 
                  placeholder="Hello! Welcome to [Restaurant Name]. How can I help you today?" 
                  rows={3}
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  disabled={!isConnected}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="order-confirmation">Order Confirmation</Label>
                <Textarea 
                  id="order-confirmation" 
                  placeholder="Thank you for your order at [Restaurant Name]! Your order #[Order ID] has been received and will be ready in approximately [Time] minutes." 
                  rows={3}
                  value={orderConfirmation}
                  onChange={(e) => setOrderConfirmation(e.target.value)}
                  disabled={!isConnected}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reservation">Reservation Confirmation</Label>
                <Textarea 
                  id="reservation" 
                  placeholder="Your reservation at [Restaurant Name] for [Number] people on [Date] at [Time] has been confirmed. We look forward to seeing you!" 
                  rows={3}
                  value={reservationMessage}
                  onChange={(e) => setReservationMessage(e.target.value)}
                  disabled={!isConnected}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSaveSettings}
                disabled={!isConnected}
                className="w-full"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Messages
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="preview" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Bot Preview</CardTitle>
              <CardDescription>
                Preview how your WhatsApp bot will interact with customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-md mx-auto bg-gray-100 rounded-lg overflow-hidden">
                <div className="bg-green-600 text-white p-3 flex items-center">
                  <Smartphone className="h-5 w-5 mr-2" />
                  <span className="font-medium">WhatsApp Chat</span>
                </div>
                
                <div className="h-96 p-3 overflow-y-auto bg-[url('https://i.pinimg.com/originals/97/c0/07/97c00759d37a486a7a5ffade3fae5e23.jpg')] bg-cover">
                  {mockConversation.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`max-w-[80%] mb-3 ${
                        msg.sender === 'user' 
                          ? 'ml-auto bg-green-100 rounded-tl-lg rounded-tr-lg rounded-bl-lg' 
                          : 'mr-auto bg-white rounded-tr-lg rounded-tl-lg rounded-br-lg'
                      } p-2 px-3 shadow-sm`}
                    >
                      <p className="text-sm">{msg.message}</p>
                      <span className="text-xs text-gray-500 block text-right mt-1">{msg.time}</span>
                    </div>
                  ))}
                </div>
                
                <div className="bg-gray-200 p-3 flex items-center">
                  <Input 
                    placeholder="Type a message" 
                    className="bg-white"
                    disabled={!isConnected}
                  />
                  <Button variant="ghost" size="icon" className="ml-2" disabled={!isConnected}>
                    <MessageSquareText className="h-5 w-5 text-green-600" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
