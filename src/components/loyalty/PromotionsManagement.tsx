
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { BadgePercent, Calendar, Plus, Trash2, Pencil, Check, X, Copy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function PromotionsManagement() {
  const { getCurrentRestaurant } = useAuth();
  const currentRestaurant = getCurrentRestaurant();
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState('');
  const [discountType, setDiscountType] = useState('percentage');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [minPurchase, setMinPurchase] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [isExclusive, setIsExclusive] = useState(false);
  
  // Mock promotions data
  const [promotions, setPromotions] = useState([
    { 
      id: 1, 
      code: 'WELCOME20', 
      discount: '20', 
      discountType: 'percentage', 
      description: '20% off your first order', 
      startDate: '2025-04-01', 
      endDate: '2025-05-31', 
      minPurchase: '25', 
      maxUses: '1', 
      usedCount: 87,
      isActive: true,
      isExclusive: false
    },
    { 
      id: 2, 
      code: 'SUMMER10', 
      discount: '10', 
      discountType: 'percentage', 
      description: 'Summer special discount', 
      startDate: '2025-06-01', 
      endDate: '2025-08-31', 
      minPurchase: '15', 
      maxUses: '0', 
      usedCount: 143,
      isActive: true,
      isExclusive: false
    },
    { 
      id: 3, 
      code: 'LOYAL25', 
      discount: '25', 
      discountType: 'fixed', 
      description: 'Special discount for loyal customers', 
      startDate: '2025-04-01', 
      endDate: '2025-12-31', 
      minPurchase: '100', 
      maxUses: '1', 
      usedCount: 41,
      isActive: true,
      isExclusive: true
    },
  ]);
  
  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPromoCode(result);
  };
  
  const handleCreatePromotion = () => {
    if (!promoCode || !discount || !discountType || !startDate || !endDate) {
      toast.error("Please fill all required fields");
      return;
    }
    
    const newPromotion = {
      id: Math.max(0, ...promotions.map(p => p.id)) + 1,
      code: promoCode,
      discount,
      discountType,
      description,
      startDate,
      endDate,
      minPurchase: minPurchase || '0',
      maxUses: maxUses || '0',
      usedCount: 0,
      isActive: true,
      isExclusive
    };
    
    setPromotions([...promotions, newPromotion]);
    toast.success("Promotion created successfully");
    
    // Reset form
    setPromoCode('');
    setDiscount('');
    setDiscountType('percentage');
    setStartDate('');
    setEndDate('');
    setDescription('');
    setMinPurchase('');
    setMaxUses('');
    setIsExclusive(false);
  };
  
  const handleToggleActive = (id: number) => {
    setPromotions(promotions.map(promo => 
      promo.id === id ? { ...promo, isActive: !promo.isActive } : promo
    ));
    
    const promo = promotions.find(p => p.id === id);
    if (promo) {
      toast.success(`Promotion "${promo.code}" ${promo.isActive ? 'deactivated' : 'activated'}`);
    }
  };
  
  const handleDeletePromotion = (id: number) => {
    setPromotions(promotions.filter(promo => promo.id !== id));
    toast.success("Promotion deleted successfully");
  };
  
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Promo code "${code}" copied to clipboard`);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Promotions Management</h1>
          <p className="text-muted-foreground">
            Create and manage promotional codes for {currentRestaurant?.name || 'your restaurant'}
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Promotion
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Create New Promotion</DialogTitle>
              <DialogDescription>
                Create a new promotional code for your customers.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="promo-code" className="text-right">
                  Promo Code
                </Label>
                <div className="col-span-3 flex gap-2">
                  <Input
                    id="promo-code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    className="flex-1"
                    placeholder="SUMMER25"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={generateRandomCode}
                  >
                    Generate
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="discount-type" className="text-right">
                  Discount Type
                </Label>
                <Select value={discountType} onValueChange={setDiscountType}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select discount type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="discount" className="text-right">
                  {discountType === 'percentage' ? 'Discount %' : 'Discount Amount'}
                </Label>
                <Input
                  id="discount"
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="col-span-3"
                  placeholder={discountType === 'percentage' ? "10" : "25"}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="start-date" className="text-right">
                  Start Date
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="end-date" className="text-right">
                  End Date
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="min-purchase" className="text-right">
                  Min. Purchase
                </Label>
                <Input
                  id="min-purchase"
                  type="number"
                  value={minPurchase}
                  onChange={(e) => setMinPurchase(e.target.value)}
                  className="col-span-3"
                  placeholder="25"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="max-uses" className="text-right">
                  Max Uses/User
                </Label>
                <Input
                  id="max-uses"
                  type="number"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  className="col-span-3"
                  placeholder="1 (0 for unlimited)"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">
                  Loyalty Exclusive
                </Label>
                <div className="flex items-center space-x-2 col-span-3">
                  <Switch
                    id="exclusive-mode"
                    checked={isExclusive}
                    onCheckedChange={setIsExclusive}
                  />
                  <Label htmlFor="exclusive-mode" className="text-sm text-muted-foreground">
                    Only available to loyalty program members
                  </Label>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="col-span-3"
                  placeholder="Describe this promotion"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleCreatePromotion}>Create Promotion</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="active">Active Promotions</TabsTrigger>
          <TabsTrigger value="all">All Promotions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Promotions</CardTitle>
              <CardDescription>
                Currently active promotional codes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 font-medium">
                      <th className="py-3 px-4 text-left">Code</th>
                      <th className="py-3 px-4 text-center">Discount</th>
                      <th className="py-3 px-4 text-left">Description</th>
                      <th className="py-3 px-4 text-center">Valid Until</th>
                      <th className="py-3 px-4 text-center">Min. Purchase</th>
                      <th className="py-3 px-4 text-center">Used</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promotions.filter(p => p.isActive).map((promo) => (
                      <tr key={promo.id} className="border-b">
                        <td className="py-3 px-4 font-medium flex items-center gap-2">
                          <BadgePercent className="h-4 w-4 text-indigo-500" />
                          <span>{promo.code}</span>
                          {promo.isExclusive && (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800">
                              Loyalty
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {promo.discount}{promo.discountType === 'percentage' ? '%' : ' $'}
                        </td>
                        <td className="py-3 px-4 max-w-[200px] truncate">{promo.description}</td>
                        <td className="py-3 px-4 text-center">{promo.endDate}</td>
                        <td className="py-3 px-4 text-center">{promo.minPurchase ? `$${promo.minPurchase}` : 'None'}</td>
                        <td className="py-3 px-4 text-center">{promo.usedCount}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8" 
                              onClick={() => handleCopyCode(promo.code)}
                            >
                              <Copy className="h-4 w-4" />
                              <span className="sr-only">Copy</span>
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-red-500" 
                              onClick={() => handleToggleActive(promo.id)}
                            >
                              <X className="h-4 w-4" />
                              <span className="sr-only">Deactivate</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {promotions.filter(p => p.isActive).length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-muted-foreground">
                          No active promotions found
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
              <CardTitle>All Promotions</CardTitle>
              <CardDescription>
                All promotional codes, active and inactive
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 font-medium">
                      <th className="py-3 px-4 text-left">Code</th>
                      <th className="py-3 px-4 text-center">Discount</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-left">Description</th>
                      <th className="py-3 px-4 text-center">Period</th>
                      <th className="py-3 px-4 text-center">Used</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promotions.map((promo) => (
                      <tr key={promo.id} className="border-b">
                        <td className="py-3 px-4 font-medium flex items-center gap-2">
                          <BadgePercent className="h-4 w-4 text-indigo-500" />
                          <span>{promo.code}</span>
                          {promo.isExclusive && (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800">
                              Loyalty
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {promo.discount}{promo.discountType === 'percentage' ? '%' : ' $'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            promo.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {promo.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-[200px] truncate">{promo.description}</td>
                        <td className="py-3 px-4 text-center text-xs">
                          {promo.startDate} to {promo.endDate}
                        </td>
                        <td className="py-3 px-4 text-center">{promo.usedCount}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8" 
                              onClick={() => handleToggleActive(promo.id)}
                            >
                              {promo.isActive ? (
                                <X className="h-4 w-4 text-red-500" />
                              ) : (
                                <Check className="h-4 w-4 text-green-500" />
                              )}
                              <span className="sr-only">
                                {promo.isActive ? 'Deactivate' : 'Activate'}
                              </span>
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-red-500"
                              onClick={() => handleDeletePromotion(promo.id)}
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
