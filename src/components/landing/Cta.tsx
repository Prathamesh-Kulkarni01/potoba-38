
import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";

const Cta = () => {
  return (
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
            <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.2 }}>
              <Button size="lg" className="bg-white text-food-primary hover:bg-white/90 shadow-lg">
                Start Your Free Trial
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
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
