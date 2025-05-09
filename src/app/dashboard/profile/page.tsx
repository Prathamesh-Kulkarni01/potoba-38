'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChefHat, Edit3 } from "lucide-react";
import { useAuth } from "@/lib/auth/context";

export default function ProfilePage() {
  const { user, role } = useAuth();

  if (!user) return null;

  const getInitials = (email: string | null) => {
    if (!email) return "AZ";
    const parts = email.split('@')[0].split(/[._-]/);
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <ChefHat className="mr-2 h-6 w-6 text-primary" />
            My Profile
          </CardTitle>
          <CardDescription>
            Manage your personal information and preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="flex items-center space-x-6">
            <Avatar className="h-24 w-24 border-4 border-primary">
              <AvatarImage src={`https://picsum.photos/seed/${user.uid}/100/100`} alt={user.email || "User Avatar"} data-ai-hint="profile picture"/>
              <AvatarFallback className="text-3xl bg-primary text-primary-foreground font-semibold">
                {getInitials(user.email)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-semibold">{user.displayName || user.email?.split('@')[0]}</h2>
              <p className="text-muted-foreground">{user.email}</p>
              <p className="text-sm text-accent font-medium capitalize mt-1">Role: {role}</p>
            </div>
          </div>

          <form className="space-y-6 max-w-lg">
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input id="displayName" type="text" defaultValue={user.displayName || user.email?.split('@')[0]} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={user.email || ''} disabled className="mt-1 bg-muted/50" />
            </div>
            <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Edit3 className="mr-2 h-4 w-4" /> Update Profile
            </Button>
            <p className="text-xs text-muted-foreground">Profile editing functionality is for demonstration.</p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
