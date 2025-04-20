
import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

const Testimonials = () => {
  const testimonials = [
    {
      name: "Alex Chen",
      role: "Owner, Fusion Bistro",
      avatar: "AC",
      content: "Since implementing Potoba, our order accuracy has improved by 98% and our table turnover rate increased by 25%. The AI recommendations are incredibly accurate."
    },
    {
      name: "Maria Rodriguez",
      role: "Manager, Tapas & Wine",
      avatar: "MR",
      content: "The group ordering feature has been a game-changer for large parties. Our customers love being able to order at their own pace, and our staff can focus on service instead of taking orders."
    },
    {
      name: "James Wilson",
      role: "Chef, Urban Plate",
      avatar: "JW",
      content: "The AI analytics helped us identify our most profitable dishes and optimize our menu. We've seen a 30% increase in average order value in just three months."
    }
  ];

  const stats = [
    { value: "98%", label: "Order Accuracy" },
    { value: "30%", label: "Higher Average Orders" },
    { value: "25%", label: "Faster Table Turnover" }
  ];

  return (
    <section id="testimonials" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-food-accent/20 text-food-accent border-none px-3 py-1">
            <Star className="mr-1 h-3.5 w-3.5" />
            Customer Stories
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Customers Say</h2>
          <p className="text-lg text-food-dark/70 max-w-2xl mx-auto">
            Hear from restaurant owners who transformed their business with Potoba
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              className="bg-food-neutral rounded-xl p-6 shadow-sm relative"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="absolute -top-3 -left-3 text-food-primary text-5xl opacity-20">"</div>
              <p className="mb-6 relative z-10">{testimonial.content}</p>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-food-primary/20 text-food-primary flex items-center justify-center font-medium mr-3">
                  {testimonial.avatar}
                </div>
                <div>
                  <h4 className="font-semibold">{testimonial.name}</h4>
                  <p className="text-sm text-food-dark/70">{testimonial.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        <div className="mt-16 bg-gradient-to-r from-food-primary to-food-accent rounded-xl p-8 text-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <h3 className="text-4xl font-bold mb-2">{stat.value}</h3>
                <p>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
