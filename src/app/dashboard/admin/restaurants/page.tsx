'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecks, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Sample data - in a real app, this would be fetched from Firestore
const sampleRestaurants = [
  { id: "r1", name: "The Grand Bistro", owner: "Alice Wonderland", plan: "Premium", status: "Active", joined: "2023-01-20" },
  { id: "r2", name: "Quick Eats", owner: "Bob The Builder", plan: "Basic", status: "Active", joined: "2023-03-15" },
  { id: "r3", name: "Pasta Palace", owner: "Charlie Brown", plan: "Free Trial", status: "Trialing", joined: "2023-05-01" },
  { id: "r4", name: "Sushi Spot", owner: "Diana Prince", plan: "Premium", status: "Inactive", joined: "2023-02-10" },
];

export default function AdminAllRestaurantsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <ShieldCheck className="mr-2 h-6 w-6 text-primary" />
            All Restaurants
          </CardTitle>
          <CardDescription>
            View and manage all restaurants registered on the AuthZen platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Restaurant Name</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Subscription Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sampleRestaurants.map((restaurant) => (
                        <TableRow key={restaurant.id}>
                            <TableCell className="font-medium">{restaurant.name}</TableCell>
                            <TableCell>{restaurant.owner}</TableCell>
                            <TableCell>
                                <Badge 
                                    variant={restaurant.plan === 'Premium' ? 'default' : restaurant.plan === 'Basic' ? 'secondary' : 'outline'}
                                    className={restaurant.plan === 'Premium' ? 'bg-primary text-primary-foreground' : ''}
                                >
                                    {restaurant.plan}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <Badge 
                                    variant={restaurant.status === 'Active' ? 'outline' : restaurant.status === 'Trialing' ? 'default': 'destructive'}
                                    className={restaurant.status === 'Active' ? 'border-green-500 text-green-600' : restaurant.status === 'Trialing' ? 'bg-yellow-500 text-yellow-foreground' : ''}
                                >
                                    {restaurant.status}
                                </Badge>
                            </TableCell>
                            <TableCell>{restaurant.joined}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="sm" className="text-accent hover:text-accent/80">View Details</Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          {/* <div className="flex flex-col items-center justify-center text-center p-10 border-2 border-dashed border-border rounded-lg bg-muted/50">
            <Image
              src="https://picsum.photos/seed/allrestaurants/300/200"
              alt="All Restaurants Feature"
              width={300}
              height={200}
              className="rounded-md mb-6"
              data-ai-hint="restaurant list map"
            />
            <h3 className="text-xl font-semibold mb-2">Restaurant Overview</h3>
            <p className="text-muted-foreground">
              This section will display a list or grid of all restaurants on the platform.
              Admininstrators will be able to view details, manage status, and oversee subscriptions.
              This feature is under active development.
            </p>
          </div> */}
        </CardContent>
      </Card>
    </div>
  );
}
