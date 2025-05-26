
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, LayoutGrid, ListOrdered, Settings, BarChartBig } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/waiter/chat', label: 'Chat', icon: MessageSquare, activePaths: ['/waiter/chat'] },
  { href: '/waiter', label: 'Tables', icon: LayoutGrid, activePaths: ['/waiter', '/waiter/order'] },
  { href: '/waiter/tables-status', label: 'Orders', icon: ListOrdered, activePaths: ['/waiter/tables-status'] },
  { href: '/waiter/performance', label: 'Performance', icon: BarChartBig, activePaths: ['/waiter/performance'] },
  { href: '/waiter/settings', label: 'Settings', icon: Settings, activePaths: ['/waiter/settings'] },
];

export function BottomNavigation() {
  const pathname = usePathname();

  const isActive = (itemActivePaths: string[]) => {
    return itemActivePaths.some(activePath => pathname === activePath || (activePath !== '/waiter' && pathname.startsWith(activePath)) || (activePath === '/waiter' && pathname.startsWith('/waiter/order')));
  };
  
   const isTablesExactlyActive = pathname === '/waiter';


  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border shadow-lg md:hidden z-40">
      <div className="container mx-auto h-full">
        <ul className="flex justify-around items-center h-full">
          {navItems.map((item) => {
            let currentItemIsActive;
            if (item.href === '/waiter') {
              currentItemIsActive = isTablesExactlyActive || pathname.startsWith('/waiter/order');
            } else {
              currentItemIsActive = isActive(item.activePaths);
            }

            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center justify-center w-full h-full p-2 transition-colors',
                    currentItemIsActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <item.icon size={22} strokeWidth={currentItemIsActive ? 2.5 : 2} />
                  <span className={cn(
                    'text-xs mt-0.5',
                    currentItemIsActive ? 'font-medium' : 'font-normal'
                  )}>
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
