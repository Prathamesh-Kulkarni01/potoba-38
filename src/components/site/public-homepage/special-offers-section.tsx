
'use client';

import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TicketPercent } from 'lucide-react';

interface Offer {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  dataAiHint: string;
}

interface SpecialOffersSectionProps {
  offers: Offer[];
}

export default function SpecialOffersSection({ offers }: SpecialOffersSectionProps) {
  if (!offers || offers.length === 0) {
    return null;
  }

  return (
    <section id="offers-section" className="py-12 md:py-16 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mb-8 text-center md:mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            <TicketPercent className="mr-3 inline-block h-10 w-10 text-primary" />
            Special Offers Just For You
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Don&apos;t miss out on these amazing deals!
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {offers.map((offer) => (
            <Card key={offer.id} className="group transform overflow-hidden rounded-lg border-border bg-card shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
              <div className="relative h-60 w-full">
                <Image
                  src={offer.imageUrl}
                  alt={offer.title}
                  layout="fill"
                  objectFit="cover"
                  className="transition-transform duration-500 group-hover:scale-105"
                  data-ai-hint={offer.dataAiHint}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              </div>
              <CardHeader className="relative -mt-16 p-6 pt-4">
                <CardTitle className="text-2xl font-semibold text-white group-hover:text-primary">
                  {offer.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <CardDescription className="mb-4 text-sm text-muted-foreground">
                  {offer.description}
                </CardDescription>
                <Button className="w-full bg-accent font-semibold text-accent-foreground shadow-sm transition-shadow hover:bg-accent/90 hover:shadow-md">
                  Grab Offer
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
