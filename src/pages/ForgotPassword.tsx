import { useState } from "react";
import { Button } from "@/components/ui/enhanced-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement password reset with Supabase
    console.log("Password reset request:", email);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 animate-fade-in">
          <Card className="shadow-medium text-center">
            <CardHeader className="space-y-4">
              <div className="mx-auto h-16 w-16 bg-gradient-secondary rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <div className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                HaulMate
              </div>
              <CardTitle className="text-2xl">Check your email</CardTitle>
              <CardDescription>
                We've sent a password reset link to {email}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>Didn't receive the email? Check your spam folder or</p>
              </div>
              <Button variant="outline" onClick={() => setIsSubmitted(false)}>
                Try another email
              </Button>
              <Button variant="link" asChild>
                <Link to="/login">Back to login</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        {/* Back to login */}
        <Button variant="ghost" size="sm" asChild className="group">
          <Link to="/login">
            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Login
          </Link>
        </Button>

        {/* Reset Form */}
        <Card className="shadow-medium">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto h-16 w-16 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-white" />
            </div>
            <div className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
              HaulMate
            </div>
            <CardTitle className="text-2xl">Reset your password</CardTitle>
            <CardDescription>
              Enter your email address and we'll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" variant="hero" className="w-full">
                Send Reset Link
              </Button>
            </form>

            <div className="text-center">
              <Button variant="link" size="sm" asChild className="px-0">
                <Link to="/login">Remember your password? Sign in</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="text-center text-xs text-muted-foreground">
          <p>We'll never share your email with anyone else</p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;