import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const PrivacyPolicy = () => {
  const lastUpdated = "March 2026";

  const sections = [
    {
      title: "1. Introduction",
      content: `Campus Market ("we", "us", or "our") operates a digital campus marketplace platform that connects student vendors with buyers within university communities. This Privacy Policy explains how we collect, use, store, and protect your information when you use our platform at campusmarketapp.com.

By using Campus Market, you agree to the collection and use of information as described in this policy. If you do not agree, please do not use the platform.`,
    },
    {
      title: "2. Information We Collect",
      content: `We collect the following types of information:

Account Information: When you register, we collect your name, email address, school, and password.

Vendor Information: If you register as a vendor, we additionally collect your business name, category, contact number, residential location, and optionally a government-issued ID for verification purposes.

Usage Data: We collect information about how you interact with the platform, including pages visited, vendors viewed, products liked, and comments made.

Payment Data: Payment transactions are processed through Paystack. We do not store your card details. We only store payment references and status.

Communications: Any messages, comments, or reviews you submit on the platform are stored and may be visible to other users.`,
    },
    {
      title: "3. How We Use Your Information",
      content: `We use your information to:

• Create and manage your account
• Connect buyers with vendors on campus
• Process vendor registration payments
• Display vendor profiles and products to other users
• Send notifications related to your account or transactions
• Allow campus admins to verify vendor identities
• Improve the platform based on usage patterns
• Enforce our community guidelines and terms of service`,
    },
    {
      title: "4. Information Sharing",
      content: `We do not sell your personal information to third parties.

Public Information: Vendor business names, categories, descriptions, contact numbers, product photos, and reviews are visible to all users of the platform.

Admin Access: Campus administrators and super administrators can view vendor private details (full name, residential location, personal contact) for verification purposes only. ID documents are accessible to super administrators only.

Service Providers: We share necessary data with Supabase (database and storage), Paystack (payment processing), and Google Gemini (AI assistant feature). These providers are bound by their own privacy policies.

Legal Requirements: We may disclose your information if required by law or to protect the rights and safety of users.`,
    },
    {
      title: "5. Data Storage and Security",
      content: `Your data is stored securely on Supabase servers. We implement appropriate technical and organisational measures to protect your information against unauthorised access, loss, or misuse.

However, no method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute security and encourage you to use a strong password and keep your login details confidential.`,
    },
    {
      title: "6. ID Documents and Verification",
      content: `If you submit a government-issued ID for vendor verification, it is stored securely and is only accessible to super administrators for identity verification purposes. ID documents are not shared with other users, campus admins, or third parties.

You may request deletion of your ID document by contacting us. Deletion of your ID document will result in removal of your Verified badge.`,
    },
    {
      title: "7. User-Generated Content & Community Safety",
      content: `Comments, reviews, and ratings you post on vendor profiles are public and associated with your account. Please do not include personal information in public comments.

Campus Market has the following safety measures in place:

• Vendor Strike System: Any user can report a vendor for misconduct. After 5 verified reports, the vendor is automatically suspended and campus admins are notified immediately.
• Evidence Upload: Users can upload screenshot evidence when reporting a vendor.
• Warning Badges: Vendors with a high number of poor reviews receive a visible warning indicator on their profile.
• Admin Review: All reports are reviewed by campus admins who have the power to permanently remove vendors.
• ID on File: All verified vendors have submitted a government-issued ID. In cases of fraud, this information can be shared with relevant authorities.

Campus Market is not responsible for content posted by users. We reserve the right to remove content that violates our community guidelines. Users who engage in harassment, fraud, or misconduct on the platform are solely responsible for their actions.`,
    },
    {
      title: "8. Vendor Conduct Disclaimer",
      content: `Campus Market is a marketplace platform — we facilitate connections between vendors and buyers but are not a party to any transaction. We do not verify the quality of products or services offered by vendors.

Any disputes between buyers and vendors must be resolved between the parties involved. Campus Market is not liable for:

• Products or services that do not meet expectations
• Fraudulent vendors or buyers
• Loss of money or goods in any transaction
• Personal injuries or damages arising from products or services

Users transact at their own risk. We encourage all users to exercise caution and report suspicious activity to campus admins.`,
    },
    {
      title: "9. Cookies and Local Storage",
      content: `We use browser session storage to manage your session preferences (such as whether you have seen the splash screen). We do not use tracking cookies for advertising purposes.

Our platform may use essential cookies required for authentication and security.`,
    },
    {
      title: "10. Children's Privacy",
      content: `Campus Market is intended for use by university students and adults aged 18 and above. We do not knowingly collect personal information from anyone under the age of 18. If you believe a minor has registered on the platform, please contact us immediately.`,
    },
    {
      title: "11. Your Rights",
      content: `You have the right to:

• Access the personal information we hold about you
• Request correction of inaccurate data
• Request deletion of your account and associated data
• Withdraw consent for optional data uses at any time

To exercise any of these rights, contact us using the details below.`,
    },
    {
      title: "12. Account Deletion",
      content: `You may request deletion of your account at any time by contacting us. Upon deletion, your personal data will be removed from our systems within 30 days, except where retention is required by law or for legitimate business purposes (such as payment records).

Vendor profiles, products, and public reviews may be anonymised rather than fully deleted to preserve the integrity of the marketplace history.`,
    },
    {
      title: "13. Changes to This Policy",
      content: `We may update this Privacy Policy from time to time. When we do, we will update the "Last Updated" date at the top of this page. Continued use of the platform after changes constitutes acceptance of the updated policy.

We encourage you to review this policy periodically.`,
    },
    {
      title: "14. Contact Us",
      content: `If you have any questions, concerns, or requests regarding this Privacy Policy, please contact us:

Platform: Campus Market
Website: campusmarketapp.com
Email: support@campusmarketapp.com

We will respond to all enquiries within 5 business days.`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16 px-4">
        <div className="container mx-auto max-w-3xl">

          {/* Header */}
          <div className="mb-10 mt-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              Privacy Policy
            </h1>
            <p className="text-muted-foreground text-sm">
              Last updated: {lastUpdated}
            </p>
            <div className="mt-4 p-4 rounded-xl bg-accent/10 border border-accent/20">
              <p className="text-sm text-foreground leading-relaxed">
                <strong>Important:</strong> Campus Market is a marketplace platform only. We connect vendors and buyers but are not responsible for transactions, vendor conduct, or disputes between users. All users transact at their own risk.
              </p>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-8">
            {sections.map((section) => (
              <div key={section.title} className="border-b border-border/50 pb-8 last:border-0">
                <h2 className="text-lg font-semibold text-foreground mb-3">
                  {section.title}
                </h2>
                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {section.content}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom note */}
          <div className="mt-10 p-5 rounded-xl bg-muted/50 border border-border/50 text-center">
            <p className="text-sm text-muted-foreground">
              By using Campus Market, you acknowledge that you have read and understood this Privacy Policy.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              © {new Date().getFullYear()} Campus Market. All rights reserved.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
