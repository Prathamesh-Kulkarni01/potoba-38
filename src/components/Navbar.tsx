
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface NavbarProps {
  currentTenant?: string;
}

const Navbar = ({ currentTenant }: NavbarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <nav className="bg-restaurant-primary text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Link to="/" className="text-xl font-bold">TableMaster</Link>
          {currentTenant && (
            <span className="text-sm bg-white/20 px-2 py-1 rounded">{currentTenant}</span>
          )}
        </div>

        {isMobile ? (
          <>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleMenu}
              className="text-white hover:bg-restaurant-primary/80"
            >
              {isOpen ? <X /> : <Menu />}
            </Button>

            {isOpen && (
              <div className="absolute top-16 left-0 right-0 bg-restaurant-primary z-50 p-4 shadow-lg">
                <div className="flex flex-col space-y-4">
                  <Link 
                    to="/dashboard" 
                    className="hover:bg-white/10 px-3 py-2 rounded"
                    onClick={() => setIsOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link 
                    to="/dashboard/tables" 
                    className="hover:bg-white/10 px-3 py-2 rounded"
                    onClick={() => setIsOpen(false)}
                  >
                    Tables
                  </Link>
                  <Link 
                    to="/dashboard/menu" 
                    className="hover:bg-white/10 px-3 py-2 rounded"
                    onClick={() => setIsOpen(false)}
                  >
                    Menu
                  </Link>
                  <Link 
                    to="/dashboard/orders" 
                    className="hover:bg-white/10 px-3 py-2 rounded"
                    onClick={() => setIsOpen(false)}
                  >
                    Orders
                  </Link>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex space-x-6">
            <Link to="/dashboard" className="hover:text-restaurant-secondary">Dashboard</Link>
            <Link to="/dashboard/tables" className="hover:text-restaurant-secondary">Tables</Link>
            <Link to="/dashboard/menu" className="hover:text-restaurant-secondary">Menu</Link>
            <Link to="/dashboard/orders" className="hover:text-restaurant-secondary">Orders</Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
