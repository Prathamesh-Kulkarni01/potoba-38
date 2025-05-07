import React from 'react';
import { useTheme } from '../theme/ThemeProvider';

const indianBrands = [
  'Biryani Blues',
  'Barbeque Nation',
  'The Yellow Chilli',
  'Mainland China',
  'Saravana Bhavan',
];

const TrustedBy = () => {
  const { theme } = useTheme();

  return (
    <section className="py-16 bg-background text-foreground transition-colors duration-300">
      <div className="container mx-auto px-4">
        <header className="text-center mb-10">
          <h2 className="text-2xl font-bold text-foreground/80 dark:text-foreground/70">
            Trusted by Top Indian Restaurants
          </h2>
        </header>
        <ul className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
          {indianBrands.map((brand, index) => (
            <li
              key={index}
              style={{
                animation: 'fadeSlideIn 0.5s ease forwards',
                animationDelay: `${index * 0.2}s`,
                opacity: 0,
                transform: 'translateY(20px)',
              }}
              className="text-base md:text-lg font-semibold text-foreground/70 dark:text-foreground/60 px-5 py-2 rounded-full border border-foreground/10 bg-muted/10 hover:bg-muted/20 transition-all duration-300 shadow-sm"
            >
              {brand}
            </li>
          ))}
        </ul>
      </div>

      {/* Animation Styles */}
      <style jsx>{`
        @keyframes fadeSlideIn {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
};

export default TrustedBy;
