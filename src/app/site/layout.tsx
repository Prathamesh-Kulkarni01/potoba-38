
import type { Metadata } from 'next';
// import { Geist, Geist_Mono } from 'next/font/google'; // Assuming these are project fonts
import '../globals.css'; // Main global styles
import { ThemeProvider } from '@/components/shared/theme-provider'; // For dark/light mode if applicable

// const geistSans = Geist({
//   variable: '--font-geist-sans',
//   subsets: ['latin'],
// });

// const geistMono = Geist_Mono({
//   variable: '--font-geist-mono',
//   subsets: ['latin'],
// });

// Default metadata, can be overridden by specific restaurant pages
export const metadata: Metadata = {
  title: 'Welcome to Our Restaurant',
  description: 'Discover our delicious menu and unique dining experience.',
};

export default function RestaurantSiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Remove <html> and <body> tags as they are provided by the root layout
    // <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
    //   <body className="antialiased">
        <ThemeProvider
            attribute="class"
            defaultTheme="system" // Or restaurant-specific theme if that system is built
            enableSystem
            disableTransitionOnChange
        >
            {children}
        </ThemeProvider>
    //   </body>
    // </html>
  );
}

