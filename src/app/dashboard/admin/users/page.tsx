'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const sampleUsers = [
  { id: "1", name: "Alice Wonderland", email: "alice@example.com", role: "admin", joined: "2023-01-15", status: "Active" },
  { id: "2", name: "Bob The Builder", email: "bob@example.com", role: "user", joined: "2023-02-20", status: "Active" },
  { id: "3", name: "Charlie Brown", email: "charlie@example.com", role: "user", joined: "2023-03-10", status: "Inactive" },
  { id: "4", name: "Diana Prince", email: "diana@example.com", role: "user", joined: "2023-04-05", status: "Active" },
];

export default function AdminUsersPage() {
  // In a real app, you'd fetch this data and check if current user is admin
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Users className="mr-2 h-6 w-6 text-primary" />
            User Management
          </CardTitle>
          <CardDescription>
            View and manage all users in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium flex items-center">
                    <Image src={`https://picsum.photos/seed/${user.id}/32/32`} alt={user.name} width={32} height={32} className="rounded-full mr-3" data-ai-hint="user avatar" />
                    {user.name}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className={user.role === 'admin' ? 'bg-primary text-primary-foreground' : ''}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.joined}</TableCell>
                  <TableCell>
                    <Badge variant={user.status === 'Active' ? 'outline' : 'destructive'} className={user.status === 'Active' ? 'border-green-500 text-green-600' : ''}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-accent hover:text-accent/80">Edit</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
