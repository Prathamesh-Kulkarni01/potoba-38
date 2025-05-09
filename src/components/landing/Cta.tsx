
import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useTheme } from '../theme/ThemeProvider';

const Cta = () => {
  const { theme } = useTheme();
  
  return (
    <section className={`py-20 ${theme === 'dark' ? 'bg-gradient-to-r from-food-primary/40 to-food-secondary/40' : 'bg-gradient-to-r from-food-primary to-food-secondary'} text-white transition-colors duration-300`}>
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
            <div>
              <Button size="lg" className="bg-white text-food-primary hover:bg-white/90 shadow-lg">
                Start Your Free Trial
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <p className="mt-4 text-sm opacity-80">
              No credit card required. 14-day free trial.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Cta;
