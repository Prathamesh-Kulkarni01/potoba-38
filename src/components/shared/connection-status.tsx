// Network connection monitor
import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

import { db } from '@/lib/firebase/config';
import { enableNetwork, disableNetwork } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isFirestoreOnline, setIsFirestoreOnline] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      enableNetwork(db).then(() => {
        setIsFirestoreOnline(true);
        toast({
          title: 'Connection restored',
          description: 'You\'re back online',
          duration: 3000,
        });
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      disableNetwork(db).then(() => {
        setIsFirestoreOnline(false);
        toast({
          title: 'Connection lost',
          description: 'Working offline. Changes will sync when connection is restored.',
          duration: null,
          variant: 'destructive',
        });
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial connection check
    const checkConnection = async () => {
      try {
        await fetch('/api/health-check');
        setIsOnline(true);
      } catch (error) {
        setIsOnline(false);
      }
    };
    
    checkConnection();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  return {
    isOnline,
    isFirestoreOnline,
  };
}

export function ConnectionStatus() {
  const { isOnline } = useConnectionStatus();

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOnline && (
        <div className="flex items-center space-x-2 bg-destructive text-destructive-foreground px-4 py-2 rounded-md shadow-lg">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Offline</span>
        </div>
      )}
    </div>
  );
}
