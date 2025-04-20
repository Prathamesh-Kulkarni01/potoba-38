
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ThemeToggle } from '../theme/ThemeToggle';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'backdrop-blur-lg bg-white/10 dark:bg-black/20 shadow-lg' : ''
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          <Link to="/" className="flex items-center space-x-2">
            <motion.img 
              src="/images/potoba-logo.svg" 
              alt="Potoba" 
              className="h-10"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            />
            <motion.span 
              className="text-2xl font-bold text-food-primary dark:text-white"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Potoba
            </motion.span>
          </Link>
          
          <nav className="hidden md:flex items-center space-x-8">
            <motion.div 
              className="flex space-x-6"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {["Features", "How It Works", "Testimonials", "Pricing"].map((item, i) => (
                <a 
                  key={i} 
                  href={`#${item.toLowerCase().replace(/\s/g, '-')}`} 
                  className="text-food-dark/80 dark:text-white/80 hover:text-food-primary dark:hover:text-food-primary font-medium transition-colors"
                >
                  {item}
                </a>
              ))}
            </motion.div>
            
            <motion.div 
              className="flex items-center space-x-4"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <ThemeToggle />
              <Link to="/login">
                <Button variant="ghost" className="text-food-dark/80 dark:text-white/80 hover:text-food-primary dark:hover:text-food-primary">
                  Log in
                </Button>
              </Link>
              <Link to="/signup">
                <Button className="bg-food-primary hover:bg-food-primary/90 text-white">
                  Sign up
                </Button>
              </Link>
            </motion.div>
          </nav>
          
          <div className="md:hidden flex items-center space-x-4">
            <ThemeToggle />
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu">
              {isMenuOpen ? 
                <X className="h-6 w-6 text-food-dark dark:text-white" /> : 
                <Menu className="h-6 w-6 text-food-dark dark:text-white" />
              }
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMenuOpen && (
        <motion.div 
          className="md:hidden bg-white dark:bg-food-dark/95 backdrop-blur-lg"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="container mx-auto px-4 py-4 flex flex-col space-y-4">
            {["Features", "How It Works", "Testimonials", "Pricing"].map((item, i) => (
              <a 
                key={i} 
                href={`#${item.toLowerCase().replace(/\s/g, '-')}`} 
                className="text-food-dark dark:text-white/80 hover:text-food-primary dark:hover:text-food-primary font-medium py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                {item}
              </a>
            ))}
            <div className="flex flex-col space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-center">
                  Log in
                </Button>
              </Link>
              <Link to="/signup" onClick={() => setIsMenuOpen(false)}>
                <Button className="w-full justify-center bg-food-primary hover:bg-food-primary/90">
                  Sign up
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </header>
  );
};

export default Header;
