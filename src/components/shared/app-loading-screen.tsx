// src/components/shared/app-loading-screen.tsx
'use client';

import { CookingPot } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AppLoadingScreen({ message = "Loading Potoba..." }: { message?: string }) {
  return (
    <div className={cn(
        "fixed inset-0 z-[200] flex h-screen w-screen flex-col items-center justify-center bg-background theme-transition",
        "wavy-bg" // Added a subtle background pattern from globals.css
    )}>
      <div className="relative flex flex-col items-center p-8 bg-card/80 backdrop-blur-sm rounded-xl shadow-2xl">
        <CookingPot
          className={cn(
            "h-24 w-24 md:h-32 md:w-32 text-primary opacity-0" // Increased size for splash feel
          )}
          style={{ 
            animationName: 'potoba-bounce, potoba-fade-in',
            animationDuration: '1.5s, 0.5s',
            animationIterationCount: 'infinite, 1',
            animationTimingFunction: 'ease-in-out, ease-out',
            animationFillMode: 'forwards',
            animationDelay: '0s, 0.1s'
          }}
        />
        <p className="mt-6 text-xl font-semibold text-primary animate-pulse">
          {message}
        </p>
      </div>
      {/* Keyframes are defined in globals.css to keep this component cleaner */}
    </div>
  );
}
