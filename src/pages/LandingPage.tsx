import React, { useEffect, useState } from 'react';
import {
  Header,
  Hero,
  TrustedBy,
  Features,
  HowItWorks,
  AiAdvantage,
  Testimonials,
  Pricing,
  Cta,
  Footer
} from '@/components/landing';
import { toast } from "@/hooks/use-toast";

const Index = () => {
  // Parallax effect on scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const heroImages = document.querySelectorAll('.hero-image');
      
      heroImages.forEach((img, index) => {
        const element = img as HTMLElement;
        const speed = index === 0 ? 0.1 : 0.05;
        element.style.transform = `translateY(${scrollPosition * speed}px)`;
      });
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [useMockApi, setUseMockApi] = useState(false);

  // useEffect(() => {
  //   const ws = new WebSocket('ws://localhost:8080');
    
  //   ws.onmessage = (event) => {
  //     toast({
  //       description: event.data,
  //       variant: event.data.includes('disconnected') ? 'destructive' : 'default',
  //     });
  //   };

  //   ws.onclose = () => {
  //     toast({
  //       description: 'WebSocket connection closed',
  //       variant: 'destructive',
  //     });
  //   };

  //   return () => ws.close();
  // }, []);


  return (
    <div className="min-h-screen">
      {/* Hero Section with Improved Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-food-neutral to-food-neutral/80">
        <div className="absolute inset-0 bg-food-pattern opacity-10"></div>
        <div className="absolute top-20 left-10 w-24 h-24 rounded-full bg-food-secondary/20 blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 rounded-full bg-food-primary/20 blur-3xl"></div>
        
        <Header />
        <Hero />
        
        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 100" className="w-full">
            <path fill="hsl(var(--background)" fillOpacity="1" d="M0,64L40,58.7C80,53,160,43,240,48C320,53,400,75,480,80C560,85,640,75,720,64C800,53,880,43,960,42.7C1040,43,1120,53,1200,58.7C1280,64,1360,64,1400,64L1440,64L1440,100L1400,100C1360,100,1280,100,1200,100C1120,100,1040,100,960,100C880,100,800,100,720,100C640,100,560,100,480,100C400,100,320,100,240,100C160,100,80,100,40,100L0,100Z"></path>
          </svg>
        </div>
      </section>
      
      <TrustedBy />
      <Features />
      <HowItWorks />
      <AiAdvantage />
      <Testimonials />
      <Pricing />
      <Cta />
      <Footer />
    </div>
  );
};

export default Index;
