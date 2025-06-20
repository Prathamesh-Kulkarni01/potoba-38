
'use client';

import { useEffect, useState } from 'react';
import { CookingPot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppLoadingScreenProps {
  message?: string;
  error?: string;
  progress?: number;
  timeout?: number;
}

export default function AppLoadingScreen({ 
  message = "Loading Potoba...", 
  error, 
  progress,
  timeout = 10000
}: AppLoadingScreenProps) {
  const [showLongLoadingMessage, setShowLongLoadingMessage] = useState(false);
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);

  useEffect(() => {
    // Show messages for long loading and timeout states
    const longLoadTimer = setTimeout(() => {
      setShowLongLoadingMessage(true);
    }, 5000); // Show after 5 seconds

    const timeoutTimer = setTimeout(() => {
      setShowTimeoutMessage(true);
    }, timeout);

    return () => {
      clearTimeout(longLoadTimer);
      clearTimeout(timeoutTimer);
    };
  }, []);

  return (
    <div className={cn(
      "fixed inset-0 z-[200] flex h-screen w-screen flex-col items-center justify-center bg-background/90 theme-transition",
      "wavy-bg"
    )}>
      <div className="relative flex flex-col items-center p-8  rounded-xl shadow-2xl max-w-lg w-full mx-4">
        <div className="relative mb-6">
          {error ? (
            <div className="text-destructive">
              <CookingPot className="h-24 w-24 md:h-32 md:w-32" />
              <div className="mt-4 text-center">
                <p className="font-semibold text-lg mb-2">Error Loading</p>
                <p className="text-sm text-muted-foreground">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 text-sm text-primary hover:underline"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <>
              <CookingPot
                className={cn(
                  "h-24 w-24 md:h-32 md:w-32 text-primary opacity-0"
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
              <div className="absolute inset-0 animate-ping-slow rounded-full bg-primary/20" />
            </>
          )}
        </div>
        
        {!error && (
          <>
            <p className="text-xl font-semibold text-primary animate-pulse">
              {message}
            </p>
            
            {progress !== undefined && (
              <div className="w-full max-w-xs mt-4">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }} 
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {progress}% complete
                </p>
              </div>
            )}
            
            {showLongLoadingMessage && !showTimeoutMessage && (
              <p className="mt-4 text-sm text-muted-foreground opacity-80 max-w-[250px] text-center">
                This is taking longer than usual. Please ensure you have a stable internet connection.
              </p>
            )}
            
            {showTimeoutMessage && (
              <div className="mt-4 text-center">
                <p className="text-sm text-destructive mb-2">
                  Loading is taking too long
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="text-sm text-primary hover:underline"
                >
                  Click here to refresh the page
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
    