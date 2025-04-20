
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import { ThemeToggle } from '../theme/ThemeToggle';

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const toggleMenu = () => setIsOpen(!isOpen);

  const headerClasses = `fixed top-0 w-full z-50 transition-all duration-300 theme-transition
    ${scrolled ? 'py-2 bg-background/90 backdrop-blur-md shadow-md' : 'py-4 bg-transparent'}`;

  return (
    <header className={headerClasses}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img 
              src="/images/icon-logo.png
              alt="Potoba" 
              className="h-10 w-auto mr-2" 
            />
            <span className="text-xl font-bold text-food-primary">Potoba</span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-foreground hover:text-food-primary transition">Home</Link>
            <Link to="#features" className="text-foreground hover:text-food-primary transition">Features</Link>
            <Link to="#pricing" className="text-foreground hover:text-food-primary transition">Pricing</Link>
            <Link to="#about" className="text-foreground hover:text-food-primary transition">About</Link>
            
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Link to="/login">
                <Button variant="outline" className="border-food-primary text-food-primary hover:bg-food-primary hover:text-white">
                  Login
                </Button>
              </Link>
              <Link to="/signup">
                <Button className="bg-food-primary text-white hover:bg-food-primary/90">
                  Sign Up
                </Button>
              </Link>
            </div>
          </nav>
          
          {/* Mobile Menu Button */}
          <div className="flex items-center space-x-4 md:hidden">
            <ThemeToggle />
            <button 
              onClick={toggleMenu}
              className="text-foreground p-2 rounded-md"
              aria-label="Menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden mt-4 rounded-lg bg-background/95 dark:bg-background/90 backdrop-blur-md shadow-lg"
          >
            <div className="flex flex-col py-4 px-2">
              <Link to="/" className="px-4 py-3 text-foreground hover:text-food-primary transition" onClick={toggleMenu}>Home</Link>
              <Link to="#features" className="px-4 py-3 text-foreground hover:text-food-primary transition" onClick={toggleMenu}>Features</Link>
              <Link to="#pricing" className="px-4 py-3 text-foreground hover:text-food-primary transition" onClick={toggleMenu}>Pricing</Link>
              <Link to="#about" className="px-4 py-3 text-foreground hover:text-food-primary transition" onClick={toggleMenu}>About</Link>
              
              <div className="mt-3 px-4 pt-3 border-t border-border">
                <Link to="/login" onClick={toggleMenu}>
                  <Button variant="outline" className="w-full mb-3 border-food-primary text-food-primary hover:bg-food-primary hover:text-white">
                    Login
                  </Button>
                </Link>
                <Link to="/signup" onClick={toggleMenu}>
                  <Button className="w-full bg-food-primary text-white hover:bg-food-primary/90">
                    Sign Up
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
