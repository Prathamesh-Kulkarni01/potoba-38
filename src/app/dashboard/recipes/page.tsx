'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Utensils } from "lucide-react";
import Image from "next/image";

export default function RecipesPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Utensils className="mr-2 h-6 w-6 text-primary" />
            Discover Recipes
          </CardTitle>
          <CardDescription>
            Explore a world of culinary delights. More recipes coming soon!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden hover:shadow-lg transition-shadow">
                <Image 
                  src={`https://picsum.photos/seed/recipe${i}/400/250`} 
                  alt={`Recipe ${i}`}
                  width={400} 
                  height={250} 
                  className="w-full h-48 object-cover"
                  data-ai-hint="delicious food" 
                />
                <CardHeader>
                  <CardTitle className="text-lg">Amazing Recipe Title {i}</CardTitle>
                  <CardDescription>A short, enticing description of this delicious dish.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Prep time: 20 mins | Cook time: 30 mins</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
