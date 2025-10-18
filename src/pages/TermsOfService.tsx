import { Button } from "@/components/ui/enhanced-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="max-w-4xl mx-auto space-y-6 py-8 animate-fade-in">
        {/* Back button */}
        <Button variant="ghost" size="sm" asChild className="group">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
        </Button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Wehauler
          </div>
          <h1 className="text-4xl font-bold">Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Content */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle>Agreement to Terms</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert space-y-6">
            <p>
              By accessing and using Wehauler, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using this service.
            </p>

            <div>
              <h3 className="text-lg font-semibold mb-2">1. Use License</h3>
              <p>
                Permission is granted to temporarily use Wehauler for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose or public display</li>
                <li>Attempt to decompile or reverse engineer any software</li>
                <li>Remove any copyright or proprietary notations from the materials</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">2. User Accounts</h3>
              <p>
                When you create an account with us, you must provide accurate, complete, and current information. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">3. Service Description</h3>
              <p>
                Wehauler connects customers who need delivery services with independent drivers. We facilitate the connection but do not employ drivers or guarantee service availability.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">4. Payment and Fees</h3>
              <p>
                Customers agree to pay all fees for services requested through the platform. Drivers agree to our commission structure for completed deliveries. All payments are processed securely through our payment partners.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">5. Liability</h3>
              <p>
                Wehauler is not responsible for damages to items during transport, disputes between users, or any indirect damages arising from use of the service. Users are encouraged to maintain appropriate insurance.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">6. Termination</h3>
              <p>
                We may terminate or suspend your account immediately, without prior notice or liability, for any reason, including breach of these Terms.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">7. Changes to Terms</h3>
              <p>
                We reserve the right to modify these terms at any time. We will notify users of any changes by posting the new Terms of Service on this page.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">8. Contact Us</h3>
              <p>
                If you have any questions about these Terms, please contact us at support@wehauler.com.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsOfService;
