
'use client';

import Image from 'next/image';
import { ChefHat } from 'lucide-react';

interface AboutRestaurantSectionProps {
  restaurantName: string;
  aboutText: string;
  chefImageUrl: string;
}

export default function AboutRestaurantSection({
  restaurantName,
  aboutText,
  chefImageUrl,
}: AboutRestaurantSectionProps) {
  return (
    <section id="about-section" className="py-12 md:py-16 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mb-8 text-center md:mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            <ChefHat className="mr-3 inline-block h-10 w-10 text-primary" />
            Our Story
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Get to know the heart behind {restaurantName}.
          </p>
        </div>

        <div className="grid grid-cols-1 items-center gap-8 rounded-lg bg-card p-8 shadow-xl md:grid-cols-2 md:gap-12 md:p-12">
          <div className="relative aspect-square h-auto w-full max-w-md overflow-hidden rounded-lg mx-auto md:h-96">
            <Image
              src={chefImageUrl}
              alt={`Chef at ${restaurantName}`}
              layout="fill"
              objectFit="cover"
              className="transition-transform duration-500 hover:scale-105"
              data-ai-hint="chef portrait kitchen"
            />
          </div>
          <div className="text-center md:text-left">
            <h3 className="mb-4 text-2xl font-semibold text-primary">
              Welcome to {restaurantName}
            </h3>
            <p className="leading-relaxed text-muted-foreground">
              {aboutText}
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              We are committed to providing an unforgettable dining experience with fresh ingredients, exceptional service, and a warm atmosphere. Join us and taste the difference!
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
