import React from 'react';
import { useTheme } from '../theme/ThemeProvider';

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

  return (
    <section className="py-16 bg-background text-foreground transition-colors duration-300">
      <div className="container mx-auto px-4">
        <header className="text-center mb-10">
          <h2 className="text-2xl font-bold text-foreground/80 dark:text-foreground/70">
            Trusted by Top Indian Restaurants
          </h2>
        </header>
        <ul className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
          {indianBrands.map((brand) => (
            <li
              key={brand.id}
              style={{
                animation: 'fadeSlideIn 0.5s ease forwards',
                animationDelay: `${brand.id * 0.2}s`,
                opacity: 0,
                transform: 'translateY(20px)',
              }}
              className="text-base md:text-lg font-semibold text-foreground/70 dark:text-foreground/60 px-5 py-2 rounded-full bg-muted/10 hover:bg-muted/20 transition-all duration-300  flex flex-col items-center"
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
