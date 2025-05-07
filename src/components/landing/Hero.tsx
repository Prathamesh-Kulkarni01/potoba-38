
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Sparkles, Star, TrendingUp, Users, ChefHat } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  motion,
  useTransform,
  AnimatePresence,
  useMotionValue,
  useSpring,
} from "framer-motion";

const Hero = () => {
  return (
    <div className="container mx-auto px-4 pt-12 pb-24 md:pt-24 md:pb-32 flex flex-col md:flex-row items-center">
      <motion.div 
        className="md:w-1/2 mb-12 md:mb-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Badge className="mb-4 mt-4 md:mb-0 bg-food-secondary/20 text-food-secondary border-none px-3 py-1">
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
            {/* {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200" />
            ))} */}
            <TestimonialTooltip/>
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
                <span>Potoba Dashboard</span>
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
                    <div className="text-2xl font-bold text-food-primary">₹10,458.20</div>
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
  );
};

export default Hero;


export const TestimonialTooltip = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const springConfig = { stiffness: 100, damping: 5 };

  const x = useMotionValue(0); // going to set this value on mouse move

  // rotate the tooltip
  const rotate = useSpring(
    useTransform(x, [-100, 100], [-45, 45]),
    springConfig
  );

  // translate the tooltip
  const translateX = useSpring(
    useTransform(x, [-100, 100], [-50, 50]),
    springConfig
  );

  const handleMouseMove = (event: any) => {
    const halfWidth = event.target.offsetWidth / 2;
    x.set(event.nativeEvent.offsetX - halfWidth); // set the x value, which is then used in transform and rotate
  };

  const people = [
    {
      id: 1,
      name: "Aditi's Biryani",
      location: "Mumbai",
      image:
        "https://images.unsplash.com/photo-1736239092023-ba677fd6751c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fHJlc3RhdXJhbnQlMjBmb29kJTIwbG9nb3MlMjBtYWhhcmFzdHJhfGVufDB8fDB8fHww",
    },
    {
      id: 2,
      name: "Shree Dattaguru Hotel",
      location: "Pune",
      image:
        "https://images.unsplash.com/photo-1727198826762-8a2bd0cb107b?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
    {
      id: 3,
      name: "Prakash Upahaar Kendra",
      location: "Thane",
      image:
        "https://plus.unsplash.com/premium_photo-1670740967011-86730910a2e5?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8cmVzdGF1cmFudCUyMGZvb2QlMjBsb2dvcyUyMG1haGFyYXN0cmF8ZW58MHx8MHx8fDA%3D",
    },
    {
      id: 4,
      name: "Vihar Restaurant",
      location: "Navi Mumbai",
      image:
        "https://images.unsplash.com/photo-1659354218902-b9e12df1c828?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
    {
      id: 5,
      name: "Chaitanya Restaurant",
      location: "Aurangabad",
      image:
        "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
    {
      id: 6,
      name: "Kailash Prabhu Hotel",
      location: "Kolhapur",
      image:
        "https://images.unsplash.com/photo-1607672694490-d46176973e52?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
  ];

  return (
    <div className="flex flex-row items-center justify-center   w-full">
      {people.map((testimonial, idx) => (
        <div
          className="-mr-4  relative group"
          key={testimonial.name}
          onMouseEnter={() => setHoveredIndex(testimonial.id)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
           <AnimatePresence mode="wait">
              {hoveredIndex === testimonial.id && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.6 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: {
                      type: "spring",
                      stiffness: 260,
                      damping: 10,
                    },
                  }}
                  exit={{ opacity: 0, y: 20, scale: 0.6 }}
                  style={{
                    translateX: translateX,
                    rotate: rotate,
                    whiteSpace: "nowrap",
                  }}
                  className="absolute -top-16 -left-1/2 translate-x-1/2 flex text-xs  flex-col items-center justify-center rounded-md bg-black z-50 shadow-xl px-4 py-2"
                >
                  <div className="absolute inset-x-10 z-30 w-[20%] -bottom-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent h-px " />
                  <div className="absolute left-10 w-[40%] z-30 -bottom-px bg-gradient-to-r from-transparent via-sky-500 to-transparent h-px " />
                  <div className="font-bold text-white relative z-30 text-base">
                    {testimonial.name}
                  </div>
                  <div className="text-white text-xs">
                    {testimonial.location}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          <img
            onMouseMove={handleMouseMove}
            height={50}
            width={50}
            src={testimonial.image}
            alt={testimonial.name}
            className="object-cover !m-0 !p-0 object-top rounded-full h-10 w-10 border-2 group-hover:scale-105 group-hover:z-30 border-white  relative transition duration-500"
          />
        </div>
      ))}
    </div>
  );
};