
import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, ChefHat, Users, Shield, Star, Sparkles } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

const Features = () => {
  const features = [
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
  ];

  return (
    <section id="features" className="py-20 bg-food-neutral relative overflow-hidden">
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
          {features.map((feature, index) => (
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
  );
};

export default Features;
