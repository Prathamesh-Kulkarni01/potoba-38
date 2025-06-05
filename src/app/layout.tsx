
import type { Metadata, Viewport } from 'next'; // Added Viewport
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth/context';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/shared/theme-provider';
import Head from 'next/head'; 
import Script from 'next/script';
import FirebaseMessagingInitializer from '@/components/firebase/firebase-messaging-initializer';
import { DynamicThemeColorEffect } from '@/components/pwa/DynamicThemeColorEffect';


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
  keywords: 'restaurant management, AI tools, smart ordering, menu management, PWA, food app',
  applicationName: 'Potoba',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default', // Can be 'black-translucent' or 'black'
    title: 'Potoba',
    // startupImage: [ // Optional: For custom iOS splash screens
    //   { url: '/splash/iphone5_splash.png', media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)' },
    // ],
  },
  formatDetection: {
    telephone: false,
  },
  manifest: '/manifest.json',
  // themeColor removed from here
  icons: { // Next.js specific way to define icons, complements manifest
    icon: '/icons/icon-192x192.png',
    shortcut: '/icons/icon-72x72.png',
    apple: '/icons/icon-192x192.png',
    other: [
      { rel: 'apple-touch-icon-precomposed', url: '/icons/icon-192x192.png' },
    ],
  },
  openGraph: {
    title: 'Potoba - AI-Powered Restaurant Management',
    description: 'Manage your restaurant efficiently with Potoba. AI-powered tools for smart ordering, menu management, and more.',
    url: 'https://potoba-v1.netlify.app',
    images: [
      {
        url: '/icons/icon-512x512.png', 
        width: 512,
        height: 512,
        alt: 'Potoba Logo',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@PotobaApp', 
    title: 'Potoba - AI-Powered Restaurant Management',
    description: 'Manage your restaurant efficiently with Potoba. AI-powered tools for smart ordering, menu management, and more.',
    images: ['/icons/icon-512x512.png'], 
  },
};

// Added viewport export for themeColor
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFB347' },
    { media: '(prefers-color-scheme: dark)', color: '#222A3E' },
  ],
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <Head>
        <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, viewport-fit=cover" />
        
        <meta name="application-name" content="Potoba" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Potoba" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" /> 
        <meta name="msapplication-TileColor" content="#FFB347" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Static theme-color meta tag removed, handled by viewport export and DynamicThemeColorEffect */}

        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="manifest" href="/manifest.json" />
        
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Potoba Team" />
        <link rel="canonical" href="https://potoba-v1.netlify.app" />
        
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication", 
              "name": "Potoba",
              "description": "AI-Powered Restaurant Management Platform",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "All", 
              "url": "https://potoba-v1.netlify.app", 
              "logo": "https://potoba-v1.netlify.app/icons/icon-512x512.png", 
              "offers": {
                "@type": "Offer",
                "price": "0", 
                "priceCurrency": "INR" 
              },
              "potentialAction": {
                "@type": "CreateAction",
                "target": "https://potoba-v1.netlify.app/signup"
              }
            })
          }}
          strategy="afterInteractive"
        />
      </Head>
      <body className="antialiased theme-transition">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <FirebaseMessagingInitializer />
            <DynamicThemeColorEffect />
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

