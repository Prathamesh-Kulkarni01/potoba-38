
import { useEffect, useRef } from 'react';
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
  Shield,
  Star,
  LucideIcon,
  ArrowRight,
  Globe,
  Zap,
  Layers,
  CreditCard,
  PieChart,
  MonitorSmartphone,
  Smartphone,
  CloudLightning,
  Gift
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
import { motion } from "framer-motion";

type FeatureProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  iconColor: string;
  bgColor: string;
}

const Feature = ({ icon: Icon, title, description, iconColor, bgColor }: FeatureProps) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5 }}
    className="flex flex-col items-start p-6 bg-white rounded-xl shadow-sm border hover:shadow-md transition-all duration-300"
  >
    <div className={`h-12 w-12 ${bgColor} rounded-lg flex items-center justify-center mb-5`}>
      <Icon className={`h-6 w-6 ${iconColor}`} />
    </div>
    <h3 className="text-xl font-semibold mb-3">{title}</h3>
    <p className="text-muted-foreground">{description}</p>
  </motion.div>
);

const PricingCard = ({ title, price, features, isPopular }: { 
  title: string; 
  price: string; 
  features: string[];
  isPopular?: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay: 0.1 }}
  >
    <Card className={`relative ${isPopular ? 'border-restaurant-primary shadow-lg' : 'border shadow-sm'} h-full`}>
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
  </motion.div>
);

const Testimonial = ({ quote, author, role }: { quote: string; author: string; role: string }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5 }}
    className="bg-white p-8 rounded-xl shadow-sm border relative h-full"
  >
    <div className="absolute -top-4 left-8 text-5xl text-restaurant-primary/30">"</div>
    <p className="text-lg mb-6 pt-4">{quote}</p>
    <div className="flex items-center">
      <div className="h-12 w-12 bg-gradient-to-br from-restaurant-primary to-restaurant-accent rounded-full flex items-center justify-center mr-4 text-white font-medium">
        {author.charAt(0)}
      </div>
      <div>
        <p className="font-semibold">{author}</p>
        <p className="text-sm text-muted-foreground">{role}</p>
      </div>
    </div>
  </motion.div>
);

const ScrollReveal = ({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.6, delay }}
  >
    {children}
  </motion.div>
);

const ParallaxSection = ({ children, speed = 0.5 }: { children: React.ReactNode, speed?: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleScroll = () => {
      if (ref.current) {
        const scrollY = window.scrollY;
        ref.current.style.transform = `translateY(${scrollY * speed}px)`;
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);
  
  return (
    <div ref={ref} className="will-change-transform">
      {children}
    </div>
  );
};

const FloatingElement = ({ children, duration = 4 }: { children: React.ReactNode, duration?: number }) => (
  <motion.div
    animate={{ y: [0, -10, 0] }}
    transition={{ 
      duration, 
      repeat: Infinity, 
      ease: "easeInOut" 
    }}
  >
    {children}
  </motion.div>
);

const Index = () => {
  const { user } = useAuth();
  
  const features: FeatureProps[] = [
    {
      icon: Smartphone,
      title: "Smart Device Integration",
      description: "Seamlessly connect with tablets, phones, and POS hardware for a unified system.",
      iconColor: "text-restaurant-primary",
      bgColor: "bg-restaurant-primary/10"
    },
    {
      icon: Utensils,
      title: "Menu Management",
      description: "Create stunning digital menus with real-time updates, inventory tracking and pricing controls.",
      iconColor: "text-restaurant-secondary",
      bgColor: "bg-restaurant-secondary/10"
    },
    {
      icon: QrCode,
      title: "Contactless Experience",
      description: "QR code ordering, digital payments, and contactless operations for modern dining.",
      iconColor: "text-restaurant-accent",
      bgColor: "bg-restaurant-accent/10"
    },
    {
      icon: BarChart4,
      title: "Advanced Analytics",
      description: "Real-time reports, sales forecasting, and business intelligence dashboards with AI insights.",
      iconColor: "text-purple-600",
      bgColor: "bg-purple-100"
    },
    {
      icon: CreditCard,
      title: "Payment Processing",
      description: "Integrated payment solutions with multi-currency support and split bill functionality.",
      iconColor: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      icon: CloudLightning,
      title: "Cloud-Powered System",
      description: "Access your business data from anywhere with our secure, scalable cloud infrastructure.",
      iconColor: "text-green-600",
      bgColor: "bg-green-100"
    }
  ];

  const pricingPlans = [
    {
      title: "Starter",
      price: "$79",
      features: [
        "1 restaurant location",
        "Up to 5 POS terminals",
        "Standard payment processing",
        "Basic reporting",
        "Email support",
        "Cloud backups",
        "Regular updates"
      ]
    },
    {
      title: "Professional",
      price: "$149",
      features: [
        "Up to 3 restaurant locations",
        "Unlimited POS terminals",
        "Advanced inventory management",
        "Customer loyalty program",
        "Priority 24/7 support",
        "Staff management system",
        "API access",
        "Custom branding"
      ],
      isPopular: true
    },
    {
      title: "Enterprise",
      price: "Custom",
      features: [
        "Unlimited locations",
        "White-label solution",
        "Custom integrations",
        "Advanced security features",
        "Dedicated account manager",
        "Staff training programs",
        "Hardware bundle options",
        "Custom development"
      ]
    }
  ];

  const testimonials = [
    {
      quote: "Potoba POS transformed how we manage our restaurant chain. The multi-location features and real-time analytics helped us increase overall revenue by 32% in just six months.",
      author: "Michael Rodriguez",
      role: "CEO, Fusion Restaurant Group"
    },
    {
      quote: "The cloud-based system means I can check on business performance from anywhere. As someone who manages multiple locations, this flexibility has been game-changing.",
      author: "Sarah Johnson",
      role: "Operations Director, Coastal Restaurants"
    },
    {
      quote: "Our customers love the QR ordering system, and our staff loves how easy inventory management is. Potoba POS paid for itself within the first 3 months.",
      author: "David Chen",
      role: "Owner, Spice & Rice Franchise"
    },
    {
      quote: "The level of customization available with Potoba POS is impressive. Their team helped us tailor the system perfectly to our unique business model and workflows.",
      author: "Jessica Williams",
      role: "CTO, Urban Plate Group"
    }
  ];

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Hero Section with Parallax */}
      <section className="relative bg-gradient-to-br from-gray-900 to-gray-800 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <ParallaxSection speed={0.2}>
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-restaurant-primary/20 rounded-full filter blur-3xl"></div>
          </ParallaxSection>
          <ParallaxSection speed={0.3}>
            <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-restaurant-secondary/20 rounded-full filter blur-3xl"></div>
          </ParallaxSection>
          <ParallaxSection speed={0.1}>
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-restaurant-accent/20 rounded-full filter blur-3xl"></div>
          </ParallaxSection>
        </div>
        <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"></div>
        <div className="container mx-auto px-4 py-24 md:py-36 relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <img src="/images/potoba-logo.svg" alt="Potoba POS" className="h-20 mx-auto mb-6" />
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight"
              >
                Next-Generation POS for <span className="text-gradient-primary">Modern Restaurants</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="text-xl text-white/90 mb-10 max-w-3xl mx-auto"
              >
                Potoba POS combines powerful restaurant management tools with an intuitive interface to streamline operations, boost sales, and deliver exceptional customer experiences.
              </motion.p>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="flex flex-col sm:flex-row justify-center gap-4"
              >
                {user ? (
                  <Button asChild size="lg" className="bg-white text-restaurant-primary hover:bg-white/90">
                    <Link to="/dashboard">Go to Dashboard</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild size="lg" className="bg-restaurant-primary hover:bg-restaurant-primary/90 text-white font-medium group">
                      <Link to="/signup">
                        Start Free Trial
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                      <Link to="/login">Sign In</Link>
                    </Button>
                  </>
                )}
              </motion.div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="mt-16 relative"
            >
              <FloatingElement>
                <div className="bg-white/5 backdrop-blur-md p-2 rounded-2xl border border-white/10 shadow-2xl">
                  <div className="relative rounded-xl overflow-hidden aspect-video">
                    <img 
                      src="/placeholder.svg" 
                      alt="Potoba POS Dashboard" 
                      className="w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 bg-black/30 backdrop-blur-sm rounded-lg px-3 py-1 text-white text-sm flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      Live Dashboard
                    </div>
                  </div>
                </div>
              </FloatingElement>
              <div className="absolute -bottom-4 -right-4 bg-restaurant-primary text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg">
                <span className="flex items-center"><Zap className="mr-1 h-4 w-4" /> Powered by AI</span>
              </div>
            </motion.div>
            <div className="mt-20 flex flex-wrap justify-center gap-x-16 gap-y-8 text-white text-center">
              <ScrollReveal delay={0.1}>
                <div className="flex flex-col items-center">
                  <div className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-restaurant-primary to-restaurant-accent">10k+</div>
                  <div className="text-white/70">Active Restaurants</div>
                </div>
              </ScrollReveal>
              <ScrollReveal delay={0.2}>
                <div className="flex flex-col items-center">
                  <div className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-restaurant-primary to-restaurant-accent">$2B+</div>
                  <div className="text-white/70">Processed Annually</div>
                </div>
              </ScrollReveal>
              <ScrollReveal delay={0.3}>
                <div className="flex flex-col items-center">
                  <div className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-restaurant-primary to-restaurant-accent">99.9%</div>
                  <div className="text-white/70">Uptime Guarantee</div>
                </div>
              </ScrollReveal>
              <ScrollReveal delay={0.4}>
                <div className="flex flex-col items-center">
                  <div className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-restaurant-primary to-restaurant-accent">28%</div>
                  <div className="text-white/70">Average Revenue Boost</div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 w-full h-20 bg-gradient-to-t from-white to-transparent"></div>
      </section>

      {/* Trusted By Section */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <ScrollReveal>
              <h2 className="text-xl text-gray-600 mb-8">Trusted by leading restaurant brands worldwide</h2>
            </ScrollReveal>
            <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <ScrollReveal key={i} delay={i * 0.1}>
                  <div className="h-12 w-32 bg-gray-200 rounded-md flex items-center justify-center text-gray-400">
                    LOGO {i}
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section with Modern Design */}
      <section className="py-24 bg-gray-50 relative overflow-hidden">
        <ParallaxSection speed={0.1}>
          <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-gradient-to-br from-restaurant-primary/10 to-restaurant-secondary/10 rounded-bl-full"></div>
        </ParallaxSection>
        <ParallaxSection speed={0.2}>
          <div className="absolute bottom-0 left-0 w-1/4 h-1/4 bg-gradient-to-tr from-restaurant-secondary/10 to-restaurant-accent/10 rounded-tr-full"></div>
        </ParallaxSection>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <ScrollReveal>
              <span className="inline-block px-3 py-1 bg-restaurant-primary/10 text-restaurant-primary rounded-full text-sm font-medium mb-4">POWERFUL FEATURES</span>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <h2 className="text-4xl font-bold mb-6">Everything You Need to Run Your Restaurant Business</h2>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <p className="text-xl text-muted-foreground">
                A comprehensive suite of tools that gives you complete control over your restaurant operations
              </p>
            </ScrollReveal>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Feature key={index} {...feature} />
            ))}
          </div>
          <div className="mt-16 text-center">
            <ScrollReveal delay={0.3}>
              <Button asChild size="lg" className="bg-gray-900 hover:bg-gray-800">
                <Link to="/signup">
                  Explore All Features
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* App Preview Section with Parallax */}
      <section className="py-24 bg-white overflow-hidden relative">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2 order-2 lg:order-1 relative">
              <ParallaxSection speed={-0.2}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="relative z-10"
                >
                  <div className="bg-white rounded-2xl shadow-2xl p-4 border border-gray-100">
                    <img 
                      src="/placeholder.svg" 
                      alt="Potoba POS Dashboard" 
                      className="w-full rounded-xl"
                    />
                    
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium">System Status: Online</span>
                      </div>
                      <div className="text-sm text-muted-foreground">Updated just now</div>
                    </div>
                  </div>
                </motion.div>
              </ParallaxSection>
              <div className="absolute -z-10 -bottom-10 -left-10 w-80 h-80 bg-restaurant-secondary/10 rounded-full filter blur-3xl"></div>
              <div className="absolute -z-10 -top-10 -right-10 w-80 h-80 bg-restaurant-accent/10 rounded-full filter blur-3xl"></div>
            </div>
            
            <div className="lg:w-1/2 order-1 lg:order-2">
              <ScrollReveal>
                <span className="inline-block px-3 py-1 bg-restaurant-secondary/10 text-restaurant-secondary rounded-full text-sm font-medium mb-4">INTELLIGENT SYSTEM</span>
              </ScrollReveal>
              <ScrollReveal delay={0.1}>
                <h2 className="text-4xl font-bold mb-6">A Smart POS That Adapts to Your Business</h2>
              </ScrollReveal>
              <ScrollReveal delay={0.2}>
                <p className="text-xl mb-8 text-muted-foreground">
                  Potoba POS uses AI and machine learning to provide actionable insights, optimize your menu, predict inventory needs, and enhance customer experiences.
                </p>
              </ScrollReveal>
              
              <div className="space-y-6">
                <ScrollReveal delay={0.3}>
                  <div className="flex gap-4">
                    <div className="h-10 w-10 bg-restaurant-primary text-white rounded-full flex items-center justify-center shrink-0">
                      <PieChart className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Smart Analytics</h3>
                      <p className="text-muted-foreground">
                        Real-time data visualization and predictive analytics to make informed decisions.
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
                
                <ScrollReveal delay={0.4}>
                  <div className="flex gap-4">
                    <div className="h-10 w-10 bg-restaurant-secondary text-white rounded-full flex items-center justify-center shrink-0">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Seamless Integration</h3>
                      <p className="text-muted-foreground">
                        Connect with your existing tools for accounting, delivery, and marketing.
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
                
                <ScrollReveal delay={0.5}>
                  <div className="flex gap-4">
                    <div className="h-10 w-10 bg-restaurant-accent text-white rounded-full flex items-center justify-center shrink-0">
                      <MonitorSmartphone className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Multi-Device Support</h3>
                      <p className="text-muted-foreground">
                        Consistent experience across desktop, tablets, and mobile devices.
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              </div>
              
              <ScrollReveal delay={0.6}>
                <div className="mt-10">
                  <Button asChild className="bg-restaurant-primary" size="lg">
                    <Link to="/signup">
                      Request a Demo
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section with Animated Counter */}
      <section className="py-20 bg-gradient-to-r from-restaurant-primary to-restaurant-accent relative overflow-hidden">
        <div className="absolute inset-0 bg-pattern opacity-10"></div>
        <div className="container mx-auto px-4 relative">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-white">
            <ScrollReveal delay={0.1}>
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">10k+</div>
                <div className="text-white/80 text-lg">Active Restaurants</div>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">28%</div>
                <div className="text-white/80 text-lg">Revenue Increase</div>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.3}>
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">15min</div>
                <div className="text-white/80 text-lg">Setup Time</div>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.4}>
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">24/7</div>
                <div className="text-white/80 text-lg">Expert Support</div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-gray-50 relative overflow-hidden">
        <ParallaxSection speed={0.1}>
          <div className="absolute top-1/3 right-0 w-1/4 h-1/4 bg-restaurant-primary/5 rounded-l-full"></div>
        </ParallaxSection>
        <ParallaxSection speed={0.15}>
          <div className="absolute bottom-1/3 left-0 w-1/5 h-1/5 bg-restaurant-secondary/5 rounded-r-full"></div>
        </ParallaxSection>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <ScrollReveal>
              <span className="inline-block px-3 py-1 bg-restaurant-accent/10 text-restaurant-accent rounded-full text-sm font-medium mb-4">TESTIMONIALS</span>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <h2 className="text-4xl font-bold mb-4">Success Stories from Restaurant Owners</h2>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <p className="text-xl text-muted-foreground">
                Join thousands of restaurant owners who have transformed their business with Potoba POS
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.3}>
              <div className="flex justify-center items-center gap-1 mt-8">
                <Star className="h-6 w-6 text-yellow-400" fill="#FACC15" />
                <Star className="h-6 w-6 text-yellow-400" fill="#FACC15" />
                <Star className="h-6 w-6 text-yellow-400" fill="#FACC15" />
                <Star className="h-6 w-6 text-yellow-400" fill="#FACC15" />
                <Star className="h-6 w-6 text-yellow-400" fill="#FACC15" />
                <span className="ml-2 text-lg font-medium">4.9/5 from 2,400+ reviews</span>
              </div>
            </ScrollReveal>
          </div>
          
          <Carousel className="w-full max-w-6xl mx-auto">
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
      <section className="py-24 bg-white relative overflow-hidden">
        <ParallaxSection speed={0.15}>
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-gradient-to-br from-restaurant-primary/5 to-restaurant-secondary/5 rounded-full"></div>
        </ParallaxSection>
        <ParallaxSection speed={0.1}>
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-gradient-to-br from-restaurant-accent/5 to-restaurant-primary/5 rounded-full"></div>
        </ParallaxSection>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <ScrollReveal>
              <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium mb-4">PRICING</span>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <h2 className="text-4xl font-bold mb-4">Transparent, Value-Driven Pricing</h2>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <p className="text-xl text-muted-foreground">
                Choose the plan that works best for your restaurant business
              </p>
            </ScrollReveal>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <PricingCard key={index} {...plan} />
            ))}
          </div>
          <div className="text-center mt-16">
            <ScrollReveal delay={0.3}>
              <div className="bg-gray-50 rounded-xl p-6 max-w-3xl mx-auto">
                <h3 className="text-lg font-semibold mb-3 flex items-center justify-center">
                  <Gift className="h-5 w-5 mr-2 text-restaurant-primary" />
                  All plans include:
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-8 text-left max-w-xl mx-auto">
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-restaurant-primary mr-2" />
                    <span className="text-sm">14-day free trial</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-restaurant-primary mr-2" />
                    <span className="text-sm">No credit card required</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-restaurant-primary mr-2" />
                    <span className="text-sm">Free onboarding</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-restaurant-primary mr-2" />
                    <span className="text-sm">Regular product updates</span>
                  </div>
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.4}>
              <p className="mt-8 text-center text-muted-foreground">
                Need a custom solution? <Link to="/signup" className="text-restaurant-primary font-medium">Contact our sales team</Link>
              </p>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gray-900 text-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="bg-gradient-to-br from-restaurant-primary/90 to-restaurant-accent/90 rounded-3xl p-16 shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-food-pattern opacity-10"></div>
            <ParallaxSection speed={0.1}>
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/5 rounded-full"></div>
            </ParallaxSection>
            <ParallaxSection speed={0.15}>
              <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/5 rounded-full"></div>
            </ParallaxSection>
            
            <div className="relative z-10">
              <div className="max-w-3xl mx-auto text-center">
                <ScrollReveal>
                  <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to revolutionize your restaurant?</h2>
                </ScrollReveal>
                <ScrollReveal delay={0.1}>
                  <p className="text-xl mb-10 text-white/90">
                    Join thousands of successful restaurants using Potoba POS to increase efficiency, boost profits, and deliver exceptional customer experiences.
                  </p>
                </ScrollReveal>
                <ScrollReveal delay={0.2}>
                  <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <Button asChild size="lg" className="bg-white text-restaurant-primary hover:bg-white/90 font-medium">
                      <Link to="/signup">Start Your Free Trial</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                      <Link to="/login">Schedule Demo</Link>
                    </Button>
                  </div>
                </ScrollReveal>
                <ScrollReveal delay={0.3}>
                  <p className="mt-6 text-sm text-white/80">
                    No credit card required. 14-day free trial. Cancel anytime.
                  </p>
                </ScrollReveal>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
              <img src="/images/potoba-logo.svg" alt="Potoba POS" className="h-12 mb-6" />
              <p className="text-white/70 mb-4">
                Next-generation POS system revolutionizing restaurant management.
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
            <p className="text-white/70 text-sm">© 2025 Potoba POS. All rights reserved.</p>
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
