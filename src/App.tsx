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
import ProtectedRoute, { PublicRoute } from "./components/AppRoute";

const queryClient = new QueryClient();

const App = () => {
  return (

    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <DriverTracker>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Onboarding />} />
                <Route
                  path="/login"
                  element={<PublicRoute>
                    <Login />
                  </PublicRoute>} />

                <Route
                  path="/signup"
                  element={<PublicRoute>
                    <Signup />
                  </PublicRoute>} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                {/* <Route path="/home" element={<Home />} /> */}
                <Route
                  path="/customer/dashboard"
                  element={<ProtectedRoute role="user">
                    <CustomerDashboard />
                  </ProtectedRoute>} />
                <Route
                  path="/customer/booking"
                  element={<ProtectedRoute role="user">
                    <CustomerBooking />
                  </ProtectedRoute>} />
                <Route
                  path="/driver/dashboard"
                  element={<ProtectedRoute role="driver">
                    <DriverDashboard />
                  </ProtectedRoute>} />

                <Route
                  path="/driver/earnings"
                  element={<ProtectedRoute role="driver">
                    <DriverEarnings />
                  </ProtectedRoute>} />

                <Route
                  path="/driver/verification"
                  element={<ProtectedRoute role="driver">
                    <DriverVerification />
                  </ProtectedRoute>} />

                <Route
                  path="/driver/tracking"
                  element={<ProtectedRoute role="driver">
                    <OrderTracking />
                  </ProtectedRoute>} />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute role={['driver', 'user']}>
                       <Profile />
                    </ProtectedRoute>
                  } />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/order-tracking" element={
                  <ProtectedRoute role={'user'}>
                      <OrderTracking />
                  </ProtectedRoute>
                } />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </DriverTracker>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
