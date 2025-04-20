
import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

type ConnectionStatusProps = {
  status: 'idle' | 'loading' | 'success' | 'error';
};

export const ApiConnectionStatus: React.FC<ConnectionStatusProps> = ({ status }) => {
  if (status === 'idle') {
    return (
      <div className="flex items-center text-muted-foreground">
        <AlertCircle className="mr-2 h-4 w-4" />
        <span>Not tested</span>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        <span>Testing connection...</span>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex items-center text-green-500 dark:text-green-400">
        <CheckCircle className="mr-2 h-4 w-4" />
        <span>Connected successfully</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center text-destructive">
        <XCircle className="mr-2 h-4 w-4" />
        <span>Connection failed</span>
      </div>
    );
  }

  return null;
};
