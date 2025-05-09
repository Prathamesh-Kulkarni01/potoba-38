'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import Image from "next/image";

export default function MealPlannerPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <CalendarDays className="mr-2 h-6 w-6 text-primary" />
            Meal Planner
          </CardTitle>
          <CardDescription>
            Plan your meals for the week. This feature is currently under development.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center p-10 border-2 border-dashed border-border rounded-lg bg-muted/50">
            <Image 
              src="https://picsum.photos/seed/mealplannerfeature/300/200" 
              alt="Meal Planner Coming Soon" 
              width={300} 
              height={200} 
              className="rounded-md mb-6"
              data-ai-hint="healthy food schedule"
            />
            <h3 className="text-xl font-semibold mb-2">Coming Soon!</h3>
            <p className="text-muted-foreground">
              Our chefs are busy cooking up an amazing meal planning experience for you.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
