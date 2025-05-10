
// src/app/not-found.tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <AlertTriangle className="h-20 w-20 text-destructive mb-6" />
      <h1 className="text-4xl font-bold text-foreground mb-3">Oops! Page Not Found</h1>
      <p className="text-lg text-muted-foreground mb-8 max-w-md">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      <div className="flex space-x-4">
        <Button asChild variant="outline">
          <Link href="/">Go to Homepage</Link>
        </Button>
        <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
       <p className="text-sm text-muted-foreground mt-12">
        If you believe this is an error, please contact support.
      </p>
    </div>
  )
}
