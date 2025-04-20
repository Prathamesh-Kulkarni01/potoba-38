
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { 
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="relative z-20 border-b border-white/10 backdrop-blur-sm bg-white/5">
      <div className="container mx-auto py-4">
        <div className="flex justify-between items-center">
          {/* Logo and Brand */}
          <motion.div 
            className="flex items-center space-x-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-food-primary to-food-accent rounded-full blur-sm opacity-40 animate-pulse-subtle"></div>
              <img src="/images/potoba-logo.svg" alt="Potoba" className="h-10 relative z-10" />
            </div>
            <span className="text-xl font-bold text-food-dark bg-clip-text text-transparent bg-gradient-to-r from-food-primary via-food-dark to-food-accent">Potoba</span>
          </motion.div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent text-food-dark hover:text-food-primary hover:bg-white/20">Features</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                      {[
                        {
                          title: "AI-Powered Analytics",
                          href: "#features",
                          description: "Get deep insights into your restaurant performance"
                        },
                        {
                          title: "Smart Menu Management",
                          href: "#features",
                          description: "Optimize your menu for maximum profitability"
                        },
                        {
                          title: "Group Ordering System",
                          href: "#features",
                          description: "Let customers at the same table order individually"
                        },
                        {
                          title: "QR Code System",
                          href: "#features",
                          description: "Generate unique QR codes for each table"
                        }
                      ].map((item) => (
                        <li key={item.title}>
                          <NavigationMenuLink asChild>
                            <a
                              href={item.href}
                              className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-food-primary/10 hover:text-food-primary focus:bg-accent focus:text-accent-foreground"
                            >
                              <div className="text-sm font-medium leading-none">{item.title}</div>
                              <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                                {item.description}
                              </p>
                            </a>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link to="#how-it-works" className={cn(navigationMenuTriggerStyle(), "bg-transparent text-food-dark hover:text-food-primary hover:bg-white/20")}>
                    How it Works
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link to="#testimonials" className={cn(navigationMenuTriggerStyle(), "bg-transparent text-food-dark hover:text-food-primary hover:bg-white/20")}>
                    Testimonials
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link to="#pricing" className={cn(navigationMenuTriggerStyle(), "bg-transparent text-food-dark hover:text-food-primary hover:bg-white/20")}>
                    Pricing
                  </Link>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>
          
          {/* Auth Buttons */}
          <motion.div 
            className="hidden md:flex items-center space-x-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link to="/login">
              <Button variant="ghost" className="text-food-dark hover:text-food-primary hover:bg-white/20">
                Login
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-gradient-to-r from-food-primary to-food-accent hover:opacity-90 text-white shadow-md hover:shadow-lg transition-all duration-300">
                Sign Up Free
              </Button>
            </Link>
          </motion.div>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-food-dark hover:bg-white/20"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {isMenuOpen && (
          <motion.div 
            className="md:hidden py-4 mt-2"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col space-y-3">
              <a href="#features" className="px-4 py-2 rounded-md hover:bg-white/10 text-food-dark hover:text-food-primary">Features</a>
              <a href="#how-it-works" className="px-4 py-2 rounded-md hover:bg-white/10 text-food-dark hover:text-food-primary">How it Works</a>
              <a href="#testimonials" className="px-4 py-2 rounded-md hover:bg-white/10 text-food-dark hover:text-food-primary">Testimonials</a>
              <a href="#pricing" className="px-4 py-2 rounded-md hover:bg-white/10 text-food-dark hover:text-food-primary">Pricing</a>
              <div className="flex flex-col space-y-2 pt-2 border-t border-white/10">
                <Link to="/login">
                  <Button variant="ghost" className="w-full justify-start text-food-dark hover:text-food-primary hover:bg-white/10">
                    Login
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button className="w-full bg-gradient-to-r from-food-primary to-food-accent hover:opacity-90 text-white">
                    Sign Up Free
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </header>
  );
};

export default Header;
