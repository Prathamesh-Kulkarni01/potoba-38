
'use client';

import Link from 'next/link';
import { Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

interface SiteFooterProps {
  restaurantName: string;
}

export default function SiteFooter({ restaurantName }: SiteFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card text-card-foreground border-t border-border/50 py-8 md:py-12 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-semibold text-primary mb-3">{restaurantName}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Experience the finest dining with our freshly prepared meals, crafted with passion and the best ingredients.
            </p>
          </div>
          <div>
            <h4 className="text-md font-semibold text-foreground mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors">Menu</Link></li>
              <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors">Order Online</Link></li>
              <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-md font-semibold text-foreground mb-3">Connect With Us</h4>
            <div className="flex space-x-4 mb-3">
              <Link href="#" aria-label={`${restaurantName} on Facebook`} className="text-muted-foreground hover:text-primary transition-colors"><Facebook size={20} /></Link>
              <Link href="#" aria-label={`${restaurantName} on Twitter`} className="text-muted-foreground hover:text-primary transition-colors"><Twitter size={20} /></Link>
              <Link href="#" aria-label={`${restaurantName} on Instagram`} className="text-muted-foreground hover:text-primary transition-colors"><Instagram size={20} /></Link>
              <Link href="#" aria-label={`${restaurantName} on Youtube`} className="text-muted-foreground hover:text-primary transition-colors"><Youtube size={20} /></Link>
            </div>
            <p className="text-xs text-muted-foreground">
              Stay updated with our latest offers and news!
            </p>
          </div>
        </div>
        <div className="border-t border-border/50 pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            &copy; {currentYear} {restaurantName}. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
