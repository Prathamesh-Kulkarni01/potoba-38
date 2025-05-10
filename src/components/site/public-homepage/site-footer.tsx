
'use client';

import Link from 'next/link';
import { Facebook, Instagram, Twitter, Youtube, MapPin, Phone, Mail } from 'lucide-react';

interface SiteFooterProps {
  restaurantName: string;
}

const socialLinks = [
  { Icon: Facebook, href: '#', label: 'Facebook' },
  { Icon: Instagram, href: '#', label: 'Instagram' },
  { Icon: Twitter, href: '#', label: 'Twitter' },
  { Icon: Youtube, href: '#', label: 'Youtube' },
];

const footerLinks = [
  { href: '#', label: 'About Us' },
  { href: '#', label: 'FAQ' },
  { href: '#', label: 'Privacy Policy' },
  { href: '#', label: 'Terms & Conditions' },
  { href: '#', label: 'Contact Us' },
];

export default function SiteFooter({ restaurantName }: SiteFooterProps) {
  return (
    <footer id="contact-section" className="bg-card text-card-foreground border-t border-border">
      <div className="container mx-auto px-4 py-12 md:px-6 md:py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3 lg:grid-cols-4">
          {/* Restaurant Info */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-primary">{restaurantName}</h3>
            <address className="not-italic text-sm text-muted-foreground space-y-2">
              <p className="flex items-start">
                <MapPin className="mr-2 mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>123 Food Street, Flavor Town, CA 90210</span>
              </p>
              <p className="flex items-center">
                <Phone className="mr-2 h-4 w-4 shrink-0 text-accent" />
                <a href="tel:+1234567890" className="hover:text-primary">(123) 456-7890</a>
              </p>
              <p className="flex items-center">
                <Mail className="mr-2 h-4 w-4 shrink-0 text-accent" />
                <a href={`mailto:info@${restaurantName.toLowerCase().replace(/\s+/g, '')}.com`} className="hover:text-primary">
                  info@{restaurantName.toLowerCase().replace(/\s+/g, '')}.com
                </a>
              </p>
            </address>
          </div>

          {/* Quick Links */}
          <div className="md:col-start-2 lg:col-start-3">
            <h4 className="mb-4 text-md font-semibold text-foreground">Quick Links</h4>
            <ul className="space-y-2">
              {footerLinks.map(link => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter/Social */}
          <div className="lg:col-span-1">
            <h4 className="mb-4 text-md font-semibold text-foreground">Stay Connected</h4>
            <p className="mb-3 text-sm text-muted-foreground">
              Follow us on social media for the latest updates and offers.
            </p>
            <div className="flex space-x-3">
              {socialLinks.map(({ Icon, href, label }) => (
                <Link key={label} href={href} aria-label={label} className="text-muted-foreground hover:text-primary">
                  <Icon className="h-5 w-5" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} {restaurantName}. All Rights Reserved. Powered by AuthZen.
          </p>
        </div>
      </div>
    </footer>
  );
}
