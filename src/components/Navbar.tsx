
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, User, Settings } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from '@/contexts/AuthContext';
import RestaurantSelector from './RestaurantSelector';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface NavbarProps {
  currentTenant?: string;
}

const Navbar = ({ currentTenant }: NavbarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const { user, logout, getCurrentRestaurant } = useAuth();
  const navigate = useNavigate();
  
  const toggleMenu = () => setIsOpen(!isOpen);
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  // Ensure we don't call getCurrentRestaurant if user is null
  const currentRestaurant = user ? getCurrentRestaurant() : undefined;
  
  const getUserInitials = () => {
    if (!user) return "U";
    const names = user.name.split(" ");
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <nav className="bg-restaurant-primary text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Link to="/" className="text-xl font-bold">TableMaster</Link>
          {user && <RestaurantSelector />}
        </div>

        {isMobile ? (
          <>
            <div className="flex items-center gap-2">
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <Avatar className="h-8 w-8 bg-restaurant-secondary">
                        <AvatarFallback>{getUserInitials()}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>
                      {user.name}
                      <div className="text-xs font-normal text-muted-foreground">{user.email}</div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/account')}>
                      <User className="mr-2 h-4 w-4" />
                      Account
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleMenu}
                className="text-white hover:bg-restaurant-primary/80"
              >
                {isOpen ? <X /> : <Menu />}
              </Button>
            </div>

            {isOpen && (
              <div className="absolute top-16 left-0 right-0 bg-restaurant-primary z-50 p-4 shadow-lg">
                <div className="flex flex-col space-y-4">
                  {user ? (
                    <>
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
                      <Button 
                        variant="ghost" 
                        className="justify-start hover:bg-white/10 px-3 py-2 text-white"
                        onClick={() => {
                          handleLogout();
                          setIsOpen(false);
                        }}
                      >
                        Logout
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link 
                        to="/login" 
                        className="hover:bg-white/10 px-3 py-2 rounded"
                        onClick={() => setIsOpen(false)}
                      >
                        Login
                      </Link>
                      <Link 
                        to="/signup" 
                        className="hover:bg-white/10 px-3 py-2 rounded"
                        onClick={() => setIsOpen(false)}
                      >
                        Sign Up
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="flex space-x-6">
                  <Link to="/dashboard" className="hover:text-restaurant-secondary">Dashboard</Link>
                  <Link to="/dashboard/tables" className="hover:text-restaurant-secondary">Tables</Link>
                  <Link to="/dashboard/menu" className="hover:text-restaurant-secondary">Menu</Link>
                  <Link to="/dashboard/orders" className="hover:text-restaurant-secondary">Orders</Link>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full ml-2">
                      <Avatar className="h-8 w-8 bg-restaurant-secondary">
                        <AvatarFallback>{getUserInitials()}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>
                      {user.name}
                      <div className="text-xs font-normal text-muted-foreground">{user.email}</div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/account')}>
                      <User className="mr-2 h-4 w-4" />
                      Account
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/settings')}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:text-restaurant-secondary">Login</Link>
                <Button asChild className="bg-restaurant-secondary hover:bg-restaurant-secondary/90">
                  <Link to="/signup">Sign Up</Link>
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
