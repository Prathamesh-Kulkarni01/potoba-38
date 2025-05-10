
import type { Metadata } from 'next';
import '../globals.css'; // Main global styles
import { ThemeProvider } from '@/components/shared/theme-provider';

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
    // ThemeProvider wraps the content, no extra html/body tags here
    <ThemeProvider
        attribute="class"
        defaultTheme="system" // Or restaurant-specific theme if that system is built
        enableSystem
        disableTransitionOnChange
    >
        {children}
    </ThemeProvider>
  );
}

