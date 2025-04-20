
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { QrCode, Utensils, Users, BarChart4 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen bg-restaurant-background">
      <header className="bg-restaurant-primary text-white py-8">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">TableMaster</h1>
              <p className="mt-2 text-restaurant-primary-foreground/80">
                Modern table and menu management for restaurants
              </p>
            </div>
            <div className="mt-4 md:mt-0 space-x-4">
              {user ? (
                <Button asChild className="bg-restaurant-secondary text-white hover:bg-restaurant-secondary/90">
                  <Link to="/dashboard">Go to Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="outline" className="text-white border-white hover:bg-white/10">
                    <Link to="/login">Log In</Link>
                  </Button>
                  <Button asChild className="bg-restaurant-secondary text-white hover:bg-restaurant-secondary/90">
                    <Link to="/signup">Get Started</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="py-20">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h2 className="text-4xl font-bold mb-8">Manage Your Restaurant with Ease</h2>
          <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto">
            TableMaster provides a complete solution for restaurant owners to manage tables, 
            menus, and orders in a single platform.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-12">
            <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-all duration-200">
              <div className="h-12 w-12 bg-restaurant-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="h-6 w-6 text-restaurant-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Table Management</h3>
              <p className="text-muted-foreground">
                Easily manage tables, track availability, and handle reservations.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-all duration-200">
              <div className="h-12 w-12 bg-restaurant-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Utensils className="h-6 w-6 text-restaurant-secondary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Menu Management</h3>
              <p className="text-muted-foreground">
                Create and manage digital menus with easy updates and categories.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-all duration-200">
              <div className="h-12 w-12 bg-restaurant-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <QrCode className="h-6 w-6 text-restaurant-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3">QR Code Ordering</h3>
              <p className="text-muted-foreground">
                Let customers scan a QR code to view menus and place orders directly.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-all duration-200">
              <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <BarChart4 className="h-6 w-6 text-gray-700" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Order Insights</h3>
              <p className="text-muted-foreground">
                Get valuable insights on sales, popular items, and customer preferences.
              </p>
            </div>
          </div>
          
          <div className="mt-16">
            {user ? (
              <Button asChild className="bg-restaurant-primary hover:bg-restaurant-primary/90 px-8 py-6 text-lg">
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
            ) : (
              <Button asChild className="bg-restaurant-primary hover:bg-restaurant-primary/90 px-8 py-6 text-lg">
                <Link to="/signup">Start Free Trial</Link>
              </Button>
            )}
          </div>
        </div>
      </section>
      
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <h2 className="text-3xl font-bold mb-6">How It Works</h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="h-10 w-10 bg-restaurant-primary text-white rounded-full flex items-center justify-center shrink-0">1</div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Set up your restaurant</h3>
                    <p className="text-muted-foreground">
                      Create your restaurant profile and add your tables and menu items.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-10 w-10 bg-restaurant-secondary text-white rounded-full flex items-center justify-center shrink-0">2</div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Generate QR codes</h3>
                    <p className="text-muted-foreground">
                      Generate unique QR codes for each table that customers can scan.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-10 w-10 bg-restaurant-accent text-white rounded-full flex items-center justify-center shrink-0">3</div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Manage orders</h3>
                    <p className="text-muted-foreground">
                      Receive and manage orders through the dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="md:w-1/2">
              <div className="bg-white p-8 rounded-lg shadow-md border">
                <img 
                  src="/placeholder.svg" 
                  alt="TableMaster Dashboard" 
                  className="w-full rounded-lg shadow-sm" 
                />
                <p className="mt-4 text-sm text-center text-muted-foreground">
                  The TableMaster dashboard
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <footer className="bg-restaurant-primary text-white py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">TableMaster</h2>
              <p className="mt-2 text-sm opacity-80">© 2025 TableMaster. All rights reserved.</p>
            </div>
            <div className="mt-6 md:mt-0">
              <ul className="flex space-x-6">
                <li><a href="#" className="hover:text-restaurant-secondary">About</a></li>
                <li><a href="#" className="hover:text-restaurant-secondary">Features</a></li>
                <li><a href="#" className="hover:text-restaurant-secondary">Pricing</a></li>
                <li><a href="#" className="hover:text-restaurant-secondary">Contact</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
