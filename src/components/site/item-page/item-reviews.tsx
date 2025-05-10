
'use client';

import { Star, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Review {
  id: string;
  reviewerName: string;
  rating: number;
  content: string;
  // date?: string; // Optional: if you have review dates
}

interface ItemReviewsProps {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
}

export default function ItemReviews({ reviews, averageRating, totalReviews }: ItemReviewsProps) {
  return (
    <Card className="shadow-lg border-border/50">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-foreground">Ratings & Reviews</CardTitle>
        {totalReviews > 0 && (
          <div className="flex items-center gap-2 text-muted-foreground mt-1">
            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
            <span className="font-semibold text-foreground">{averageRating.toFixed(1)}</span>
            <span>({totalReviews} review{totalReviews === 1 ? '' : 's'})</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {reviews.length > 0 ? (
          reviews.slice(0, 3).map((review) => ( // Display up to 3 reviews
            <div key={review.id} className="p-3 border border-input rounded-lg bg-muted/30">
              <div className="flex items-center justify-between mb-1.5">
                <p className="font-semibold text-sm text-foreground">{review.reviewerName}</p>
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-4 w-4",
                        i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"
                      )}
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{review.content}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No reviews yet for this item. Be the first to share your thoughts!
          </p>
        )}
        <Button variant="outline" className="w-full mt-3">
          <MessageSquare className="mr-2 h-4 w-4" />
          Write a Review
        </Button>
        {totalReviews > 3 && (
            <Button variant="link" className="w-full text-primary">
                View All {totalReviews} Reviews
            </Button>
        )}
      </CardContent>
    </Card>
  );
}
