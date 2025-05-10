
'use client';

import Image from 'next/image';
import { Utensils } from 'lucide-react';

interface DishImageGalleryProps {
  imageUrl?: string | null;
  itemName: string;
}

export default function DishImageGallery({ imageUrl, itemName }: DishImageGalleryProps) {
  return (
    <div className="relative h-64 md:h-96 w-full overflow-hidden rounded-lg shadow-lg bg-muted">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={itemName}
          layout="fill"
          objectFit="cover"
          className="transition-transform duration-300 hover:scale-105"
          data-ai-hint="delicious food item closeup"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <Utensils className="h-24 w-24 opacity-50" />
        </div>
      )}
      {/* Add thumbnails or multiple image support here if needed later */}
    </div>
  );
}
