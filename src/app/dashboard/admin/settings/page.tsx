'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Save } from "lucide-react";

export default function AdminSettingsPage() {
  // In a real app, you'd fetch this data and check if current user is admin
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Settings className="mr-2 h-6 w-6 text-primary" />
            Application Settings
          </CardTitle>
          <CardDescription>
            Configure global settings for AuthZen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 max-w-2xl">
          <form className="space-y-6">
            <div>
              <Label htmlFor="appName">Application Name</Label>
              <Input id="appName" type="text" defaultValue="AuthZen" className="mt-1" />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch id="maintenanceMode" />
              <Label htmlFor="maintenanceMode">Enable Maintenance Mode</Label>
            </div>
            <CardDescription>When enabled, non-admin users will see a maintenance page.</CardDescription>

            <div className="flex items-center space-x-2">
              <Switch id="allowNewSignups" defaultChecked />
              <Label htmlFor="allowNewSignups">Allow New User Signups</Label>
            </div>
            <CardDescription>Disable to prevent new users from registering.</CardDescription>

            <div>
              <Label htmlFor="defaultUserRole">Default Role for New Users</Label>
              <Input id="defaultUserRole" type="text" defaultValue="user" className="mt-1" disabled />
              <CardDescription className="text-xs mt-1">Currently fixed to 'user'. Role management for default roles is planned.</CardDescription>
            </div>
            
            <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Save className="mr-2 h-4 w-4" /> Save Settings
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
