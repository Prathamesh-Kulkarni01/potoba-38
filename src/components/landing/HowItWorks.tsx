
import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Sparkles, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const HowItWorks = () => {
  const steps = [
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
  ];

  return (
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
          
          {steps.map((step, index) => (
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
  );
};

export default HowItWorks;
