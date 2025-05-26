
'use client';

import { SPECIAL_OFFERS_DATA } from '@/data/waiter/specials';
import type { SpecialOffer } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tag } from 'lucide-react';

export function SpecialsHighlight() {
  if (!SPECIAL_OFFERS_DATA || SPECIAL_OFFERS_DATA.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-foreground mb-3">Today's Specials & Offers</h2>
      <ScrollArea className="w-full whitespace-nowrap rounded-md">
        <div className="flex w-max space-x-4 pb-4">
          {SPECIAL_OFFERS_DATA.map((offer) => (
            <Card key={offer.id} className="w-[280px] sm:w-[320px] overflow-hidden shadow-md hover:shadow-lg transition-shadow flex flex-col">
              {offer.imageUrl && (
                <div className="relative h-32 sm:h-36 w-full">
                  <Image
                    src={offer.imageUrl}
                    alt={offer.title}
                    layout="fill"
                    objectFit="cover"
                    data-ai-hint={offer.dataAiHint || 'food promotion'}
                  />
                </div>
              )}
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-lg leading-tight">{offer.title}</CardTitle>
                {offer.description && (
                  <CardDescription className="text-xs h-10 overflow-hidden text-ellipsis line-clamp-2">
                    {offer.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex-grow py-2">
                {offer.specialPrice && (
                  <p className="text-lg font-bold text-primary">₹{offer.specialPrice.toFixed(2)}</p>
                )}
                {offer.discountPercentage && (
                  <p className="text-lg font-bold text-primary">{offer.discountPercentage}% OFF</p>
                )}
              </CardContent>
              {offer.tags && offer.tags.length > 0 && (
                <CardFooter className="pt-1 pb-3 flex-wrap gap-1.5">
                  {offer.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      <Tag size={10} className="mr-1 opacity-70"/>{tag}
                    </Badge>
                  ))}
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
