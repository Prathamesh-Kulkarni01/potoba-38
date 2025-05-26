
'use client';

import Link from 'next/link';
import { ArrowLeft, Menu, LayoutGrid, ListOrdered, Settings as SettingsIcon, MessageSquare, BarChartBig } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname, useRouter } from 'next/navigation'; 
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

const navLinks = [
  { href: '/waiter/chat', label: 'CHAT', icon: MessageSquare },
  { href: '/waiter', label: 'TABLES', icon: LayoutGrid }, 
  { href: '/waiter/tables-status', label: 'ORDERS', icon: ListOrdered }, 
  { href: '/waiter/performance', label: 'PERFORMANCE', icon: BarChartBig },
  { href: '/waiter/settings', label: 'SETTINGS', icon: SettingsIcon },
];


export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();

  let title = "WAITER APP";
                            
  const nonBackArrowWaiterPages = ['/waiter/chat', '/waiter', '/waiter/settings', '/waiter/tables-status', '/waiter/performance'];
  const showBackArrow = pathname.startsWith('/waiter/') && !nonBackArrowWaiterPages.includes(pathname);


  if (pathname === '/waiter') {
    title = "TABLES"; 
  } else if (pathname.startsWith('/waiter/order/') && !pathname.endsWith('/add-item')) {
    const tableId = pathname.split('/')[3]; 
    title = `TABLE ${tableId.replace('t','')}`;
  } else if (pathname.startsWith('/waiter/order/') && pathname.endsWith('/add-item')) {
     const tableId = pathname.split('/')[3]; 
    title = `ADD ITEMS - T${tableId.replace('t','')}`;
  } else if (pathname === '/waiter/chat') {
    title = "CHAT";
  } else if (pathname === '/waiter/tables-status') {
    title = "ORDERS"; 
  } else if (pathname === '/waiter/performance') {
    title = "PERFORMANCE";
  } else if (pathname === '/waiter/settings') {
    title = "SETTINGS";
  }


  return (
    <header className="bg-background text-foreground shadow-sm sticky top-0 z-50 border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showBackArrow ? (
            <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Go back">
              <ArrowLeft size={24} />
            </Button>
          ) : (
             <div className="w-10 h-10 md:hidden" /> 
          )}
          <h1 className="text-xl font-semibold uppercase">{title}</h1>
        </div>

        <div className="flex items-center gap-1">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation menu" className="hidden md:inline-flex">
                <Menu size={24} />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] bg-background p-0 flex flex-col">
              <SheetHeader className="p-6 flex flex-row items-center justify-start gap-3 border-b">
                 <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                    <LayoutGrid size={24} className="text-accent" /> 
                 </div>
                <div>
                  <SheetTitle>Waiter App Menu</SheetTitle>
                </div>
              </SheetHeader>
              
              <nav className="flex-grow p-4 space-y-1">
                {navLinks.map((link) => {
                  const isActive = pathname.startsWith(link.href) && 
                                  (link.href !== '/waiter' || pathname === '/waiter' || pathname.startsWith('/waiter/order'));
                  return (
                    <SheetClose asChild key={link.href}>
                      <Link
                        href={link.href}
                        className={`flex items-center gap-3 rounded-md px-3 py-3 text-base font-medium transition-colors
                          ${isActive
                            ? 'bg-primary/10 text-primary font-semibold' 
                            : 'hover:bg-muted/80 text-foreground/80'
                          }`}
                      >
                        {link.icon && <link.icon size={22} className={isActive ? 'text-primary': 'text-muted-foreground'} />}
                        <span>{link.label}</span>
                      </Link>
                    </SheetClose>
                  );
                })}
              </nav>
              <Separator />
              <div className="p-4 mt-auto">
                <SheetClose asChild>
                     <Button variant="outline" className="w-full rounded-full border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => router.push('/login')}>
                        LOGOUT
                      </Button>
                  </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
