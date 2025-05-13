import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth/context';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/shared/theme-provider';
import Head from 'next/head'; // Keep for metadata, but Next/Head for specific tags
import Script from 'next/script';
import FirebaseMessagingInitializer from '@/components/firebase/firebase-messaging-initializer';


const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Potoba - AI-Powered Restaurant Management',
  description: 'Manage your restaurant efficiently with Potoba. AI-powered tools for smart ordering, menu management, and more.',
  keywords: 'restaurant management, AI tools, smart ordering, menu management',
  applicationName: 'Potoba',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Potoba',
  },
  formatDetection: {
    telephone: false,
  },
  manifest: '/manifest.json', // Link to manifest
  themeColor: '#FFB347', // Match manifest theme_color
  openGraph: {
    title: 'Potoba - AI-Powered Restaurant Management',
    description: 'Manage your restaurant efficiently with Potoba. AI-powered tools for smart ordering, menu management, and more.',
    url: 'https://potoba-v1.netlify.app',
    images: [
      {
        url: '/icons/icon-512x512.png', // Use a PWA icon
        width: 512,
        height: 512,
        alt: 'Potoba Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@PotobaApp', // Example Twitter handle
    title: 'Potoba - AI-Powered Restaurant Management',
    description: 'Manage your restaurant efficiently with Potoba. AI-powered tools for smart ordering, menu management, and more.',
    images: ['/icons/icon-512x512.png'], // Use a PWA icon
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <Head>
        {/* Standard viewport, already handled by Next.js by default but good to be explicit */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        
        {/* PWA specific meta tags */}
        <meta name="application-name" content="Potoba" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Potoba" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" /> {/* Optional: for Windows tiles */}
        <meta name="msapplication-TileColor" content="#FFB347" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#FFB347" />

        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="manifest" href="/manifest.json" />
        
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Potoba Team" />
        <link rel="canonical" href="https://potoba-v1.netlify.app" />
        
        {/* JSON-LD Structured Data */}
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication", // Changed to WebApplication
              "name": "Potoba",
              "description": "AI-Powered Restaurant Management Platform",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "All", // Web app
              "url": "https://potoba-v1.netlify.app", // Main app URL
              "logo": "https://potoba-v1.netlify.app/icons/icon-512x512.png", // Absolute URL to logo
              "offers": {
                "@type": "Offer",
                "price": "0", // For free tier or starting price
                "priceCurrency": "INR" 
              },
              "potentialAction": {
                "@type": "CreateAction",
                "target": "https://potoba-v1.netlify.app/signup"
              },
              "sameAs": [ // Add your social media links if available
                // "https://www.facebook.com/potoba",
                // "https://www.twitter.com/potobaapp",
                // "https://www.instagram.com/potoba"
              ]
            })
          }}
          strategy="afterInteractive"
        />
      </Head>
      <body className="antialiased theme-transition"> {/* Added theme-transition for smoother theme changes */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <FirebaseMessagingInitializer />
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
