
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Award, Pencil, Search, Mail, Import, Export, Filter, Users, User, UserPlus, Gift, BadgePercent } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function MembersManagement() {
  const { getCurrentRestaurant } = useAuth();
  const currentRestaurant = getCurrentRestaurant();
  const [searchTerm, setSearchTerm] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  
  // Mock members data
  const [members, setMembers] = useState([
    { 
      id: 1, 
      name: 'John Smith', 
      email: 'john.smith@example.com', 
      phone: '555-123-4567', 
      joined: '2025-01-15', 
      birthdate: '1985-06-22', 
      points: 230, 
      totalSpent: 423.45, 
      visits: 12, 
      status: 'active',
      tier: 'gold'
    },
    { 
      id: 2, 
      name: 'Emma Johnson', 
      email: 'emma.j@example.com', 
      phone: '555-987-6543', 
      joined: '2025-02-03', 
      birthdate: '1990-03-15', 
      points: 175, 
      totalSpent: 289.20, 
      visits: 8, 
      status: 'active',
      tier: 'silver'
    },
    { 
      id: 3, 
      name: 'Michael Brown', 
      email: 'mbrown@example.com', 
      phone: '555-555-5555', 
      joined: '2025-01-20', 
      birthdate: '1975-11-30', 
      points: 350, 
      totalSpent: 520.75, 
      visits: 19, 
      status: 'active',
      tier: 'gold'
    },
    { 
      id: 4, 
      name: 'Lisa Chen', 
      email: 'lisa.chen@example.com', 
      phone: '555-222-3333', 
      joined: '2025-03-05', 
      birthdate: '1988-09-12', 
      points: 80, 
      totalSpent: 142.30, 
      visits: 4, 
      status: 'inactive',
      tier: 'bronze'
    },
    { 
      id: 5, 
      name: 'David Wilson', 
      email: 'd.wilson@example.com', 
      phone: '555-777-8888', 
      joined: '2025-02-15', 
      birthdate: '1982-04-25', 
      points: 420, 
      totalSpent: 612.90, 
      visits: 22, 
      status: 'active',
      tier: 'platinum'
    },
  ]);
  
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'bg-amber-100 text-amber-800';
      case 'silver': return 'bg-gray-100 text-gray-800';
      case 'gold': return 'bg-yellow-100 text-yellow-800';
      case 'platinum': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const handleAddMember = () => {
    if (!name || !email) {
      toast.error("Name and email are required");
      return;
    }
    
    const newMember = {
      id: Math.max(0, ...members.map(m => m.id)) + 1,
      name,
      email,
      phone,
      joined: new Date().toISOString().split('T')[0],
      birthdate: birthdate || null,
      points: 50, // Welcome bonus
      totalSpent: 0,
      visits: 0,
      status: 'active',
      tier: 'bronze'
    };
    
    setMembers([...members, newMember]);
    toast.success("Member added successfully with 50 welcome points");
    
    // Reset form
    setName('');
    setEmail('');
    setPhone('');
    setBirthdate('');
  };
  
  const handleSendBirthdayRewards = () => {
    toast.success("Birthday rewards sent to members with upcoming birthdays");
  };
  
  const handleViewMember = (member: any) => {
    setSelectedMember(member);
  };
  
  const handleAddPoints = () => {
    if (!selectedMember) return;
    
    const updatedMembers = members.map(member => 
      member.id === selectedMember.id 
        ? { ...member, points: member.points + 50 } 
        : member
    );
    
    setMembers(updatedMembers);
    setSelectedMember({ ...selectedMember, points: selectedMember.points + 50 });
    
    toast.success(`Added 50 points to ${selectedMember.name}'s account`);
  };
  
  const filteredMembers = members.filter(member => 
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.phone.includes(searchTerm)
  );
  
  const activeMembers = members.filter(member => member.status === 'active');
  const inactiveMembers = members.filter(member => member.status === 'inactive');
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Loyalty Members</h1>
          <p className="text-muted-foreground">
            Manage your loyalty program members for {currentRestaurant?.name || 'your restaurant'}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Member</DialogTitle>
                <DialogDescription>
                  Add a new customer to your loyalty program.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right">
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="birthdate" className="text-right">
                    Birthdate
                  </Label>
                  <Input
                    id="birthdate"
                    type="date"
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleAddMember}>Add Member</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={handleSendBirthdayRewards}>
            <Gift className="mr-2 h-4 w-4" />
            Send Birthday Rewards
          </Button>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search members by name, email or phone..."
          className="max-w-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <div className="flex items-center gap-2">
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">Bronze</Badge>
        <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">Silver</Badge>
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Gold</Badge>
        <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-200">Platinum</Badge>
      </div>
      
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="all">All Members ({members.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({activeMembers.length})</TabsTrigger>
          <TabsTrigger value="inactive">Inactive ({inactiveMembers.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle>Loyalty Program Members</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Export className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm">
                    <Import className="mr-2 h-4 w-4" />
                    Import
                  </Button>
                </div>
              </div>
              <CardDescription>
                Manage and view all your loyalty program members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 font-medium">
                      <th className="py-3 px-4 text-left">Member</th>
                      <th className="py-3 px-4 text-left">Contact</th>
                      <th className="py-3 px-4 text-center">Joined</th>
                      <th className="py-3 px-4 text-center">Points</th>
                      <th className="py-3 px-4 text-center">Spent</th>
                      <th className="py-3 px-4 text-center">Visits</th>
                      <th className="py-3 px-4 text-center">Tier</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((member) => (
                      <tr key={member.id} className="border-b">
                        <td className="py-3 px-4 font-medium">{member.name}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="text-xs text-blue-600">{member.email}</span>
                            <span className="text-xs text-muted-foreground">{member.phone}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">{member.joined}</td>
                        <td className="py-3 px-4 text-center font-medium">{member.points}</td>
                        <td className="py-3 px-4 text-center">${member.totalSpent.toFixed(2)}</td>
                        <td className="py-3 px-4 text-center">{member.visits}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getTierColor(member.tier)}`}>
                            {member.tier.charAt(0).toUpperCase() + member.tier.slice(1)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleViewMember(member)}>
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filteredMembers.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-muted-foreground">
                          No members found matching your search
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="active" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Members</CardTitle>
              <CardDescription>
                Members who are actively participating in your loyalty program
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 font-medium">
                      <th className="py-3 px-4 text-left">Member</th>
                      <th className="py-3 px-4 text-left">Contact</th>
                      <th className="py-3 px-4 text-center">Points</th>
                      <th className="py-3 px-4 text-center">Tier</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.filter(m => m.status === 'active').map((member) => (
                      <tr key={member.id} className="border-b">
                        <td className="py-3 px-4 font-medium">{member.name}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="text-xs text-blue-600">{member.email}</span>
                            <span className="text-xs text-muted-foreground">{member.phone}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-medium">{member.points}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getTierColor(member.tier)}`}>
                            {member.tier.charAt(0).toUpperCase() + member.tier.slice(1)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleViewMember(member)}>
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="inactive" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Inactive Members</CardTitle>
              <CardDescription>
                Members who haven't engaged with your loyalty program recently
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 font-medium">
                      <th className="py-3 px-4 text-left">Member</th>
                      <th className="py-3 px-4 text-left">Contact</th>
                      <th className="py-3 px-4 text-center">Last Visit</th>
                      <th className="py-3 px-4 text-center">Points</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.filter(m => m.status === 'inactive').map((member) => (
                      <tr key={member.id} className="border-b">
                        <td className="py-3 px-4 font-medium">{member.name}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="text-xs text-blue-600">{member.email}</span>
                            <span className="text-xs text-muted-foreground">{member.phone}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">90+ days ago</td>
                        <td className="py-3 px-4 text-center font-medium">{member.points}</td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleViewMember(member)}>
                            View
                          </Button>
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
      
      {selectedMember && (
        <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" /> 
                {selectedMember.name}
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ml-2 ${getTierColor(selectedMember.tier)}`}>
                  {selectedMember.tier.charAt(0).toUpperCase() + selectedMember.tier.slice(1)}
                </span>
              </DialogTitle>
              <DialogDescription>
                Member since {selectedMember.joined}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{selectedMember.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Phone</p>
                <p className="text-sm text-muted-foreground">{selectedMember.phone}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Birthday</p>
                <p className="text-sm text-muted-foreground">{selectedMember.birthdate || 'Not provided'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Status</p>
                <p className="text-sm text-muted-foreground capitalize">{selectedMember.status}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 bg-muted/50 p-4 rounded-lg mt-2">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{selectedMember.points}</p>
                <p className="text-sm text-muted-foreground">Points</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">${selectedMember.totalSpent.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Total Spent</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{selectedMember.visits}</p>
                <p className="text-sm text-muted-foreground">Visits</p>
              </div>
            </div>
            
            <div className="flex space-x-2 mt-2">
              <Button className="flex-1" onClick={handleAddPoints}>
                <Award className="mr-2 h-4 w-4" />
                Add Points
              </Button>
              <Button className="flex-1" variant="outline">
                <Mail className="mr-2 h-4 w-4" />
                Send Email
              </Button>
              <Button className="flex-1" variant="outline">
                <BadgePercent className="mr-2 h-4 w-4" />
                Send Promo
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
