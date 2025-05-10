
'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';

interface HeroSectionProps {
  restaurantName: string;
  cuisineType: string;
  heroImageUrl: string;
  onOrderNowClick: () => void;
}

export default function HeroSection({
  restaurantName,
  cuisineType,
  heroImageUrl,
  onOrderNowClick,
}: HeroSectionProps) {
  return (
    <section className="relative h-[60vh] min-h-[400px] w-full overflow-hidden md:h-[70vh]">
      <Image
        src={heroImageUrl}
        alt={`Hero image for ${restaurantName}`}
        layout="fill"
        objectFit="cover"
        quality={85}
        priority
        className="brightness-50 filter"
        data-ai-hint="restaurant food hero"
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 p-4 text-center text-white">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-primary md:text-5xl lg:text-6xl">
          Delicious Meals Delivered to Your Doorstep
        </h1>
        <p className="mb-8 max-w-2xl text-lg text-slate-200 md:text-xl">
          Authentic {cuisineType} cuisine made fresh daily at {restaurantName}.
        </p>
        <Button
          size="lg"
          onClick={onOrderNowClick}
          className="bg-accent px-8 py-6 text-lg font-semibold text-accent-foreground shadow-lg transition-transform hover:scale-105 hover:bg-accent/90"
        >
          Order Now
        </Button>
      </div>
    </section>
  );
}
