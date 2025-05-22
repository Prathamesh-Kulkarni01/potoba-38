// src/app/dashboard/restaurant/[restaurantId]/settings/page.tsx
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Globe, ExternalLink, Construction } from "lucide-react"; // Added Construction for placeholder
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { useEffect, useState, useCallback } from "react";
import { getRestaurant, updateRestaurantProfile } from "@/lib/firebase/firestore"; 
import type { RestaurantProfile, TaxConfig } from "@/types";
import LoadingSpinner from "@/components/shared/loading-spinner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { PlusCircle, Edit3, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getMenuCategories, getMenuItems, updateMenuCategory, updateMenuItem } from '@/lib/firebase/menu';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MultiSelect } from '@/components/ui/multiselect';

export default function RestaurantSettingsPage() {
  const params = useParams();
  const restaurantId = params.restaurantId as string;
  const { user, role } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Form state
  const [onlineOrderingEnabled, setOnlineOrderingEnabled] = useState(false);
  const [tableReservationsEnabled, setTableReservationsEnabled] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [showAddTaxModal, setShowAddTaxModal] = useState(false);
  const [editingTax, setEditingTax] = useState<TaxConfig | null>(null);
  const [taxForm, setTaxForm] = useState({
    name: '',
    rate: 0,
    type: 'percentage',
    isInclusive: false,
    isDefault: false
  });
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [taxAssignLoading, setTaxAssignLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!restaurantId) {
      toast({ variant: "destructive", title: "Error", description: "Restaurant ID is missing."});
      router.push('/dashboard');
      return;
    }
    if (user && role === 'owner') {
      getRestaurant(restaurantId).then(data => {
        if (data && data.ownerId === user.uid) {
          setRestaurant(data);
          setOnlineOrderingEnabled(data.settings?.onlineOrderingEnabled ?? false);
          setTableReservationsEnabled(data.settings?.tableReservationsEnabled ?? false);
          setNotificationEmail(data.settings?.notificationEmail || `orders@${data.name.toLowerCase().replace(/\s+/g, '')}.example.com`);
          setCustomDomain(data.settings?.customDomain || '');
        } else if (data) {
           toast({ variant: "destructive", title: "Access Denied", description: "You are not authorized to manage this restaurant."});
           router.push('/dashboard');
        } else {
            toast({ variant: "destructive", title: "Not Found", description: "Restaurant not found."});
            router.push('/dashboard');
        }
        setLoading(false);
      }).catch(() => {
        toast({ variant: "destructive", title: "Error", description: "Failed to load restaurant settings."});
        setLoading(false)
      });
    } else if (user) {
      toast({ variant: "destructive", title: "Access Denied", description: "You are not authorized to view this page."});
      router.push('/dashboard');
      setLoading(false);
    }
  }, [restaurantId, user, role, router, toast]);

  useEffect(() => {
    if (restaurantId && user && role === 'owner') {
      getMenuCategories(restaurantId).then(setCategories);
      getMenuItems(restaurantId).then(setMenuItems);
    }
  }, [restaurantId, user, role]);

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    setFormSubmitting(true);
    try {
      const settingsToUpdate = {
        onlineOrderingEnabled,
        tableReservationsEnabled,
        notificationEmail,
        customDomain: customDomain || null, 
      };
      await updateRestaurantProfile(restaurant.id, { settings: settingsToUpdate });
      toast({ title: "Settings Saved", description: "Your restaurant settings have been updated."});
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save settings."});
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditTax = (tax: TaxConfig) => {
    setEditingTax(tax);
    setTaxForm({
      name: tax.name,
      rate: tax.rate,
      type: tax.type,
      isInclusive: !!tax.isInclusive,
      isDefault: !!tax.isDefault
    });
    setShowAddTaxModal(true);
  };

  const handleDeleteTax = async (tax: TaxConfig) => {
    if (!restaurant) return;
    setFormSubmitting(true);
    try {
      const updatedTaxes = (restaurant.taxes || []).filter(t => t.id !== tax.id);
      await updateRestaurantProfile(restaurant.id, { taxes: updatedTaxes });
      setRestaurant({ ...restaurant, taxes: updatedTaxes });
      toast({ title: "Tax Deleted", description: `Tax '${tax.name}' has been deleted.` });
    } catch (error) {
      console.error("Error deleting tax:", error);
      toast({ variant: "destructive", title: "Delete Failed", description: "Could not delete tax." });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleSaveTax = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    setFormSubmitting(true);
    try {
      let updatedTaxes = restaurant.taxes ? [...restaurant.taxes] : [];
      if (editingTax) {
        // Update existing tax
        updatedTaxes = updatedTaxes.map(t => t.id === editingTax.id ? { ...editingTax, ...taxForm, type: taxForm.type as 'percentage' | 'fixed' } : t);
      } else {
        // Add new tax
        const newTax: TaxConfig = {
          id: `${taxForm.name.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`,
          name: taxForm.name,
          rate: taxForm.rate,
          type: taxForm.type as 'percentage' | 'fixed',
          isInclusive: taxForm.isInclusive,
          isDefault: taxForm.isDefault
        };
        updatedTaxes.push(newTax);
      }
      await updateRestaurantProfile(restaurant.id, { taxes: updatedTaxes });
      setRestaurant({ ...restaurant, taxes: updatedTaxes });
      toast({ title: "Tax Saved", description: "Tax has been successfully saved." });
    } catch (error) {
      console.error("Error saving tax:", error);
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save tax." });
    } finally {
      setFormSubmitting(false);
      setShowAddTaxModal(false);
      setEditingTax(null);
      setTaxForm({ name: '', rate: 0, type: 'percentage', isInclusive: false, isDefault: false });
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>;
  }
  
  if (!restaurant) {
    return (
      <Card>
        <CardHeader><CardTitle>Access Denied or Not Found</CardTitle></CardHeader>
        <CardContent><p>You are not authorized to manage settings for this restaurant, or it does not exist.</p></CardContent>
      </Card>
    );
  }
  
  const publicPageUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/site/${restaurantId}`;


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Settings className="mr-2 h-6 w-6 text-primary" />
            Settings for {restaurant.name}
          </CardTitle>
          <CardDescription>
            Manage general settings, online presence, and more for your restaurant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-1 md:grid-cols-4 mb-6 max-w-xl">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="webpage">Webpage</TabsTrigger>
              <TabsTrigger value="tax">Tax</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <Card className="border-primary/20 shadow-md">
                <CardHeader>
                    <CardTitle className="text-xl">General Configuration</CardTitle>
                    <CardDescription>Control core functionalities like online orders and reservations.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 max-w-2xl">
                    <Image 
                      src={`https://picsum.photos/seed/restosettings${restaurantId}/600/200`}
                      alt="Restaurant Settings" 
                      width={600} 
                      height={200} 
                      className="rounded-lg mb-6 object-cover shadow-md"
                      data-ai-hint="modern settings interface"
                    />
                  <form onSubmit={handleSaveChanges} className="space-y-6">
                    <div>
                      <Label htmlFor="onlineOrdering">Online Ordering</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Switch id="onlineOrdering" checked={onlineOrderingEnabled} onCheckedChange={setOnlineOrderingEnabled} />
                        <Label htmlFor="onlineOrdering">Enable Online Orders</Label>
                      </div>
                      <CardDescription className="text-xs mt-1">Allow customers to place orders directly through the app.</CardDescription>
                    </div>

                    <div>
                      <Label htmlFor="tableReservations">Table Reservations</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Switch id="tableReservations" checked={tableReservationsEnabled} onCheckedChange={setTableReservationsEnabled} />
                        <Label htmlFor="tableReservations">Enable Table Reservations</Label>
                      </div>
                      <CardDescription className="text-xs mt-1">Allow customers to reserve tables in advance.</CardDescription>
                    </div>
                    
                    <div>
                      <Label htmlFor="notificationEmail">Notification Email</Label>
                      <Input id="notificationEmail" type="email" value={notificationEmail} onChange={(e)=>setNotificationEmail(e.target.value)} className="mt-1" />
                      <CardDescription className="text-xs mt-1">Email address to receive notifications for new orders and reservations.</CardDescription>
                    </div>
                    
                    <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={formSubmitting}>
                      {formSubmitting ? <LoadingSpinner className="mr-2 h-4 w-4"/> : "Save General Settings"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="webpage">
                <Card className="border-accent/20 shadow-md">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center"><Globe className="mr-2 h-5 w-5 text-accent"/>Public Webpage Management</CardTitle>
                        <CardDescription>Manage your restaurant's public-facing webpage and domain settings.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 max-w-2xl">
                         <Image 
                            src={`https://picsum.photos/seed/webpage${restaurantId}/600/200`}
                            alt="Webpage Management" 
                            width={600} 
                            height={200} 
                            className="rounded-lg mb-6 object-cover shadow-md"
                            data-ai-hint="website builder interface"
                        />
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-semibold text-lg text-foreground">Your Restaurant's Public Link</h3>
                                <p className="text-sm text-muted-foreground">Share this link with your customers so they can view your restaurant's page.</p>
                                <div className="mt-2 flex items-center gap-2 p-3 bg-muted rounded-md">
                                    <Link href={publicPageUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex-grow">
                                    {publicPageUrl}
                                    </Link>
                                    <Button variant="ghost" size="icon" asChild>
                                        <Link href={publicPageUrl} target="_blank" rel="noopener noreferrer" title="Open in new tab">
                                            <ExternalLink className="h-4 w-4"/>
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                            <form onSubmit={handleSaveChanges} className="space-y-6 pt-4 border-t">
                                <div>
                                <Label htmlFor="customDomain">Custom Domain (Optional)</Label>
                                <Input 
                                    id="customDomain" 
                                    type="text" 
                                    placeholder="e.g., www.myrestaurant.com" 
                                    value={customDomain}
                                    onChange={(e) => setCustomDomain(e.target.value)}
                                    className="mt-1" 
                                />
                                <CardDescription className="text-xs mt-1">
                                    Enter your custom domain. You will need to configure DNS settings separately. Feature coming soon.
                                </CardDescription>
                                </div>
                                <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={formSubmitting || true}>
                                     {formSubmitting ? <LoadingSpinner className="mr-2 h-4 w-4"/> : "Save Domain Settings (Coming Soon)"}
                                </Button>
                            </form>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="tax">
              <Card className="border-green-400/20 shadow-md">
                <CardHeader>
                  <CardTitle className="text-xl">Tax Management</CardTitle>
                  <CardDescription>Configure GST, service charge, and other taxes for your restaurant.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 max-w-2xl mx-auto">
                  {/* List of Taxes */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-semibold">Current Taxes</h3>
                      <Button variant="outline" size="sm" onClick={() => setShowAddTaxModal(true)}><PlusCircle className="h-4 w-4 mr-1"/>Add Tax</Button>
                    </div>
                    <div className="grid gap-3">
                      {(restaurant?.taxes && restaurant.taxes.length > 0) ? restaurant.taxes.map((tax, idx) => (
                        <Card key={tax.id + idx} className="flex flex-col md:flex-row md:items-center justify-between p-3 border border-muted-foreground/10">
                          <div className="flex-1 flex flex-col md:flex-row md:items-center gap-2">
                            <span className="font-bold text-primary">{tax.name}</span>
                            <span className="text-xs text-muted-foreground">{tax.type === 'percentage' ? `${tax.rate}%` : `₹${tax.rate}`}</span>
                            {tax.isInclusive && <span className="text-xs text-green-600 font-semibold ml-2">Inclusive</span>}
                            {tax.isDefault && <span className="text-xs text-blue-600 font-semibold ml-2">Default</span>}
                          </div>
                          <div className="flex gap-2 mt-2 md:mt-0">
                            <Button variant="outline" size="icon" onClick={() => handleEditTax(tax)}><Edit3 className="h-4 w-4"/></Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteTax(tax)}><Trash2 className="h-4 w-4"/></Button>
                          </div>
                        </Card>
                      )) : <div className="text-muted-foreground text-sm">No taxes configured yet.</div>}
                    </div>
                  </div>
                  <Separator />
                  {/* Add/Edit Tax Modal */}
                  <Dialog open={showAddTaxModal} onOpenChange={setShowAddTaxModal}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingTax ? 'Edit Tax' : 'Add New Tax'}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSaveTax} className="space-y-4 py-2">
                        <div>
                          <Label htmlFor="taxName">Tax Name</Label>
                          <Input id="taxName" value={taxForm.name} onChange={e => setTaxForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. CGST, SGST, Service Charge" />
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Label htmlFor="taxRate">Rate</Label>
                            <Input id="taxRate" type="number" value={taxForm.rate} onChange={e => setTaxForm(f => ({ ...f, rate: parseFloat(e.target.value) }))} required min={0} step={0.01} placeholder="e.g. 2.5" />
                          </div>
                          <div className="flex-1">
                            <Label htmlFor="taxType">Type</Label>
                            <Select value={taxForm.type} onValueChange={val => setTaxForm(f => ({ ...f, type: val as 'percentage' | 'fixed' }))}>
                              <SelectTrigger id="taxType"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="percentage">Percentage (%)</SelectItem>
                                <SelectItem value="fixed">Fixed (₹)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Label htmlFor="isInclusive">Inclusive</Label>
                          <input id="isInclusive" type="checkbox" checked={taxForm.isInclusive} onChange={e => setTaxForm(f => ({ ...f, isInclusive: e.target.checked }))} />
                          <Label htmlFor="isDefault" className="ml-4">Default</Label>
                          <input id="isDefault" type="checkbox" checked={taxForm.isDefault} onChange={e => setTaxForm(f => ({ ...f, isDefault: e.target.checked }))} />
                        </div>
                        <DialogFooter>
                          <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                          <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">{editingTax ? 'Save Changes' : 'Add Tax'}</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="advanced">
              <Card className="border-gray-400/20 shadow-md">
                <CardHeader>
                    <CardTitle className="text-xl">Advanced Settings</CardTitle>
                    <CardDescription>Configure advanced options and integrations.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 max-w-2xl text-center">
                  <Construction className="h-16 w-16 text-muted-foreground mx-auto my-6" />
                  <p className="text-muted-foreground">Advanced settings and integrations are under construction.</p>
                  <p className="text-xs text-muted-foreground">This section will include options for API keys, third-party service integrations, and more granular control over restaurant operations.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Add this to your types/index.ts if not already present and update RestaurantProfile
// This declaration seems to be already present or compatible with the existing types.
// No changes needed in types/index.ts for this specific update.
