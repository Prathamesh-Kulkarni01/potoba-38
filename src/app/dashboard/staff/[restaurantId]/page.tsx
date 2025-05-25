
// src/app/dashboard/staff/[restaurantId]/page.tsx
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, PlusCircle, Mail, Clock, Edit3, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { useEffect, useState, useCallback } from "react";
import { getRestaurant, inviteStaffMember, getStaffForRestaurant, getPendingStaffInvitations, updateStaffPermissions } from "@/lib/firebase/firestore";
import LoadingSpinner from "@/components/shared/loading-spinner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile, StaffInvitation, StaffPermissions } from "@/types";
import { format } from 'date-fns';

const defaultPermissions: StaffPermissions = {
  canManageMenu: false,
  canManageOrders: true,
  canManageTables: true,
  canManageInventory: false,
  canAccessSettings: false,
};

const permissionLabels: Record<keyof StaffPermissions, string> = {
  canManageMenu: "Manage Menu",
  canManageOrders: "Manage Orders",
  canManageTables: "Manage Tables",
  canManageInventory: "Manage Inventory",
  canAccessSettings: "Access Restaurant Settings",
};

interface EditPermissionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  staffMember: UserProfile;
  onSave: (permissions: StaffPermissions) => Promise<void>;
  isSaving: boolean;
}

function EditStaffPermissionsDialog({ isOpen, onClose, staffMember, onSave, isSaving }: EditPermissionsDialogProps) {
  const [currentPermissions, setCurrentPermissions] = useState<StaffPermissions>(
    staffMember.staffPermissions || { ...defaultPermissions }
  );

  const handlePermissionChange = (permissionKey: keyof StaffPermissions, checked: boolean) => {
    setCurrentPermissions(prev => ({ ...prev, [permissionKey]: checked }));
  };

  const handleSave = () => {
    onSave(currentPermissions);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Permissions for {staffMember.displayName || staffMember.email}</DialogTitle>
          <DialogDescription>Select the access level for this staff member.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-3">
          {Object.keys(permissionLabels).map((key) => (
            <div key={key} className="flex items-center space-x-2">
              <Checkbox
                id={`perm-${key}`}
                checked={currentPermissions[key as keyof StaffPermissions] || false}
                onCheckedChange={(checked) => handlePermissionChange(key as keyof StaffPermissions, !!checked)}
              />
              <Label htmlFor={`perm-${key}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {permissionLabels[key as keyof StaffPermissions]}
              </Label>
            </div>
          ))}
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving}>Cancel</Button></DialogClose>
          <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {isSaving ? <LoadingSpinner className="mr-2 h-4 w-4" /> : "Save Permissions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


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
  const [invitePermissions, setInvitePermissions] = useState<StaffPermissions>({ ...defaultPermissions });
  const [isInviting, setIsInviting] = useState(false);

  const [editingStaffMember, setEditingStaffMember] = useState<UserProfile | null>(null);
  const [isEditPermissionsDialogOpen, setIsEditPermissionsDialogOpen] = useState(false);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);


  const fetchData = useCallback(async () => {
    if (!restaurantId || !user || role !== 'owner') {
        setLoading(false);
        return;
    }
    setLoading(true);
    try {
      const restaurantData = await getRestaurant(restaurantId);
      if (restaurantData && restaurantData.ownerId === user.uid) {
        setRestaurantName(restaurantData.name);
        const [staffData, invitationsData] = await Promise.all([
            getStaffForRestaurant(restaurantId),
            getPendingStaffInvitations(restaurantId)
        ]);
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
      toast({ variant: "destructive", title: "Error", description: `Failed to load restaurant or staff data: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }, [restaurantId, user, role, router, toast]);

  useEffect(() => {
    if (user && role === 'owner' && restaurantId) {
      fetchData();
    } else if (user && role !== 'owner') {
      toast({ variant: "destructive", title: "Access Denied", description: "Only restaurant owners can manage staff."});
      router.push('/dashboard');
      setLoading(false);
    }
  }, [restaurantId, user, role, router, fetchData]);

  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffEmailToInvite || !user || !restaurantId || !restaurantName) return;
    setIsInviting(true);
    try {
      await inviteStaffMember(restaurantId, staffEmailToInvite, user.uid, invitePermissions);
      toast({ title: "Invitation Sent", description: `An invitation has been sent to ${staffEmailToInvite}.` });
      setStaffEmailToInvite('');
      setInvitePermissions({ ...defaultPermissions });
      setIsInviteDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Invitation Failed", description: error.message });
    } finally {
      setIsInviting(false);
    }
  };

  const handleInvitePermissionChange = (permissionKey: keyof StaffPermissions, checked: boolean) => {
    setInvitePermissions(prev => ({ ...prev, [permissionKey]: checked }));
  };

  const handleOpenEditPermissions = (staff: UserProfile) => {
    setEditingStaffMember(staff);
    setIsEditPermissionsDialogOpen(true);
  };

  const handleSaveStaffPermissions = async (permissions: StaffPermissions) => {
    if (!editingStaffMember || !restaurantId) return;
    setIsSavingPermissions(true);
    try {
      await updateStaffPermissions(editingStaffMember.uid, restaurantId, permissions);
      toast({ title: "Permissions Updated", description: `Permissions for ${editingStaffMember.displayName || editingStaffMember.email} have been saved.` });
      setIsEditPermissionsDialogOpen(false);
      setEditingStaffMember(null);
      fetchData(); // Refresh staff list
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message });
    } finally {
      setIsSavingPermissions(false);
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
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <CardTitle className="flex items-center text-2xl">
              <Users className="mr-3 h-7 w-7 text-primary" />
              Staff Management for {restaurantName}
            </CardTitle>
            <CardDescription>
              Manage your team members, their permissions, and invite new staff.
            </CardDescription>
          </div>
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground mt-4 md:mt-0">
                <PlusCircle className="mr-2 h-4 w-4" /> Invite New Staff
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Invite Staff Member</DialogTitle>
                <DialogDescription>Set email and initial permissions for the new staff.</DialogDescription>
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
                <div className="space-y-3 border p-3 rounded-md">
                    <Label className="text-sm font-medium">Initial Permissions:</Label>
                    {Object.keys(permissionLabels).map((key) => (
                        <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                            id={`invite-perm-${key}`}
                            checked={invitePermissions[key as keyof StaffPermissions] || false}
                            onCheckedChange={(checked) => handleInvitePermissionChange(key as keyof StaffPermissions, !!checked)}
                        />
                        <Label htmlFor={`invite-perm-${key}`} className="text-xs font-normal">
                            {permissionLabels[key as keyof StaffPermissions]}
                        </Label>
                        </div>
                    ))}
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="outline" disabled={isInviting}>Cancel</Button></DialogClose>
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
                    <div className="flex items-center space-x-3 mb-2">
                      <Image
                        src={staff.photoURL || `https://picsum.photos/seed/${staff.uid}/40/40`}
                        alt={staff.displayName || staff.email || 'Staff'}
                        width={40} height={40} className="rounded-full"
                        data-ai-hint="user avatar"
                      />
                      <div>
                        <p className="font-medium text-foreground">{staff.displayName || staff.email?.split('@')[0]}</p>
                        <p className="text-xs text-muted-foreground">{staff.email}</p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mb-3 space-y-1">
                        <p className="font-medium text-foreground/80">Permissions:</p>
                        {staff.staffPermissions && Object.keys(staff.staffPermissions).length > 0 ? (
                            <ul className="list-disc list-inside pl-2">
                            {Object.entries(staff.staffPermissions).map(([key, value]) => value && (
                                <li key={key} className="text-xs">{permissionLabels[key as keyof StaffPermissions]}</li>
                            ))}
                            </ul>
                        ) : ( <p className="text-xs italic">Default permissions</p> )
                        }
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleOpenEditPermissions(staff)} className="w-full text-xs">
                      <Edit3 className="mr-2 h-3 w-3" /> Edit Permissions
                    </Button>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No active staff members found for this restaurant. Invite someone to get started!</p>
            )}
          </div>

          {editingStaffMember && (
            <EditStaffPermissionsDialog
              isOpen={isEditPermissionsDialogOpen}
              onClose={() => setIsEditPermissionsDialogOpen(false)}
              staffMember={editingStaffMember}
              onSave={handleSaveStaffPermissions}
              isSaving={isSavingPermissions}
            />
          )}

          <div>
            <h3 className="text-lg font-semibold mb-3 text-foreground border-b pb-2">Pending Invitations</h3>
            {pendingInvitations.length > 0 ? (
              <div className="space-y-3">
                {pendingInvitations.map(invite => (
                  <Card key={invite.id} className="p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center shadow-sm border-accent/30 bg-accent/5">
                    <div className="flex items-center space-x-2 mb-2 sm:mb-0">
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
              <p className="text-sm text-muted-foreground italic">No pending staff invitations for this restaurant.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
