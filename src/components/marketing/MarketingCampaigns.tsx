
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Image as ImageIcon, Send, Calendar, Users, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function MarketingCampaigns() {
  const { getCurrentRestaurant } = useAuth();
  const currentRestaurant = getCurrentRestaurant();
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [posterPrompt, setPosterPrompt] = useState('');
  const [generatedPosterUrl, setGeneratedPosterUrl] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState('');
  const [campaignType, setCampaignType] = useState('email');
  const [campaignDate, setCampaignDate] = useState('');
  const [campaignMessage, setCampaignMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // Mock campaigns data
  const mockCampaigns = [
    { id: 1, name: "Summer Special", type: "email", status: "Active", reach: 523, date: "2025-06-15" },
    { id: 2, name: "Weekend Brunch", type: "sms", status: "Scheduled", reach: 312, date: "2025-05-03" },
    { id: 3, name: "New Menu Launch", type: "whatsapp", status: "Completed", reach: 687, date: "2025-04-10" },
  ];
  
  const handleGeneratePoster = () => {
    if (!posterPrompt.trim()) {
      toast.error("Please enter a description for your poster");
      return;
    }
    
    // Mock AI poster generation
    setIsGeneratingPoster(true);
    
    setTimeout(() => {
      // In a real app, this would call an AI image generation API
      const mockPosters = [
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836",
        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5",
        "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe",
      ];
      
      const randomPoster = mockPosters[Math.floor(Math.random() * mockPosters.length)];
      setGeneratedPosterUrl(randomPoster);
      setIsGeneratingPoster(false);
      toast.success("Poster generated successfully!");
    }, 2500);
  };
  
  const handleSendCampaign = () => {
    if (!campaignName || !campaignType || !campaignDate || !campaignMessage) {
      toast.error("Please fill all required fields");
      return;
    }
    
    setIsSending(true);
    
    // Mock sending campaign
    setTimeout(() => {
      setIsSending(false);
      toast.success("Campaign scheduled successfully!");
      
      // Reset form fields
      setCampaignName('');
      setCampaignType('email');
      setCampaignDate('');
      setCampaignMessage('');
      setGeneratedPosterUrl(null);
      setPosterPrompt('');
    }, 1500);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Marketing Campaigns</h1>
          <p className="text-muted-foreground">
            Create and manage marketing campaigns for {currentRestaurant?.name || 'your restaurant'}
          </p>
        </div>
      </div>
      
      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="create">Create Campaign</TabsTrigger>
          <TabsTrigger value="history">Campaign History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="create" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Details</CardTitle>
                <CardDescription>
                  Set up your marketing campaign information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Campaign Name</Label>
                  <Input 
                    id="name" 
                    placeholder="Summer Special Offer" 
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Campaign Type</Label>
                  <Select value={campaignType} onValueChange={setCampaignType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select campaign type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="push">Push Notification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="date">Schedule Date</Label>
                  <div className="flex">
                    <Input 
                      id="date" 
                      type="date" 
                      value={campaignDate}
                      onChange={(e) => setCampaignDate(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="message">Campaign Message</Label>
                  <Textarea 
                    id="message" 
                    placeholder="Enter your campaign message here..." 
                    rows={4}
                    value={campaignMessage}
                    onChange={(e) => setCampaignMessage(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>AI Poster Generator</CardTitle>
                <CardDescription>
                  Generate campaign visuals with AI
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="prompt">Describe Your Poster</Label>
                  <Textarea 
                    id="prompt" 
                    placeholder="A delicious plate of pasta with tomato sauce, basil, and parmesan cheese on a rustic wooden table" 
                    rows={4}
                    value={posterPrompt}
                    onChange={(e) => setPosterPrompt(e.target.value)}
                  />
                </div>
                
                <Button 
                  onClick={handleGeneratePoster} 
                  disabled={isGeneratingPoster || !posterPrompt.trim()}
                  className="w-full"
                >
                  {isGeneratingPoster ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Generate Poster
                    </>
                  )}
                </Button>
                
                {generatedPosterUrl && (
                  <div className="mt-4">
                    <Label className="mb-2 block">Generated Poster</Label>
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                      <img 
                        src={generatedPosterUrl} 
                        alt="Generated poster" 
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  onClick={handleSendCampaign}
                  disabled={isSending || !campaignName || !campaignType || !campaignDate || !campaignMessage}
                >
                  {isSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Schedule Campaign
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign History</CardTitle>
              <CardDescription>
                View and manage your previous marketing campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 font-medium">
                      <th className="py-3 px-4 text-left">Campaign</th>
                      <th className="py-3 px-4 text-left">Type</th>
                      <th className="py-3 px-4 text-left">Status</th>
                      <th className="py-3 px-4 text-left">Date</th>
                      <th className="py-3 px-4 text-center">Reach</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockCampaigns.map((campaign) => (
                      <tr key={campaign.id} className="border-b">
                        <td className="py-3 px-4">{campaign.name}</td>
                        <td className="py-3 px-4 capitalize">{campaign.type}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            campaign.status === 'Active' 
                              ? 'bg-green-100 text-green-800' 
                              : campaign.status === 'Scheduled' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {campaign.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">{campaign.date}</td>
                        <td className="py-3 px-4 text-center">{campaign.reach}</td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="ghost" size="sm">View</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
