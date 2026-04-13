import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Onboarding from "./pages/Onboarding";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import NotFound from "./pages/NotFound";
import CustomerBooking from "./pages/CustomerBooking";
import DriverDashboard from "./pages/DriverDashboard";
import DriverEarnings from "./pages/DriverEarnings";
import CustomerDashboard from "./pages/CustomerDashboard";
import DriverVerification from "./pages/DriverVerification";
import OrderTracking from "./pages/OrderTracking";
import DriverTracker from "./components/DriverTracker";
import "flatpickr/dist/flatpickr.min.css";
import "flatpickr/dist/themes/material_blue.css";
import { AuthProvider } from "./hooks/auth-context";

const queryClient = new QueryClient();

const App = () => (
  
  <QueryClientProvider client={queryClient}>
      <AuthProvider> 
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <DriverTracker>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Onboarding />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/home" element={<Home />} />
            <Route path="/customer/booking" element={<CustomerBooking />} />
            <Route path="/customer/dashboard" element={<CustomerDashboard />} />
            <Route path="/driver/dashboard" element={<DriverDashboard />} />
            <Route path="/driver/earnings" element={<DriverEarnings />} />
            <Route path="/driver/verification" element={<DriverVerification />} />
            <Route path="/driver/tracking" element={<OrderTracking />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/order-tracking" element={<OrderTracking />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </DriverTracker>
    </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
