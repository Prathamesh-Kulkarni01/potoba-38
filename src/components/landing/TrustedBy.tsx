
import React from 'react';
import { useTheme } from '../theme/ThemeProvider';

const TrustedBy = () => {
  const { theme } = useTheme();
  
  return (
    <section className="py-12 bg-background text-foreground transition-colors duration-300">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h3 className="text-xl text-foreground/70 dark:text-foreground/60">Trusted by leading restaurants worldwide</h3>
        </div>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
          {['BistroTech', 'FoodFusion', 'CulinaryAI', 'GourmetTech', 'ChefMaster'].map((logo, i) => (
            <div key={i} className="grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
              <div className="h-12 flex items-center font-bold text-lg text-foreground/80 dark:text-foreground/70">
                {logo}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustedBy;
