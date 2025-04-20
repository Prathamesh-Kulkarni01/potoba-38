
import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ChevronRight, Sparkle } from 'lucide-react';
import { Button } from "@/components/ui/button";

const Cta = () => {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });
  
  const opacity = useTransform(scrollYProgress, [0, 0.5], [0, 1]);
  const y = useTransform(scrollYProgress, [0, 0.5], [50, 0]);
  
  const particles = Array.from({ length: 8 }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 8 + 4,
    duration: Math.random() * 5 + 10
  }));

  return (
    <section ref={sectionRef} className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-food-primary to-food-secondary"></div>
      
      {/* Floating particles */}
      {particles.map(particle => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-white/20"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.4, 0.8, 0.4]
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="text-center max-w-3xl mx-auto"
          style={{ opacity, y }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">Ready to Transform Your Restaurant?</h2>
            <p className="text-lg mb-8 text-white/90">
              Join thousands of restaurants already using Potoba to streamline operations, increase revenue, and delight customers.
            </p>
            
            <div className="relative">
              <motion.div 
                className="absolute -top-10 -right-10 text-white/20"
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear"
                }}
              >
                <Sparkle className="h-24 w-24" />
              </motion.div>
              
              <Button 
                size="lg" 
                className="bg-white text-food-primary hover:bg-white/90 shadow-lg"
                whileHover={{ 
                  scale: 1.05,
                  transition: { duration: 0.2 }
                }}
              >
                Start Your Free Trial
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            
            <p className="mt-4 text-sm text-white/80">
              No credit card required. 14-day free trial.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Cta;
