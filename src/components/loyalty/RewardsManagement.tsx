
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Gift, Plus, Pencil, Trash2, Calendar, Check, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function RewardsManagement() {
  const { getCurrentRestaurant } = useAuth();
  const currentRestaurant = getCurrentRestaurant();
  const [rewardName, setRewardName] = useState('');
  const [rewardType, setRewardType] = useState('discount');
  const [pointsRequired, setPointsRequired] = useState('');
  const [rewardValue, setRewardValue] = useState('');
  const [rewardDescription, setRewardDescription] = useState('');
  const [expiryDays, setExpiryDays] = useState('30');
  
  // Mock rewards data
  const [rewards, setRewards] = useState([
    { id: 1, name: 'Free Dessert', type: 'item', pointsRequired: 100, description: 'Redeem for any dessert on the menu', active: true, value: '1' },
    { id: 2, name: '10% Off', type: 'discount', pointsRequired: 150, description: '10% off your total bill', active: true, value: '10' },
    { id: 3, name: 'Free Appetizer', type: 'item', pointsRequired: 200, description: 'Choose any appetizer for free', active: false, value: '1' },
    { id: 4, name: '25% Off Pizza', type: 'discount', pointsRequired: 250, description: '25% off any pizza', active: true, value: '25' },
  ]);
  
  const handleCreateReward = () => {
    if (!rewardName || !rewardType || !pointsRequired || !rewardValue) {
      toast.error("Please fill all required fields");
      return;
    }
    
    const newReward = {
      id: Math.max(0, ...rewards.map(r => r.id)) + 1,
      name: rewardName,
      type: rewardType,
      pointsRequired: parseInt(pointsRequired),
      value: rewardValue,
      description: rewardDescription,
      active: true,
    };
    
    setRewards([...rewards, newReward]);
    toast.success("Reward created successfully");
    
    // Reset form
    setRewardName('');
    setRewardType('discount');
    setPointsRequired('');
    setRewardValue('');
    setRewardDescription('');
  };
  
  const handleToggleActive = (id: number) => {
    setRewards(rewards.map(reward => 
      reward.id === id ? { ...reward, active: !reward.active } : reward
    ));
    
    const reward = rewards.find(r => r.id === id);
    if (reward) {
      toast.success(`Reward "${reward.name}" ${reward.active ? 'deactivated' : 'activated'}`);
    }
  };
  
  const handleDeleteReward = (id: number) => {
    setRewards(rewards.filter(reward => reward.id !== id));
    toast.success("Reward deleted successfully");
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rewards Management</h1>
          <p className="text-muted-foreground">
            Create and manage loyalty rewards for {currentRestaurant?.name || 'your restaurant'}
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Reward
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Create New Reward</DialogTitle>
              <DialogDescription>
                Create a new loyalty reward for your customers.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="reward-name" className="text-right">
                  Reward Name
                </Label>
                <Input
                  id="reward-name"
                  value={rewardName}
                  onChange={(e) => setRewardName(e.target.value)}
                  className="col-span-3"
                  placeholder="Free Dessert"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="reward-type" className="text-right">
                  Reward Type
                </Label>
                <Select value={rewardType} onValueChange={setRewardType}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select reward type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discount">Discount</SelectItem>
                    <SelectItem value="item">Free Item</SelectItem>
                    <SelectItem value="bogo">Buy One Get One</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="points-required" className="text-right">
                  Points Required
                </Label>
                <Input
                  id="points-required"
                  type="number"
                  value={pointsRequired}
                  onChange={(e) => setPointsRequired(e.target.value)}
                  className="col-span-3"
                  placeholder="100"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="reward-value" className="text-right">
                  {rewardType === 'discount' ? 'Discount %' : 'Item Quantity'}
                </Label>
                <Input
                  id="reward-value"
                  type="text"
                  value={rewardValue}
                  onChange={(e) => setRewardValue(e.target.value)}
                  className="col-span-3"
                  placeholder={rewardType === 'discount' ? "10" : "1"}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="expiry-days" className="text-right">
                  Expiry (Days)
                </Label>
                <Input
                  id="expiry-days"
                  type="number"
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(e.target.value)}
                  className="col-span-3"
                  placeholder="30"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="reward-description" className="text-right">
                  Description
                </Label>
                <Input
                  id="reward-description"
                  value={rewardDescription}
                  onChange={(e) => setRewardDescription(e.target.value)}
                  className="col-span-3"
                  placeholder="Describe the reward"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleCreateReward}>Create Reward</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="active">Active Rewards</TabsTrigger>
          <TabsTrigger value="all">All Rewards</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Rewards</CardTitle>
              <CardDescription>
                Currently active rewards that customers can redeem
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 font-medium">
                      <th className="py-3 px-4 text-left">Reward</th>
                      <th className="py-3 px-4 text-center">Type</th>
                      <th className="py-3 px-4 text-center">Points</th>
                      <th className="py-3 px-4 text-left">Description</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rewards.filter(r => r.active).map((reward) => (
                      <tr key={reward.id} className="border-b">
                        <td className="py-3 px-4 font-medium">{reward.name}</td>
                        <td className="py-3 px-4 text-center capitalize">
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-800">
                            {reward.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">{reward.pointsRequired}</td>
                        <td className="py-3 px-4">{reward.description}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-red-500" 
                              onClick={() => handleToggleActive(reward.id)}
                            >
                              <X className="h-4 w-4" />
                              <span className="sr-only">Deactivate</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {rewards.filter(r => r.active).length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-muted-foreground">
                          No active rewards found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="all" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>All Rewards</CardTitle>
              <CardDescription>
                All rewards in your loyalty program
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 font-medium">
                      <th className="py-3 px-4 text-left">Reward</th>
                      <th className="py-3 px-4 text-center">Type</th>
                      <th className="py-3 px-4 text-center">Points</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-left">Description</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rewards.map((reward) => (
                      <tr key={reward.id} className="border-b">
                        <td className="py-3 px-4 font-medium">{reward.name}</td>
                        <td className="py-3 px-4 text-center capitalize">
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-800">
                            {reward.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">{reward.pointsRequired}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            reward.active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {reward.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4">{reward.description}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8" 
                              onClick={() => handleToggleActive(reward.id)}
                            >
                              {reward.active ? (
                                <X className="h-4 w-4 text-red-500" />
                              ) : (
                                <Check className="h-4 w-4 text-green-500" />
                              )}
                              <span className="sr-only">
                                {reward.active ? 'Deactivate' : 'Activate'}
                              </span>
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-red-500"
                              onClick={() => handleDeleteReward(reward.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
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
