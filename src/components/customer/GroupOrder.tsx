
import { useState, useEffect } from 'react';
import { Users, UserPlus, UserCheck } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface GroupOrderProps {
  tableId: number;
  onJoinGroup: (name: string) => void;
  groupMembers: string[];
}

const GroupOrder = ({ tableId, onJoinGroup, groupMembers = [] }: GroupOrderProps) => {
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [userName, setUserName] = useState('');
  const [joinedGroup, setJoinedGroup] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  const { toast } = useToast();

  // Check if user already joined the group from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem(`table-${tableId}-user`);
    if (savedUser) {
      setJoinedGroup(true);
      setCurrentUser(savedUser);
    }
  }, [tableId]);

  const handleJoinGroup = () => {
    if (!userName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name to join the group order",
        variant: "destructive",
      });
      return;
    }

    // Save to localStorage
    localStorage.setItem(`table-${tableId}-user`, userName);
    setCurrentUser(userName);
    setJoinedGroup(true);
    setShowJoinDialog(false);
    
    // Call parent callback
    onJoinGroup(userName);
    
    toast({
      title: "Group joined",
      description: `You've joined the group order as ${userName}`,
    });
  };

  const leaveGroup = () => {
    localStorage.removeItem(`table-${tableId}-user`);
    setJoinedGroup(false);
    setCurrentUser('');
    
    toast({
      title: "Group left",
      description: "You've left the group order",
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg border shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Users className="h-5 w-5 mr-2 text-restaurant-primary" />
          <h3 className="font-medium">Group Order</h3>
        </div>
        
        <Badge variant="outline" className="bg-restaurant-primary/10 text-restaurant-primary">
          {groupMembers.length} {groupMembers.length === 1 ? 'person' : 'people'}
        </Badge>
      </div>
      
      {joinedGroup ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <UserCheck className="h-4 w-4 mr-2 text-green-500" />
              <span>You joined as <span className="font-medium">{currentUser}</span></span>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={leaveGroup}
            >
              Leave
            </Button>
          </div>
          
          {groupMembers.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground mb-2">Others in this group:</p>
              <div className="flex flex-wrap gap-2">
                {groupMembers
                  .filter(member => member !== currentUser)
                  .map((member, index) => (
                    <Badge key={index} variant="secondary">
                      {member}
                    </Badge>
                  ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Join the group order to place orders together with others at this table.
          </p>
          
          <Button
            variant="outline"
            className="w-full border-dashed"
            onClick={() => setShowJoinDialog(true)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Join Group Order
          </Button>
        </div>
      )}
      
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Group Order</DialogTitle>
            <DialogDescription>
              Enter your name to join the group order for Table {tableId}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Your Name</Label>
              <Input 
                id="name" 
                value={userName} 
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name" 
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJoinDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleJoinGroup}>
              Join Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupOrder;
