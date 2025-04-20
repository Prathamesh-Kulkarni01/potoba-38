
import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChefHat, Star, Sparkles, Shield, TrendingUp, Check, Users, ChevronRight, LucideSparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Index = () => {
  const featuresRef = useRef<HTMLDivElement>(null);
  const testimonialRef = useRef<HTMLDivElement>(null);
  
  // Parallax effect on scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const heroImages = document.querySelectorAll('.hero-image');
      
      heroImages.forEach((img, index) => {
        const element = img as HTMLElement;
        const speed = index === 0 ? 0.1 : 0.05;
        element.style.transform = `translateY(${scrollPosition * speed}px)`;
      });
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-food-neutral to-food-neutral/80">
        <div className="absolute inset-0 bg-food-pattern opacity-10"></div>
        <div className="absolute top-20 left-10 w-24 h-24 rounded-full bg-food-secondary/20 blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 rounded-full bg-food-primary/20 blur-3xl"></div>
        
        {/* Navbar */}
        <nav className="container mx-auto py-6 flex justify-between items-center relative z-10">
          <div className="flex items-center space-x-2">
            <img src="/images/potoba-logo.svg" alt="Potoba" className="h-10" />
            <span className="text-xl font-bold text-food-dark">Potoba</span>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-food-dark/80 hover:text-food-primary transition-colors">Features</a>
            <a href="#how-it-works" className="text-food-dark/80 hover:text-food-primary transition-colors">How it Works</a>
            <a href="#testimonials" className="text-food-dark/80 hover:text-food-primary transition-colors">Testimonials</a>
            <a href="#pricing" className="text-food-dark/80 hover:text-food-primary transition-colors">Pricing</a>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/login">
              <Button variant="outline" className="border-food-primary text-food-primary hover:bg-food-primary/10">
                Login
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-food-primary hover:bg-food-primary/90 text-white">
                Sign Up Free
              </Button>
            </Link>
          </div>
        </nav>
        
        {/* Hero Content */}
        <div className="container mx-auto px-4 pt-12 pb-24 md:pt-24 md:pb-32 flex flex-col md:flex-row items-center">
          <motion.div 
            className="md:w-1/2 mb-12 md:mb-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge className="mb-4 bg-food-secondary/20 text-food-secondary border-none px-3 py-1">
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              AI-Powered Food Management
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Revolutionize Your <span className="gradient-text">Restaurant Experience</span> with AI
            </h1>
            <p className="text-lg text-food-dark/80 mb-8 max-w-xl">
              Elevate your restaurant management with our AI-powered platform. Streamline orders, optimize your menu, and delight your customers with personalized experiences.
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <Button size="lg" className="bg-food-primary hover:bg-food-primary/90 text-white btn-glow">
                Get Started Free
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="border-food-primary text-food-primary hover:bg-food-primary/10">
                Watch Demo
              </Button>
            </div>
            <div className="mt-8 flex items-center space-x-6">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200" />
                ))}
              </div>
              <div className="text-sm">
                <span className="text-food-primary font-bold">1,000+</span> restaurants
                <span className="block text-food-dark/70">trust Potoba every day</span>
              </div>
            </div>
          </motion.div>
          
          <div className="md:w-1/2 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-gradient-to-br from-food-primary/20 to-food-secondary/20 blur-3xl"></div>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative z-10"
            >
              <motion.img 
                src="/images/food-doodle-1.svg" 
                alt="Food illustration" 
                className="hero-image absolute -top-20 -right-4 w-32 h-32 animate-float"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              />
              <motion.div
                className="relative z-10 bg-white rounded-xl shadow-xl overflow-hidden card-highlight"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="bg-gradient-to-r from-food-primary to-food-accent text-white p-3 font-semibold flex items-center justify-between">
                  <div className="flex items-center">
                    <Sparkles className="h-4 w-4 mr-2" />
                    <span>TableMaster Dashboard</span>
                  </div>
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 rounded-full bg-white/30"></div>
                    <div className="w-2 h-2 rounded-full bg-white/50"></div>
                    <div className="w-2 h-2 rounded-full bg-white/70"></div>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-food-secondary/5 to-food-primary/5"></div>
                  <div className="p-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500">Today's Revenue</div>
                        <div className="text-2xl font-bold text-food-primary">$1,458.20</div>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-food-primary/10 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-food-primary" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                        <div className="flex items-center mb-2">
                          <Users className="h-4 w-4 text-food-secondary mr-1.5" />
                          <span className="text-xs font-medium">Active Tables</span>
                        </div>
                        <div className="text-lg font-bold">12/15</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                        <div className="flex items-center mb-2">
                          <ChefHat className="h-4 w-4 text-food-accent mr-1.5" />
                          <span className="text-xs font-medium">Orders</span>
                        </div>
                        <div className="text-lg font-bold">24</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-gray-600">Popular Items Today</div>
                      <div className="flex items-center justify-between bg-white p-2 rounded shadow-sm border border-gray-100">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-food-primary/20 rounded-md flex items-center justify-center mr-2">
                            <Star className="h-4 w-4 text-food-primary" />
                          </div>
                          <span className="text-sm">Classic Burger</span>
                        </div>
                        <span className="text-xs bg-food-secondary/10 text-food-secondary px-2 py-1 rounded-full">
                          42 orders
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-white p-2 rounded shadow-sm border border-gray-100">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-food-accent/20 rounded-md flex items-center justify-center mr-2">
                            <Star className="h-4 w-4 text-food-accent" />
                          </div>
                          <span className="text-sm">Caesar Salad</span>
                        </div>
                        <span className="text-xs bg-food-secondary/10 text-food-secondary px-2 py-1 rounded-full">
                          36 orders
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-center">
                      <div className="text-xs text-gray-400 animate-pulse flex items-center">
                        <Sparkles className="h-3 w-3 mr-1 text-food-primary" />
                        AI insights updating...
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
              <motion.img 
                src="/images/food-doodle-2.svg" 
                alt="Food illustration" 
                className="hero-image absolute -bottom-10 -left-10 w-32 h-32 animate-float animation-delay-1000"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              />
            </motion.div>
          </div>
        </div>
        
        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 100" className="w-full">
            <path fill="#fff" fillOpacity="1" d="M0,64L40,58.7C80,53,160,43,240,48C320,53,400,75,480,80C560,85,640,75,720,64C800,53,880,43,960,42.7C1040,43,1120,53,1200,58.7C1280,64,1360,64,1400,64L1440,64L1440,100L1400,100C1360,100,1280,100,1200,100C1120,100,1040,100,960,100C880,100,800,100,720,100C640,100,560,100,480,100C400,100,320,100,240,100C160,100,80,100,40,100L0,100Z"></path>
          </svg>
        </div>
      </section>
      
      {/* Trusted By Logos */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h3 className="text-xl text-food-dark/70">Trusted by leading restaurants worldwide</h3>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
            {['BistroTech', 'FoodFusion', 'CulinaryAI', 'GourmetTech', 'ChefMaster'].map((logo, i) => (
              <div key={i} className="grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
                <div className="h-12 flex items-center font-bold text-lg text-food-dark/80">
                  {logo}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section id="features" ref={featuresRef} className="py-20 bg-food-neutral relative overflow-hidden">
        <div className="absolute inset-0 bg-food-pattern opacity-5"></div>
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-food-primary/20 text-food-primary border-none px-3 py-1">
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              AI-Powered Features
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Intelligent Solutions for Modern Restaurants</h2>
            <p className="text-lg text-food-dark/70 max-w-2xl mx-auto">
              Our platform uses cutting-edge AI to solve your restaurant's biggest challenges
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: TrendingUp,
                title: "AI-Powered Analytics",
                description: "Gain deep insights into customer preferences, predict busy periods, and optimize your menu based on real-time data."
              },
              {
                icon: ChefHat,
                title: "Smart Menu Management",
                description: "Automatically generate menu suggestions, optimize pricing, and highlight your most profitable dishes."
              },
              {
                icon: Users,
                title: "Group Ordering System",
                description: "Let customers at the same table order individually from their phones with our seamless group ordering feature."
              },
              {
                icon: Shield,
                title: "Secure QR Code System",
                description: "Generate unique QR codes for each table that customers can scan to place orders directly from their devices."
              },
              {
                icon: Star,
                title: "Smart Recommendations",
                description: "Offer personalized menu recommendations to your customers based on their preferences and ordering history."
              },
              {
                icon: Sparkles,
                title: "AI-Driven Marketing",
                description: "Create targeted promotions that convert, personalized for each customer segment based on AI insights."
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="bg-white rounded-xl p-6 shadow-sm card-highlight relative z-10"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="w-12 h-12 rounded-full bg-food-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-food-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-food-dark/70">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-food-secondary/20 text-food-secondary border-none px-3 py-1">
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              Simple Process
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How Potoba Works</h2>
            <p className="text-lg text-food-dark/70 max-w-2xl mx-auto">
              Get up and running with our platform in minutes, not months
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 w-3/4 h-0.5 bg-food-primary/20 hidden md:block"></div>
            
            {[
              {
                step: 1,
                title: "Create Your Account",
                description: "Sign up in minutes and configure your restaurant profile with menu items, tables, and staff."
              },
              {
                step: 2,
                title: "Deploy QR Codes",
                description: "Place unique QR codes at each table for customers to scan and order directly from their phones."
              },
              {
                step: 3,
                title: "Watch Orders Flow In",
                description: "Monitor all orders in real-time on your dashboard and let AI optimize your operations."
              }
            ].map((step, index) => (
              <motion.div
                key={index}
                className="flex flex-col items-center text-center relative z-10"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
              >
                <div className="w-16 h-16 rounded-full bg-white border-2 border-food-primary text-food-primary flex items-center justify-center text-xl font-bold mb-4 shadow-md">
                  {step.step}
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-food-dark/70">{step.description}</p>
              </motion.div>
            ))}
          </div>
          
          <div className="mt-16 text-center">
            <Link to="/signup">
              <Button size="lg" className="bg-food-primary hover:bg-food-primary/90 text-white">
                Start Free Trial
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
      
      {/* AI Advantage */}
      <section className="py-20 bg-gradient-to-br from-food-primary/10 to-food-secondary/10 relative overflow-hidden">
        <div className="absolute inset-0 wavy-bg opacity-70"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <motion.div 
              className="lg:w-1/2"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="mb-4 bg-food-primary/20 text-food-primary border-none px-3 py-1">
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                AI Advantage
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Why Our AI Makes The Difference</h2>
              <p className="text-lg text-food-dark/70 mb-8">
                Our sophisticated AI algorithms analyze thousands of data points to help you make smarter business decisions and delight your customers.
              </p>
              
              <div className="space-y-4">
                {[
                  "Analyzes customer behavior to predict trends",
                  "Optimizes menu pricing for maximum profitability",
                  "Personalizes recommendations for each customer",
                  "Forecasts inventory needs to reduce waste",
                  "Automates scheduling based on predicted busy periods"
                ].map((point, i) => (
                  <div key={i} className="flex items-start">
                    <div className="mt-1 mr-3 w-5 h-5 rounded-full bg-food-primary/20 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-food-primary" />
                    </div>
                    <p>{point}</p>
                  </div>
                ))}
              </div>
            </motion.div>
            
            <motion.div 
              className="lg:w-1/2"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-food-primary/40 to-food-secondary/40 rounded-xl blur-3xl opacity-30"></div>
                <img 
                  src="https://placehold.co/600x400/FFF8F6/FF6B35?text=AI+Insights+Dashboard&font=montserrat" 
                  alt="AI Insights Dashboard" 
                  className="relative z-10 rounded-xl shadow-lg w-full"
                />
                <div className="absolute -right-4 -bottom-4 z-0 w-32 h-32 bg-food-accent/20 rounded-full animate-pulse-subtle"></div>
                <div className="absolute -left-4 -top-4 z-0 w-24 h-24 bg-food-secondary/20 rounded-full animate-pulse-subtle"></div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Testimonials */}
      <section id="testimonials" ref={testimonialRef} className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-food-accent/20 text-food-accent border-none px-3 py-1">
              <Star className="mr-1 h-3.5 w-3.5" />
              Customer Stories
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Customers Say</h2>
            <p className="text-lg text-food-dark/70 max-w-2xl mx-auto">
              Hear from restaurant owners who transformed their business with Potoba
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                name: "Alex Chen",
                role: "Owner, Fusion Bistro",
                avatar: "AC",
                content: "Since implementing Potoba, our order accuracy has improved by 98% and our table turnover rate increased by 25%. The AI recommendations are incredibly accurate."
              },
              {
                name: "Maria Rodriguez",
                role: "Manager, Tapas & Wine",
                avatar: "MR",
                content: "The group ordering feature has been a game-changer for large parties. Our customers love being able to order at their own pace, and our staff can focus on service instead of taking orders."
              },
              {
                name: "James Wilson",
                role: "Chef, Urban Plate",
                avatar: "JW",
                content: "The AI analytics helped us identify our most profitable dishes and optimize our menu. We've seen a 30% increase in average order value in just three months."
              }
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                className="bg-food-neutral rounded-xl p-6 shadow-sm relative"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="absolute -top-3 -left-3 text-food-primary text-5xl opacity-20">"</div>
                <p className="mb-6 relative z-10">{testimonial.content}</p>
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-food-primary/20 text-food-primary flex items-center justify-center font-medium mr-3">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <h4 className="font-semibold">{testimonial.name}</h4>
                    <p className="text-sm text-food-dark/70">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="mt-16 bg-gradient-to-r from-food-primary to-food-accent rounded-xl p-8 text-white">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <h3 className="text-4xl font-bold mb-2">98%</h3>
                <p>Order Accuracy</p>
              </div>
              <div className="text-center">
                <h3 className="text-4xl font-bold mb-2">30%</h3>
                <p>Higher Average Orders</p>
              </div>
              <div className="text-center">
                <h3 className="text-4xl font-bold mb-2">25%</h3>
                <p>Faster Table Turnover</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Pricing */}
      <section id="pricing" className="py-20 bg-food-neutral relative overflow-hidden">
        <div className="absolute inset-0 bg-food-pattern opacity-5"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-food-primary/20 text-food-primary border-none px-3 py-1">
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              Simple Pricing
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Choose Your Plan</h2>
            <p className="text-lg text-food-dark/70 max-w-2xl mx-auto">
              Flexible pricing for restaurants of all sizes
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: "Starter",
                price: "29",
                features: [
                  "Up to 10 tables",
                  "Basic menu management",
                  "QR code ordering system",
                  "Email support"
                ],
                highlight: false
              },
              {
                name: "Growth",
                price: "79",
                features: [
                  "Up to 30 tables",
                  "Advanced menu management",
                  "AI-powered recommendations",
                  "Group ordering",
                  "Analytics dashboard",
                  "Priority support"
                ],
                highlight: true
              },
              {
                name: "Enterprise",
                price: "199",
                features: [
                  "Unlimited tables",
                  "Full AI analytics suite",
                  "Custom integrations",
                  "Staff performance tracking",
                  "White-labeled solution",
                  "Dedicated account manager"
                ],
                highlight: false
              }
            ].map((plan, index) => (
              <motion.div
                key={index}
                className={`rounded-xl p-6 shadow-sm relative overflow-hidden ${
                  plan.highlight 
                    ? 'bg-food-primary text-white' 
                    : 'bg-white text-food-dark'
                }`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                {plan.highlight && (
                  <div className="absolute -right-12 -top-12 bg-food-accent/20 w-24 h-24 rounded-full blur-xl"></div>
                )}
                {plan.highlight && (
                  <div className="absolute top-0 right-0 bg-food-accent text-white text-xs px-3 py-1 rounded-bl-lg">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-sm opacity-80">/month</span>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center">
                      <Check className={`h-5 w-5 mr-2 ${
                        plan.highlight ? 'text-white' : 'text-food-primary'
                      }`} />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className={`w-full ${
                    plan.highlight
                      ? 'bg-white text-food-primary hover:bg-white/90'
                      : 'bg-food-primary text-white hover:bg-food-primary/90'
                  }`}
                >
                  Choose Plan
                </Button>
              </motion.div>
            ))}
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-food-dark/70 mb-4">
              All plans include a 14-day free trial. No credit card required.
            </p>
            <a href="#contact" className="text-food-primary hover:underline">
              Need a custom plan? Contact us
            </a>
          </div>
        </div>
      </section>
      
      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-food-primary to-food-secondary text-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Transform Your Restaurant?</h2>
              <p className="text-lg mb-8 opacity-90">
                Join thousands of restaurants already using Potoba to streamline operations, increase revenue, and delight customers.
              </p>
              <Button size="lg" className="bg-white text-food-primary hover:bg-white/90 shadow-lg">
                Start Your Free Trial
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="mt-4 text-sm opacity-80">
                No credit card required. 14-day free trial.
              </p>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-food-dark text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <img src="/images/potoba-logo.svg" alt="Potoba" className="h-8 invert" />
                <span className="text-lg font-bold">Potoba</span>
              </div>
              <p className="text-white/70 mb-4">
                AI-powered restaurant management platform that streamlines operations and enhances the dining experience.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-white/70 hover:text-white">
                  <span className="sr-only">Facebook</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="text-white/70 hover:text-white">
                  <span className="sr-only">Twitter</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-white/70 hover:text-white">
                  <span className="sr-only">Instagram</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="text-white/70 hover:text-white">Features</a></li>
                <li><a href="#pricing" className="text-white/70 hover:text-white">Pricing</a></li>
                <li><a href="#" className="text-white/70 hover:text-white">Case Studies</a></li>
                <li><a href="#" className="text-white/70 hover:text-white">API</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-white/70 hover:text-white">Blog</a></li>
                <li><a href="#" className="text-white/70 hover:text-white">Help Center</a></li>
                <li><a href="#" className="text-white/70 hover:text-white">Guides</a></li>
                <li><a href="#" className="text-white/70 hover:text-white">Events</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-white/70 hover:text-white">About Us</a></li>
                <li><a href="#" className="text-white/70 hover:text-white">Careers</a></li>
                <li><a href="#" className="text-white/70 hover:text-white">Contact</a></li>
                <li><a href="#" className="text-white/70 hover:text-white">Partners</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-white/70 text-sm mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} Potoba. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <a href="#" className="text-white/70 hover:text-white text-sm">Privacy Policy</a>
              <a href="#" className="text-white/70 hover:text-white text-sm">Terms of Service</a>
              <a href="#" className="text-white/70 hover:text-white text-sm">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
