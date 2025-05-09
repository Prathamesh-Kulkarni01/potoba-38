
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BottomNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  hint?: string;
}

interface BottomNavigationBarProps {
  navItems: BottomNavItem[];
}

export default function BottomNavigationBar({ navItems }: BottomNavigationBarProps) {
  const pathname = usePathname();

  if (!navItems || navItems.length === 0) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t bg-background shadow-md md:hidden">
      <div className="flex h-full items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex h-full flex-1 flex-col items-center justify-center gap-1 px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-primary',
                isActive && 'text-primary'
              )}
              aria-label={item.label}
              data-ai-hint={item.hint}
            >
              <item.icon className={cn('h-5 w-5', isActive ? 'text-primary' : '')} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
