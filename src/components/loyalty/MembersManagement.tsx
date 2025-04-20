
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Award, Pencil, Search, Mail, Upload, Download, Filter, Users, User, UserPlus, Gift, BadgePercent } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function MembersManagement() {
  const { user, getCurrentRestaurant } = useAuth();
  const currentRestaurant = getCurrentRestaurant();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  
  const [members, setMembers] = useState([
    { 
      id: 1, 
      name: 'John Smith', 
      email: 'john@example.com', 
      phone: '555-123-4567',
      birthdate: '1990-05-15',
      joined: '2023-01-15',
      points: 120,
      visits: 8,
      status: 'active',
      tier: 'gold'
    },
    { 
      id: 2, 
      name: 'Sarah Johnson', 
      email: 'sarah@example.com', 
      phone: '555-987-6543',
      birthdate: '1985-11-23',
      joined: '2023-02-20',
      points: 75,
      visits: 5,
      status: 'active',
      tier: 'silver'
    },
    { 
      id: 3, 
      name: 'Michael Wong', 
      email: 'michael@example.com', 
      phone: '555-456-7890',
      birthdate: '1992-08-07',
      joined: '2023-03-05',
      points: 200,
      visits: 12,
      status: 'active',
      tier: 'platinum'
    },
    { 
      id: 4, 
      name: 'Emily Davis', 
      email: 'emily@example.com', 
      phone: '555-789-0123',
      birthdate: '1988-04-19',
      joined: '2023-01-30',
      points: 50,
      visits: 3,
      status: 'inactive',
      tier: 'bronze'
    },
    { 
      id: 5, 
      name: 'David Martinez', 
      email: 'david@example.com', 
      phone: '555-234-5678',
      birthdate: '1995-09-12',
      joined: '2023-02-10',
      points: 90,
      visits: 6,
      status: 'active',
      tier: 'silver'
    }
  ]);

  const getTierBadge = (tier) => {
    switch(tier) {
      case 'platinum':
        return <Badge className="bg-purple-500">Platinum</Badge>;
      case 'gold':
        return <Badge className="bg-yellow-500">Gold</Badge>;
      case 'silver':
        return <Badge className="bg-gray-400">Silver</Badge>;
      case 'bronze':
        return <Badge className="bg-amber-700">Bronze</Badge>;
      default:
        return <Badge>Standard</Badge>;
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'inactive':
        return <Badge variant="outline">Inactive</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const handleAddMember = () => {
    if (!name || !email || !phone) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    const newMember = {
      id: members.length + 1,
      name,
      email,
      phone,
      birthdate: birthdate || 'Not provided',
      joined: new Date().toISOString().split('T')[0],
      points: 50, // Welcome points
      visits: 0,
      status: 'active',
      tier: 'bronze'
    };
    
    setMembers([...members, newMember]);
    toast.success("Member added successfully with 50 welcome points");
    
    setName('');
    setEmail('');
    setPhone('');
    setBirthdate('');
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Members Management</CardTitle>
          <CardDescription>Manage your loyalty program members.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="members" className="space-y-4">
            <TabsList>
              <TabsTrigger value="members">
                <Users className="mr-2 h-4 w-4" />
                Members
              </TabsTrigger>
              <TabsTrigger value="add">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Member
              </TabsTrigger>
              <TabsTrigger value="import">
                <Upload className="mr-2 h-4 w-4" />
                Import
              </TabsTrigger>
              <TabsTrigger value="export">
                <Download className="mr-2 h-4 w-4" />
                Export
              </TabsTrigger>
            </TabsList>
            <TabsContent value="members" className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Input type="text" placeholder="Search members..." className="md:w-80" />
                  <Button variant="outline" size="sm">
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </Button>
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Visits</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>{member.name}</TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>{member.phone}</TableCell>
                      <TableCell>{member.joined}</TableCell>
                      <TableCell>{member.points}</TableCell>
                      <TableCell>{member.visits}</TableCell>
                      <TableCell>{getStatusBadge(member.status)}</TableCell>
                      <TableCell>{getTierBadge(member.tier)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedMember(member)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="add" className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Input type="tel" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div>
                  <Input type="date" placeholder="Birthdate" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} />
                </div>
                <Button onClick={handleAddMember}>Add Member</Button>
              </div>
            </TabsContent>
            <TabsContent value="import">
              <div>
                <p>Import members from a CSV file.</p>
                <Button>Import CSV</Button>
              </div>
            </TabsContent>
            <TabsContent value="export">
              <div>
                <p>Export members data to a CSV file.</p>
                <Button>Export CSV</Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter>
          {currentRestaurant && (
            <p className="text-sm text-muted-foreground">
              Currently managing members for {currentRestaurant.name}
            </p>
          )}
        </CardFooter>
      </Card>

      {/* Edit Member Dialog */}
      <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>
              Make changes to the selected member's profile.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="name" className="text-right">
                Name
              </label>
              <Input type="text" id="name" value={selectedMember?.name || ''} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="email" className="text-right">
                Email
              </label>
              <Input type="email" id="email" value={selectedMember?.email || ''} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="phone" className="text-right">
                Phone
              </label>
              <Input type="tel" id="phone" value={selectedMember?.phone || ''} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="birthdate" className="text-right">
                Birthdate
              </label>
              <Input type="date" id="birthdate" value={selectedMember?.birthdate || ''} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
