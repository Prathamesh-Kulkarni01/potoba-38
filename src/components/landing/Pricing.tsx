
import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Pricing = () => {
  const plans = [
    {
      name: "Starter",
      price: "29",
      features: [
        "Up to 10 tables",
        "Basic menu management",
        "QR code ordering system",
        "Email support"
      ],
      highlight: false
    },
    {
      name: "Growth",
      price: "79",
      features: [
        "Up to 30 tables",
        "Advanced menu management",
        "AI-powered recommendations",
        "Group ordering",
        "Analytics dashboard",
        "Priority support"
      ],
      highlight: true
    },
    {
      name: "Enterprise",
      price: "199",
      features: [
        "Unlimited tables",
        "Full AI analytics suite",
        "Custom integrations",
        "Staff performance tracking",
        "White-labeled solution",
        "Dedicated account manager"
      ],
      highlight: false
    }
  ];

  return (
    <section id="pricing" className="py-20 bg-food-neutral relative overflow-hidden">
      <div className="absolute inset-0 bg-food-pattern opacity-5"></div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-food-primary/20 text-food-primary border-none px-3 py-1">
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            Simple Pricing
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Choose Your Plan</h2>
          <p className="text-lg text-food-dark/70 max-w-2xl mx-auto">
            Flexible pricing for restaurants of all sizes
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              className={`rounded-xl p-6 shadow-sm relative overflow-hidden ${
                plan.highlight 
                  ? 'bg-food-primary text-white' 
                  : 'bg-white text-food-dark'
              }`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              {plan.highlight && (
                <div className="absolute -right-12 -top-12 bg-food-accent/20 w-24 h-24 rounded-full blur-xl"></div>
              )}
              {plan.highlight && (
                <div className="absolute top-0 right-0 bg-food-accent text-white text-xs px-3 py-1 rounded-bl-lg">
                  Most Popular
                </div>
              )}
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="text-sm opacity-80">/month</span>
              </div>
              
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center">
                    <Check className={`h-5 w-5 mr-2 ${
                      plan.highlight ? 'text-white' : 'text-food-primary'
                    }`} />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                className={`w-full ${
                  plan.highlight
                    ? 'bg-white text-food-primary hover:bg-white/90'
                    : 'bg-food-primary text-white hover:bg-food-primary/90'
                }`}
              >
                Choose Plan
              </Button>
            </motion.div>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-food-dark/70 mb-4">
            All plans include a 14-day free trial. No credit card required.
          </p>
          <a href="#contact" className="text-food-primary hover:underline">
            Need a custom plan? Contact us
          </a>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
