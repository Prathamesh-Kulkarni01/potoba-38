import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Check } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import AiAnalytics from '../dashboard/AiAnalytics';
import HeroScrollDemo from "@/components/ui/container-scroll-animation-demo";

const AiAdvantage = () => {
  const advantages = [
    "Analyzes customer behavior to predict trends",
    "Optimizes menu pricing for maximum profitability",
    "Personalizes recommendations for each customer",
    "Forecasts inventory needs to reduce waste",
    "Automates scheduling based on predicted busy periods"
  ];

  return (
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
              {advantages.map((point, i) => (
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
              
              <HeroScrollDemo text1="" text2="">
              <AiAnalytics useDummyData={true} />
              </HeroScrollDemo>
              <div className="absolute -right-4 -bottom-4 z-0 w-32 h-32 bg-food-accent/20 rounded-full animate-pulse-subtle"></div>
              <div className="absolute -left-4 -top-4 z-0 w-24 h-24 bg-food-secondary/20 rounded-full animate-pulse-subtle"></div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AiAdvantage;
