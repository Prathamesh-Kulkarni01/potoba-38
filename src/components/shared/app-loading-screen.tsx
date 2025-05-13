// src/components/shared/app-loading-screen.tsx
'use client';

import { CookingPot } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AppLoadingScreen({ message = "Loading Potoba..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-[200] flex h-screen w-screen flex-col items-center justify-center bg-background theme-transition">
      <div className="relative flex flex-col items-center">
        {/* Apply animation directly using style to avoid Tailwind config for animation-delay if not present */}
        <CookingPot
          className={cn(
            "h-20 w-20 md:h-28 md:w-28 text-primary opacity-0"
          )}
          style={{ 
            animationName: 'potoba-bounce, potoba-fade-in',
            animationDuration: '1.5s, 0.5s',
            animationIterationCount: 'infinite, 1',
            animationTimingFunction: 'ease-in-out, ease-out',
            animationFillMode: 'forwards',
            animationDelay: '0s, 0.1s' // fade-in starts slightly after
          }}
        />
        <p className="mt-6 text-lg font-semibold text-primary animate-pulse">
          {message}
        </p>
      </div>
      {/* It's generally better to put keyframes in a global CSS file if they are reused */}
      <style jsx global>{`
        @keyframes potoba-bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-15px);
          }
        }
        @keyframes potoba-fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
