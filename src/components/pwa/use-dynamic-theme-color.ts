import { useEffect } from 'react';
import { useTheme } from 'next-themes';

// You can customize these colors to match your app's branding
const LIGHT_THEME_COLOR = '#FFB347'; // Example: orange
const DARK_THEME_COLOR = '#222A3E';  // Example: dark blue

export function useDynamicThemeColor() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const color = resolvedTheme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', color);

    // For iOS status bar
    let appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!appleStatusBar) {
      appleStatusBar = document.createElement('meta');
      appleStatusBar.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
      document.head.appendChild(appleStatusBar);
    }
    // Use 'black' for dark theme for best contrast, 'default' for light
    appleStatusBar.setAttribute('content', resolvedTheme === 'dark' ? 'black' : 'default');

    // Set body background color for iOS status bar overlay
    document.body.style.backgroundColor = color;
  }, [resolvedTheme]);
}
