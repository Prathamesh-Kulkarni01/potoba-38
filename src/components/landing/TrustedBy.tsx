import React from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useMediaQuery } from 'react-responsive';

const indianBrands = [
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

const TrustedBy = () => {
  const { theme } = useTheme();
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const { scrollY } = useScroll();
  const x = useTransform(scrollY, [700, 2500], [0, isMobile ? -400 : 0]);

  return (
    <section className="py-16 bg-background text-foreground transition-colors duration-300">
      <div className="container mx-auto px-4">
        <header className="text-center mb-10">
          <h2 className="text-2xl font-bold text-foreground/80 dark:text-foreground/70">
            Trusted by Top Indian Restaurants
          </h2>
        </header>
        <div className="overflow-hidden">
          <motion.ul
            className="flex flex-nowrap gap-6 md:gap-10 justify-center"
            style={{ x }}
          >
            {indianBrands.map((brand) => (
              <li
                key={brand.id}
                className="text-base md:text-lg font-semibold md:min-w-[00px] text-foreground/70 dark:text-foreground/60 px-5 py-2 rounded-full  hover:bg-muted/20 transition-all duration-300  flex flex-col items-center"
              >
                <img
                  src={brand.image}
                  alt={brand.name}
                  className="w-16 h-16 rounded-full mb-2 object-cover"
                />
                <span>{brand.name}</span>
                <span className="text-sm text-foreground/50">{brand.location}</span>
              </li>
            ))}
          </motion.ul>
        </div>
      </div>

      {/* Animation Styles */}
      <style jsx>{`
        ul {
          -ms-overflow-style: none; /* Internet Explorer 10+ */
          scrollbar-width: none; /* Firefox */
        }

        ul::-webkit-scrollbar {
          display: none; /* Safari and Chrome */
        }
      `}</style>
    </section>
  );
};

export default TrustedBy;
