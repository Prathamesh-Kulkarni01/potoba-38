
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { 
  QrCode, 
  Utensils, 
  Users, 
  BarChart4, 
  Check, 
  ChevronRight, 
  Clock, 
  LineChart,
  Star,
  LucideIcon,
  Shield
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

type FeatureProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  iconColor: string;
  bgColor: string;
}

const Feature = ({ icon: Icon, title, description, iconColor, bgColor }: FeatureProps) => (
  <div className="flex flex-col items-start p-6 bg-white rounded-xl shadow-sm border hover:shadow-md transition-all duration-300">
    <div className={`h-12 w-12 ${bgColor} rounded-lg flex items-center justify-center mb-5`}>
      <Icon className={`h-6 w-6 ${iconColor}`} />
    </div>
    <h3 className="text-xl font-semibold mb-3">{title}</h3>
    <p className="text-muted-foreground">{description}</p>
  </div>
);

const PricingCard = ({ title, price, features, isPopular }: { 
  title: string; 
  price: string; 
  features: string[];
  isPopular?: boolean;
}) => (
  <Card className={`relative ${isPopular ? 'border-restaurant-primary shadow-lg' : 'border shadow-sm'}`}>
    {isPopular && (
      <div className="absolute -top-3 left-0 right-0 mx-auto w-28 rounded-full bg-restaurant-primary py-1 text-xs font-medium text-white text-center">
        Most Popular
      </div>
    )}
    <CardHeader className="text-center">
      <CardTitle className="text-2xl">{title}</CardTitle>
      <CardDescription>
        <span className="text-3xl font-bold">{price}</span>
        {price !== 'Custom' && <span className="text-muted-foreground">/month</span>}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <ul className="space-y-3 mb-6">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center">
            <Check className="h-4 w-4 text-restaurant-primary mr-2 shrink-0" />
            <span className="text-sm">{feature}</span>
          </li>
        ))}
      </ul>
      <Button asChild className={`w-full ${isPopular ? 'bg-restaurant-primary' : 'bg-gray-800'}`}>
        <Link to={"/signup"}>Get Started</Link>
      </Button>
    </CardContent>
  </Card>
);

const Testimonial = ({ quote, author, role }: { quote: string; author: string; role: string }) => (
  <div className="bg-white p-8 rounded-xl shadow-sm border relative">
    <div className="absolute -top-4 left-8 text-5xl text-restaurant-primary/30">"</div>
    <p className="text-lg mb-6 pt-4">{quote}</p>
    <div className="flex items-center">
      <div className="h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center mr-4">
        {author.charAt(0)}
      </div>
      <div>
        <p className="font-semibold">{author}</p>
        <p className="text-sm text-muted-foreground">{role}</p>
      </div>
    </div>
  </div>
);

const Index = () => {
  const { user } = useAuth();
  
  const features: FeatureProps[] = [
    {
      icon: Users,
      title: "Smart Table Management",
      description: "Optimize seating arrangements, track availability, and manage reservations in real-time.",
      iconColor: "text-restaurant-primary",
      bgColor: "bg-restaurant-primary/10"
    },
    {
      icon: Utensils,
      title: "Digital Menu System",
      description: "Create stunning digital menus with photos, descriptions, and easy category organization.",
      iconColor: "text-restaurant-secondary",
      bgColor: "bg-restaurant-secondary/10"
    },
    {
      icon: QrCode,
      title: "Contactless Ordering",
      description: "Allow customers to scan QR codes to view menus and place orders directly from their phones.",
      iconColor: "text-restaurant-accent",
      bgColor: "bg-restaurant-accent/10"
    },
    {
      icon: BarChart4,
      title: "Sales Analytics",
      description: "Gain valuable insights into your business with detailed reports and analytics.",
      iconColor: "text-purple-600",
      bgColor: "bg-purple-100"
    },
    {
      icon: Clock,
      title: "Real-time Updates",
      description: "Get instant notifications about new orders, table status changes, and more.",
      iconColor: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      icon: Shield,
      title: "Secure Platform",
      description: "Enterprise-grade security to protect your restaurant and customer data.",
      iconColor: "text-green-600",
      bgColor: "bg-green-100"
    }
  ];

  const pricingPlans = [
    {
      title: "Starter",
      price: "$49",
      features: [
        "Up to 15 tables",
        "Digital menu management",
        "QR code ordering",
        "Basic analytics",
        "Email support"
      ]
    },
    {
      title: "Professional",
      price: "$99",
      features: [
        "Up to 50 tables",
        "Advanced menu management",
        "QR code ordering",
        "Detailed analytics & reports",
        "Priority support",
        "Staff management",
        "Custom branding"
      ],
      isPopular: true
    },
    {
      title: "Enterprise",
      price: "Custom",
      features: [
        "Unlimited tables",
        "Custom integrations",
        "Advanced security",
        "24/7 premium support",
        "Dedicated account manager",
        "Custom development options",
        "Multi-location support"
      ]
    }
  ];

  const testimonials = [
    {
      quote: "TableMaster completely transformed how we manage our restaurant. Orders are faster, customers are happier, and our staff is more efficient.",
      author: "Michael Rodriguez",
      role: "Owner, Fusion Bistro"
    },
    {
      quote: "The analytics features alone are worth the price. We've been able to optimize our menu and staffing based on the insights from TableMaster.",
      author: "Sarah Johnson",
      role: "Manager, Coastal Grill"
    },
    {
      quote: "Our customers love being able to order directly from their phones. It's increased our average order value by 22%!",
      author: "David Chen",
      role: "Owner, Spice & Rice"
    },
    {
      quote: "Implementation was incredibly easy, and their support team is fantastic. They responded to all our questions within hours.",
      author: "Jessica Williams",
      role: "Operations Director, Urban Plate"
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-restaurant-primary to-restaurant-accent overflow-hidden">
        <div className="absolute inset-0 bg-gray-900/70"></div>
        <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Revolutionize Your Restaurant Management
            </h1>
            <p className="text-xl text-white/90 mb-8">
              TableMaster is the all-in-one platform for modern restaurants. Manage tables, menus, and orders with a simple, intuitive system.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              {user ? (
                <Button asChild size="lg" className="bg-white text-restaurant-primary hover:bg-white/90">
                  <Link to="/dashboard">Go to Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg" className="bg-white text-restaurant-primary hover:bg-white/90">
                    <Link to="/signup">Start Free Trial</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                    <Link to="/login">Sign In</Link>
                  </Button>
                </>
              )}
            </div>
            <div className="mt-12 bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-white/10 max-w-xs mx-auto">
              <div className="flex items-center justify-center gap-2 text-white">
                <Star className="h-5 w-5 text-yellow-400" fill="#FACC15" />
                <Star className="h-5 w-5 text-yellow-400" fill="#FACC15" />
                <Star className="h-5 w-5 text-yellow-400" fill="#FACC15" />
                <Star className="h-5 w-5 text-yellow-400" fill="#FACC15" />
                <Star className="h-5 w-5 text-yellow-400" fill="#FACC15" />
              </div>
              <p className="text-white/90 text-sm mt-2 text-center">
                Trusted by over 2,000+ restaurants worldwide
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">Powerful Features for Modern Restaurants</h2>
            <p className="text-xl text-muted-foreground">
              TableMaster provides everything you need to run your restaurant efficiently
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Feature key={index} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="lg:w-1/2">
              <h2 className="text-3xl font-bold mb-6">How TableMaster Works</h2>
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="h-10 w-10 bg-restaurant-primary text-white rounded-full flex items-center justify-center shrink-0">1</div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Set up your restaurant profile</h3>
                    <p className="text-muted-foreground">
                      Add your restaurant details, configure tables, and upload your menu items.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-10 w-10 bg-restaurant-secondary text-white rounded-full flex items-center justify-center shrink-0">2</div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Generate unique QR codes</h3>
                    <p className="text-muted-foreground">
                      Create and print QR codes for each table that link to your digital menu.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-10 w-10 bg-restaurant-accent text-white rounded-full flex items-center justify-center shrink-0">3</div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Customers place orders</h3>
                    <p className="text-muted-foreground">
                      Customers scan the QR code, browse your menu, and place orders from their devices.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-10 w-10 bg-purple-600 text-white rounded-full flex items-center justify-center shrink-0">4</div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Manage orders and analytics</h3>
                    <p className="text-muted-foreground">
                      Receive orders in real-time, track performance, and gain valuable business insights.
                    </p>
                  </div>
                </div>
                <div className="mt-8">
                  <Button asChild className="bg-restaurant-primary" size="lg">
                    <Link to="/signup">
                      Get Started Now
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
            <div className="lg:w-1/2">
              <div className="bg-white p-4 rounded-2xl shadow-lg border">
                <img 
                  src="/placeholder.svg" 
                  alt="TableMaster Dashboard" 
                  className="w-full rounded-xl"
                />
                <div className="bg-gray-50 mt-4 p-4 rounded-xl">
                  <p className="text-sm font-medium mb-2">Restaurant Dashboard</p>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-muted-foreground">4 active tables</span>
                    <div className="h-3 w-3 bg-yellow-500 rounded-full ml-4"></div>
                    <span className="text-sm text-muted-foreground">2 pending orders</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-restaurant-primary">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-white">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">2,000+</div>
              <div>Restaurants</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">5M+</div>
              <div>Orders Processed</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">25%</div>
              <div>Average Revenue Increase</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">15min</div>
              <div>Setup Time</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">What Our Customers Say</h2>
            <p className="text-xl text-muted-foreground">
              Join thousands of restaurant owners who have transformed their business with TableMaster
            </p>
          </div>
          
          <Carousel className="w-full max-w-5xl mx-auto">
            <CarouselContent>
              {testimonials.map((testimonial, index) => (
                <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/2 pl-4 pr-4">
                  <Testimonial {...testimonial} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="flex justify-center mt-8">
              <CarouselPrevious className="static transform-none mx-2" />
              <CarouselNext className="static transform-none mx-2" />
            </div>
          </Carousel>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-muted-foreground">
              Choose the plan that works best for your restaurant
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <PricingCard key={index} {...plan} />
            ))}
          </div>
          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-6">
              All plans include a 14-day free trial. No credit card required.
            </p>
            <Button asChild variant="outline" size="lg">
              <Link to="/signup">
                Compare all features
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="bg-gradient-to-br from-restaurant-primary/90 to-restaurant-accent/90 rounded-3xl p-12 shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-food-pattern opacity-10"></div>
            <div className="relative z-10 text-center">
              <h2 className="text-3xl font-bold mb-4">Ready to transform your restaurant?</h2>
              <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
                Join thousands of successful restaurants using TableMaster to increase efficiency and boost profits.
              </p>
              <Button asChild size="lg" className="bg-white text-restaurant-primary hover:bg-white/90">
                <Link to="/signup">Start Your Free Trial</Link>
              </Button>
              <p className="mt-4 text-sm text-white/80">
                No credit card required. 14-day free trial.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h3 className="text-xl font-bold mb-4">TableMaster</h3>
              <p className="text-white/70 mb-4">
                Revolutionizing restaurant management with smart technology.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-white/70 hover:text-white">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="text-white/70 hover:text-white">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-white/70 hover:text-white">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-white/70 hover:text-white">Features</a></li>
                <li><a href="#" className="text-white/70 hover:text-white">Pricing</a></li>
                <li><a href="#" className="text-white/70 hover:text-white">Testimonials</a></li>
                <li><a href="#" className="text-white/70 hover:text-white">API</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Resources</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-white/70 hover:text-white">Help Center</a></li>
                <li><a href="#" className="text-white/70 hover:text-white">Blog</a></li>
                <li><a href="#" className="text-white/70 hover:text-white">Guides</a></li>
                <li><a href="#" className="text-white/70 hover:text-white">Webinars</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-white/70 hover:text-white">About</a></li>
                <li><a href="#" className="text-white/70 hover:text-white">Careers</a></li>
                <li><a href="#" className="text-white/70 hover:text-white">Contact</a></li>
                <li><a href="#" className="text-white/70 hover:text-white">Partners</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 mt-8 text-center sm:flex sm:justify-between">
            <p className="text-white/70 text-sm">© 2025 TableMaster. All rights reserved.</p>
            <div className="mt-4 sm:mt-0">
              <a href="#" className="text-white/70 hover:text-white text-sm mx-3">Privacy Policy</a>
              <a href="#" className="text-white/70 hover:text-white text-sm mx-3">Terms of Service</a>
              <a href="#" className="text-white/70 hover:text-white text-sm mx-3">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
