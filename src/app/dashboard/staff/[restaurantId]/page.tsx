
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, PlusCircle, Mail, Clock } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { useEffect, useState, useCallback } from "react";
import { getRestaurant, inviteStaffMember, getStaffForRestaurant, getPendingStaffInvitations } from "@/lib/firebase/firestore"; 
import LoadingSpinner from "@/components/shared/loading-spinner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile, StaffInvitation } from "@/types";
import { format } from 'date-fns';

export default function StaffManagementPage() {
  const params = useParams();
  const restaurantId = params.restaurantId as string;
  const { user, role } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [activeStaff, setActiveStaff] = useState<UserProfile[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<StaffInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [staffEmailToInvite, setStaffEmailToInvite] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!restaurantId || !user || role !== 'owner') return;
    setLoading(true);
    try {
      const [restaurantData, staffData, invitationsData] = await Promise.all([
        getRestaurant(restaurantId),
        getStaffForRestaurant(restaurantId),
        getPendingStaffInvitations(restaurantId)
      ]);

      if (restaurantData && restaurantData.ownerId === user.uid) {
        setRestaurantName(restaurantData.name);
        setActiveStaff(staffData);
        setPendingInvitations(invitationsData);
      } else if (restaurantData) {
        toast({ variant: "destructive", title: "Access Denied", description: "You are not the owner of this restaurant." });
        router.push('/dashboard');
      } else {
        toast({ variant: "destructive", title: "Error", description: "Restaurant not found." });
        router.push('/dashboard');
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: `Failed to load staff data: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }, [restaurantId, user, role, router, toast]);

  useEffect(() => {
    if (user && role === 'owner' && restaurantId) {
      fetchData();
    } else if (user && role !== 'owner') {
      router.push('/dashboard');
    }
  }, [restaurantId, user, role, router, fetchData]);

  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffEmailToInvite || !user || !restaurantId) return;
    setIsInviting(true);
    try {
      await inviteStaffMember(restaurantId, staffEmailToInvite, user.uid);
      toast({ title: "Invitation Sent", description: `An invitation has been sent to ${staffEmailToInvite}.` });
      setStaffEmailToInvite('');
      setIsInviteDialogOpen(false);
      fetchData(); // Refresh lists
    } catch (error: any) {
      toast({ variant: "destructive", title: "Invitation Failed", description: error.message });
    } finally {
      setIsInviting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>;
  }

  if (!restaurantName && !loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Access Denied or Restaurant Not Found</CardTitle></CardHeader>
        <CardContent><p>You might not be authorized or the restaurant doesn't exist.</p></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle className="flex items-center text-2xl">
              <Users className="mr-3 h-7 w-7 text-primary" />
              Staff Management for {restaurantName}
            </CardTitle>
            <CardDescription>
              Manage your team members and invite new staff.
            </CardDescription>
          </div>
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <PlusCircle className="mr-2 h-4 w-4" /> Invite New Staff
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Staff Member</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleInviteStaff} className="space-y-4 py-2">
                <div>
                  <Label htmlFor="staffEmail">Staff Email Address</Label>
                  <Input 
                    id="staffEmail" 
                    type="email" 
                    value={staffEmailToInvite}
                    onChange={(e) => setStaffEmailToInvite(e.target.value)}
                    placeholder="staffmember@example.com"
                    required 
                  />
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                  <Button type="submit" disabled={isInviting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    {isInviting ? <LoadingSpinner className="mr-2 h-4 w-4" /> : "Send Invitation"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3 text-foreground border-b pb-2">Active Staff Members</h3>
            {activeStaff.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeStaff.map(staff => (
                  <Card key={staff.uid} className="p-4 shadow-sm border-primary/20">
                    <div className="flex items-center space-x-3">
                      <Image 
                        src={`https://picsum.photos/seed/${staff.uid}/40/40`} 
                        alt={staff.displayName || staff.email || 'Staff'}
                        width={40} height={40} className="rounded-full"
                        data-ai-hint="user avatar" 
                      />
                      <div>
                        <p className="font-medium text-foreground">{staff.displayName || staff.email?.split('@')[0]}</p>
                        <p className="text-xs text-muted-foreground">{staff.email}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No active staff members found for this restaurant.</p>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3 text-foreground border-b pb-2">Pending Invitations</h3>
            {pendingInvitations.length > 0 ? (
              <div className="space-y-3">
                {pendingInvitations.map(invite => (
                  <Card key={invite.id} className="p-3 flex justify-between items-center shadow-sm border-accent/30 bg-accent/5">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-5 w-5 text-accent" />
                      <p className="text-sm text-foreground">{invite.email}</p>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center">
                      <Clock className="mr-1 h-3 w-3"/>
                      Sent: {invite.createdAt ? format(invite.createdAt.toDate(), 'PPp') : 'N/A'}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No pending staff invitations.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
