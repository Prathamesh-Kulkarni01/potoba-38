'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileCheck, ScanText } from "lucide-react";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

// Sample data - in a real app, this would be fetched
const pendingReviews = [
  { id: "rev1", type: "Recipe", contentName: "Spicy Noodle Supreme", submittedBy: "chef_gordon", date: "2023-06-10" },
  { id: "rev2", type: "Restaurant Profile", contentName: "The Cozy Corner Update", submittedBy: "owner_alice", date: "2023-06-09" },
  { id: "rev3", type: "Recipe Image", contentName: "Cheesecake.jpg", submittedBy: "foodie_bob", date: "2023-06-11" },
];

const flaggedContent = [
  { id: "flag1", type: "Comment", contentName: "Review on 'Burger Bliss'", flaggedBy: "user_jane", reason: "Inappropriate language", date: "2023-06-08" },
  { id: "flag2", type: "Recipe Description", contentName: "Secret Ingredient Pasta", flaggedBy: "system_auto", reason: "Potential plagiarism", date: "2023-06-07" },
];

export default function AdminContentModerationPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <ScanText className="mr-2 h-6 w-6 text-primary" />
            Content Moderation
          </CardTitle>
          <CardDescription>
            Review, approve, or reject user-generated content and manage flagged items.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:w-1/2">
              <TabsTrigger value="pending">Pending Review</TabsTrigger>
              <TabsTrigger value="flagged">Flagged Content</TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Reviews</CardTitle>
                  <CardDescription>Content awaiting approval.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pendingReviews.length > 0 ? (
                    pendingReviews.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:shadow-sm">
                        <div>
                          <p className="font-semibold">{item.contentName} <span className="text-xs text-muted-foreground">({item.type})</span></p>
                          <p className="text-sm text-muted-foreground">Submitted by: {item.submittedBy} on {item.date}</p>
                        </div>
                        <div className="space-x-2">
                          <Button variant="outline" size="sm" className="text-green-600 border-green-500 hover:bg-green-50">Approve</Button>
                          <Button variant="destructive" size="sm">Reject</Button>
                        </div>
                      </div>
                    ))
                  ) : (
                     <p className="text-muted-foreground text-center p-4">No content currently pending review.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="flagged" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Flagged Content</CardTitle>
                  <CardDescription>Content flagged for potential issues.</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-4">
                  {flaggedContent.length > 0 ? (
                    flaggedContent.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 border border-destructive/50 rounded-lg bg-destructive/10 hover:shadow-sm">
                        <div>
                          <p className="font-semibold">{item.contentName} <span className="text-xs text-muted-foreground">({item.type})</span></p>
                          <p className="text-sm text-destructive/80">Flagged by: {item.flaggedBy} ({item.reason}) on {item.date}</p>
                        </div>
                        <div className="space-x-2">
                          <Button variant="outline" size="sm">Review</Button>
                          <Button variant="outline" size="sm" className="text-red-600 border-red-500 hover:bg-red-50">Remove</Button>
                        </div>
                      </div>
                    ))
                  ) : (
                     <p className="text-muted-foreground text-center p-4">No content currently flagged.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
