
import React from 'react';
import { motion } from 'framer-motion';

const TrustedBy = () => {
  const logos = ['BistroTech', 'FoodFusion', 'CulinaryAI', 'GourmetTech', 'ChefMaster'];
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <section className="py-12 bg-white dark:bg-food-dark transition-colors duration-300">
      <div className="container mx-auto px-4">
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h3 className="text-xl text-food-dark/70 dark:text-white/70 transition-colors duration-300">
            Trusted by leading restaurants worldwide
          </h3>
        </motion.div>
        
        <motion.div 
          className="flex flex-wrap justify-center items-center gap-8 md:gap-16"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {logos.map((logo, i) => (
            <motion.div 
              key={i} 
              className="grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
              variants={itemVariants}
              whileHover={{ 
                scale: 1.05,
                transition: { duration: 0.2 }
              }}
            >
              <div className="h-12 flex items-center font-bold text-lg text-food-dark/80 dark:text-white/80 transition-colors duration-300">
                {logo}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default TrustedBy;
