
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="space-y-6 p-1 md:p-4">
      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">Manage your account details here.</p>
          {/* Add form fields for settings later */}
          <Button variant="outline">Edit Profile</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">Configure your notification preferences.</p>
          {/* Add notification toggles later */}
          <Button variant="outline">Manage Notifications</Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Logout</CardTitle>
        </CardHeader>
        <CardContent>
           <Button variant="destructive" className="w-full sm:w-auto rounded-full" onClick={() => router.push('/login')}>
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
