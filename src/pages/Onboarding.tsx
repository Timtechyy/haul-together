import { Button } from "@/components/ui/enhanced-button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Truck, Package, Users, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-delivery.jpg";
import logo from "@/assets/logo.png";

const Onboarding = () => {
  const features = [
    {
      icon: <Package className="h-6 w-6" />,
      title: "Large Item Delivery",
      description: "Furniture, appliances, bulk purchases - we handle items that don't fit in your car"
    },
    {
      icon: <Truck className="h-6 w-6" />,
      title: "Trusted Drivers",
      description: "Vetted local drivers with proper vehicles and insurance coverage"
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Easy Coordination",
      description: "Simple booking process that connects you with available drivers in your area"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure & Insured",
      description: "Every delivery is protected with insurance and real-time tracking"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex flex-col justify-start items-start h-full">
            <img
              src={logo}
              alt="Wehauler Logo"
              className="h-20 sm:h-20 md:h-24 lg:h-32 object-contain"
            />
          </div>

          <div className="flex gap-4">
            {/* <Button variant="ghost" asChild>
              <Link to="/login">Sign In</Link>
            </Button> */}
            <Button variant="outline" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-4">
              <h1 className="text-5xl font-bold leading-tight">
                Delivery Made
                <span className="bg-gradient-primary bg-clip-text text-transparent block">
                  Simple & Affordable
                </span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Connect with local drivers to get your large items and bulk purchases delivered safely and affordably. No more struggling with oversized items or renting expensive trucks.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="hero" size="xl" className="group" asChild>
                <Link to="/login">
                  Start Delivering
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button variant="outline" size="xl" asChild>
                <Link to="/login">Book a Delivery</Link>
              </Button>
            </div>

            <div className="flex items-center gap-8 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">10k+</div>
                <div className="text-sm text-muted-foreground">Deliveries Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary">4.9★</div>
                <div className="text-sm text-muted-foreground">Average Rating</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">500+</div>
                <div className="text-sm text-muted-foreground">Active Drivers</div>
              </div>
            </div>
          </div>

          <div className="relative animate-float">
            <img 
              src={heroImage} 
              alt="Professional delivery service showing a driver with large home goods items" 
              className="rounded-2xl shadow-strong w-full"
            />
            <div className="absolute -bottom-6 -right-6 bg-card p-4 rounded-xl shadow-medium border">
              <div className="text-sm font-medium">Next Available Delivery</div>
              <div className="text-xs text-muted-foreground">In 30 minutes</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl font-bold">Why Choose Wehauler?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We make large item delivery simple, affordable, and reliable for everyone
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="p-6 hover:shadow-medium transition-shadow animate-slide-up" style={{animationDelay: `${index * 0.1}s`}}>
              <CardContent className="p-0 space-y-4">
                <div className="h-12 w-12 bg-gradient-primary rounded-lg flex items-center justify-center text-white">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4 text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Join thousands of users who trust Wehauler for their delivery needs
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="xl" asChild>
              <Link to="/signup">Sign Up as Driver</Link>
            </Button>
            {/* <Button variant="secondary" size="xl" asChild>
              <Link to="/signup">Book Delivery</Link>
            </Button> */}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
           <div className="flex flex-col justify-start items-start h-full">
            <img
              src={logo}
              alt="Wehauler Logo"
              className="h-20 sm:h-20 md:h-24 lg:h-32 object-contain"
            />
            </div>
            <div className="text-sm text-muted-foreground">
              © 2025 Wehauler. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Onboarding;