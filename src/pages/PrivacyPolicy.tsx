import { Button } from "@/components/ui/enhanced-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

const PrivacyPolicy = () => {
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
          <div className="flex flex-col justify-start items-start h-full">
            <img
              src={logo}
              alt="Wehauler Logo"
              className="h-16 sm:h-20 md:h-24 lg:h-32 object-contain"
            />
          </div>
          <h1 className="text-4xl font-bold">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Content */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle>Your Privacy Matters</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert space-y-6">
            <p>
              At Wehauler, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
            </p>

            <div>
              <h3 className="text-lg font-semibold mb-2">1. Information We Collect</h3>
              <p>
                We collect information that you provide directly to us, including:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Personal identification information (name, email, phone number)</li>
                <li>Account credentials and profile information</li>
                <li>Payment and billing information</li>
                <li>Delivery addresses and locations</li>
                <li>Communications between users through our platform</li>
                <li>Device information and usage data</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">2. How We Use Your Information</h3>
              <p>
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>Send you technical notices and support messages</li>
                <li>Respond to your comments and questions</li>
                <li>Detect and prevent fraudulent transactions and other illegal activities</li>
                <li>Personalize and improve your experience</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">3. Information Sharing</h3>
              <p>
                We may share your information in the following situations:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>With drivers or customers to facilitate deliveries</li>
                <li>With service providers who assist in our operations</li>
                <li>When required by law or to protect our rights</li>
                <li>In connection with a merger, sale, or acquisition</li>
              </ul>
              <p className="mt-2">
                We do not sell your personal information to third parties.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">4. Data Security</h3>
              <p>
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized or unlawful processing, accidental loss, destruction, or damage. All data transmission is encrypted using SSL technology.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">5. Your Rights</h3>
              <p>
                You have the right to:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Access and receive a copy of your personal data</li>
                <li>Correct inaccurate or incomplete data</li>
                <li>Request deletion of your data</li>
                <li>Object to or restrict processing of your data</li>
                <li>Withdraw consent at any time</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">6. Cookies and Tracking</h3>
              <p>
                We use cookies and similar tracking technologies to track activity on our service and store certain information. You can instruct your browser to refuse all cookies or indicate when a cookie is being sent.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">7. Children's Privacy</h3>
              <p>
                Our service is not intended for children under 18 years of age. We do not knowingly collect personal information from children under 18.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">8. Changes to This Policy</h3>
              <p>
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">9. Contact Us</h3>
              <p>
                If you have any questions about this Privacy Policy, please contact us at privacy@wehauler.com.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
