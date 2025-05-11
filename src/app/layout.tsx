import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth/context';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/shared/theme-provider';
import Head from 'next/head';
import Script from 'next/script';

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
  openGraph: {
    title: 'Potoba - AI-Powered Restaurant Management',
    description: 'Manage your restaurant efficiently with Potoba. AI-powered tools for smart ordering, menu management, and more.',
    url: 'https://potoba-v1.netlify.app',
    images: [
      {
        url: '/public/images/logo.png',
        width: 800,
        height: 600,
        alt: 'Potoba Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Potoba',
    title: 'Potoba - AI-Powered Restaurant Management',
    description: 'Manage your restaurant efficiently with Potoba. AI-powered tools for smart ordering, menu management, and more.',
    image: '/public/images/logo.png',
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
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Potoba Team" />
        <link rel="canonical" href="https://potoba-v1.netlify.app" />
        {/* JSON-LD Structured Data */}
        <Script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Potoba",
              "url": "https://www.potoba.com",
              "logo": "https://www.potoba.com/public/images/logo.png",
              "sameAs": [
                "https://www.facebook.com/potoba",
                "https://www.twitter.com/potoba",
                "https://www.instagram.com/potoba"
              ]
            })
          }}
        />
      </Head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

