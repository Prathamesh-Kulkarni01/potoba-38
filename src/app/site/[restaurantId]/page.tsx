
import { getRestaurant } from '@/lib/firebase/firestore';
import type { RestaurantProfile } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { Utensils, Info, MapPin } from 'lucide-react';
import { notFound } from 'next/navigation';

interface RestaurantPublicPageProps {
  params: {
    restaurantId: string;
  };
}

export async function generateMetadata({ params }: RestaurantPublicPageProps) {
  const restaurant = await getRestaurant(params.restaurantId);
  if (!restaurant) {
    return {
      title: 'Restaurant Not Found',
    };
  }
  return {
    title: `${restaurant.name} - Welcome!`,
    description: `Explore the menu and details for ${restaurant.name}. ${restaurant.type ? `We are a ${restaurant.type} style restaurant.` : ''}`,
  };
}

export default async function RestaurantPublicPage({ params }: RestaurantPublicPageProps) {
  const restaurant: RestaurantProfile | null = await getRestaurant(params.restaurantId);

  if (!restaurant) {
    notFound(); // Triggers the not-found.tsx or default Next.js 404 page
  }

  // Placeholder for a default table ID or a specific landing page for the menu
  // This would ideally come from restaurant settings or a predefined logic
  const exampleTableIdForMenuLink = restaurant.id; // Using restaurantId as a placeholder for a scannable entity

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background text-foreground">
      <header className="py-6 px-4 md:px-8 shadow-md bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center">
          <div className="flex items-center gap-3 mb-4 sm:mb-0">
            <Image
              src={`https://picsum.photos/seed/${restaurant.id}logo/60/60`}
              alt={`${restaurant.name} Logo`}
              width={60}
              height={60}
              className="rounded-full border-2 border-primary shadow-sm"
              data-ai-hint="restaurant logo"
            />
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-primary">{restaurant.name}</h1>
              {restaurant.type && <p className="text-md text-muted-foreground">{restaurant.type}</p>}
            </div>
          </div>
          <nav className="flex gap-4">
            <Button variant="ghost" asChild><Link href="#menu">Menu</Link></Button>
            <Button variant="ghost" asChild><Link href="#about">About Us</Link></Button>
            <Button variant="ghost" asChild><Link href="#contact">Contact</Link></Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4 md:px-8 space-y-12">
        <section id="hero" className="relative rounded-xl overflow-hidden shadow-2xl">
          <Image
            src={`https://picsum.photos/seed/${restaurant.id}banner/1200/400`}
            alt={`Promotional image for ${restaurant.name}`}
            width={1200}
            height={400}
            className="w-full h-64 md:h-96 object-cover"
            data-ai-hint="restaurant food ambiance"
            priority
          />
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-center p-4">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-4 animate-float-slow">
              Welcome to <span className="text-primary">{restaurant.name}</span>
            </h2>
            <p className="text-lg sm:text-xl text-primary-foreground/90 max-w-2xl mb-6 animate-pulse-subtle">
              Experience authentic flavors and a warm, inviting atmosphere. Discover your new favorite dish today!
            </p>
            <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8 py-6 rounded-lg shadow-lg transform hover:scale-105 transition-transform" asChild>
              <Link href={`/menu/table/${exampleTableIdForMenuLink}`}>
                <Utensils className="mr-2 h-5 w-5" /> View Our Menu & Order
              </Link>
            </Button>
          </div>
        </section>

        <section id="about" className="py-10">
          <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="text-3xl font-semibold flex items-center text-accent">
                <Info className="mr-3 h-8 w-8" />
                About {restaurant.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-lg text-foreground/80 space-y-4">
              <p>
                Welcome to {restaurant.name}, where culinary passion meets exceptional service. We pride ourselves on using the freshest ingredients to craft memorable dishes. 
                {restaurant.type ? ` Specializing in ${restaurant.type.toLowerCase()} cuisine, we offer a unique dining experience for everyone.` : ' We offer a diverse menu to cater to all tastes.'}
              </p>
              <p>
                Our mission is to provide an unforgettable experience, whether you're joining us for a casual meal, a special celebration, or ordering from the comfort of your home.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-semibold text-primary mb-1">Our Commitment</h4>
                    <p className="text-sm">Fresh Ingredients, Authentic Recipes, Warm Hospitality.</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-semibold text-primary mb-1">Visit Us</h4>
                    <p className="text-sm">123 Foodie Lane, Flavor Town, FT 54321 (Placeholder Address)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
        
        <section id="menu" className="py-10 text-center">
            <h3 className="text-3xl font-semibold mb-6 text-accent">Ready to Order?</h3>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Browse our full digital menu, customize your meal, and place your order directly from your table or for pickup.
            </p>
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-10 py-6 rounded-lg shadow-lg transform hover:scale-105 transition-transform" asChild>
                <Link href={`/menu/table/${exampleTableIdForMenuLink}`}>
                    Explore Full Menu & Order Now
                </Link>
            </Button>
        </section>


        <section id="contact" className="py-10">
          <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300">
             <CardHeader>
              <CardTitle className="text-3xl font-semibold flex items-center text-accent">
                <MapPin className="mr-3 h-8 w-8" />
                Find & Contact Us
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-8 text-foreground/80">
                <div>
                    <h4 className="font-semibold text-xl text-primary mb-2">Visit Our Location</h4>
                    <p>123 Culinary Avenue, Gourmet City, GC 98765</p>
                    <p>Open Daily: 11:00 AM - 10:00 PM</p>
                    <div className="mt-4 h-48 bg-muted rounded-lg flex items-center justify-center">
                        <Image src={`https://picsum.photos/seed/${restaurant.id}map/400/200`} alt="Restaurant location map" width={400} height={200} className="w-full h-full object-cover rounded-lg" data-ai-hint="map location"/>
                    </div>
                </div>
                 <div>
                    <h4 className="font-semibold text-xl text-primary mb-2">Get In Touch</h4>
                    <p>Phone: (555) 123-4567</p>
                    <p>Email: info@{restaurant.name.toLowerCase().replace(/\s+/g, '')}.com</p>
                    <p className="mt-4">Follow us on social media for updates and special offers!</p>
                    {/* Add social media icons/links here if applicable */}
                </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="bg-card text-card-foreground py-8 mt-12 border-t">
        <div className="container mx-auto text-center">
          <p>&copy; {new Date().getFullYear()} {restaurant.name}. All Rights Reserved.</p>
          <p className="text-sm text-muted-foreground mt-1">Powered by AuthZen</p>
        </div>
      </footer>
    </div>
  );
}
