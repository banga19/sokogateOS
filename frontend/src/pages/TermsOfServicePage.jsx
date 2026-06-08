import React from 'react';

const TermsOfServicePage = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            Terms of Service
          </h1>

          <div className="prose prose-lg max-w-none">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Last Updated: June 8, 2026</h2>

            <p className="mb-4">
              Welcome to SokogateOS! By accessing or using our platform, you agree to be bound by these Terms of Service ("Terms").
              Please read these Terms carefully before using SokogateOS.
            </p>

            <h3 className="text-xl font-semibold text-gray-700 mb-3">1. Acceptance of Terms</h3>
            <p className="mb-4">
              By accessing or using SokogateOS, you acknowledge that you have read, understood, and agree to be bound by these Terms
              and our Privacy Policy. If you do not agree to these Terms, you may not use SokogateOS.
            </p>

            <h3 className="text-xl font-semibold text-gray-700 mb-3">2. Description of Service</h3>
            <p className="mb-4">
              SokogateOS is an AI-powered operating system designed for African traders, providing autonomous AI agents for
              sourcing, logistics, customs, and commerce through WhatsApp integration. Our platform helps businesses streamline
              operations, reduce costs, and scale through intelligent automation.
            </p>

            <h3 className="text-xl font-semibold text-gray-700 mb-3">3. User Accounts</h3>
            <p className="mb-4">
              To access certain features of SokogateOS, you must create an account. You are responsible for maintaining the
              confidentiality of your account and password and for all activities that occur under your account.
            </p>

            <h3 className="text-xl font-semibold text-gray-700 mb-3">4. Payment and Fees</h3>
            <p className="mb-4">
              SokogateOS offers subscription-based pricing with various tiers. Additional transaction fees may apply through
              Sokogate Pay. All fees are clearly disclosed before payment processing.
            </p>

            <h3 className="text-xl font-semibold text-gray-700 mb-3">5. Intellectual Property</h3>
            <p className="mb-4">
              All content, features, and functionality of SokogateOS are the proprietary property of SokogateOS and its
              licensors, protected by international copyright, trademark, patent, trade secret, and other intellectual property
              laws.
            </p>

            <h3 className="text-xl font-semibold text-gray-700 mb-3">6. User Content</h3>
            <p className="mb-4">
              You retain all rights to any content you submit, post, or display on or through SokogateOS. By submitting content,
              you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish,
              translate, distribute, and display such content.
            </p>

            <h3 className="text-xl font-semibold text-gray-700 mb-3">7. Prohibited Conduct</h3>
            <p className="mb-4">
              You agree not to use SokogateOS to:
              <ul className="list-disc list-inside mb-4">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe upon the rights of others</li>
                <li>Engage in any fraudulent or misleading activities</li>
                <li>Interfere with or disrupt the service</li>
                <li>Attempt to gain unauthorized access to accounts or systems</li>
              </ul>
            </p>

            <h3 className="text-xl font-semibold text-gray-700 mb-3">8. Termination</h3>
            <p className="mb-4">
              We may terminate or suspend your account and access to SokogateOS immediately, without prior notice or liability,
              for any reason whatsoever, including without limitation if you breach these Terms.
            </p>

            <h3 className="text-xl font-semibold text-gray-700 mb-3">9. Limitation of Liability</h3>
            <p className="mb-4">
              In no event shall SokogateOS, nor its directors, employees, partners, agents, suppliers, or affiliates, be
              liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation
              loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of
              SokogateOS.
            </p>

            <h3 className="text-xl font-semibold text-gray-700 mb-3">10. Indemnification</h3>
            <p className="mb-4">
              You agree to indemnify and hold harmless SokogateOS and its subsidiaries, affiliates, officers, agents, employees,
              and partners from any claim or demand, including reasonable attorneys' fees, made by any third party due to or
              arising out of your use of the service, your violation of these Terms, or your violation of any rights of another.
            </p>

            <h3 className="text-xl font-semibold text-gray-700 mb-3">11. Governing Law</h3>
            <p className="mb-4">
              These Terms shall be governed by and construed in accordance with the laws of Kenya, without regard to its
              conflict of law principles.
            </p>

            <h3 className="text-xl font-semibold text-gray-700 mb-3">12. Changes to Terms</h3>
            <p className="mb-4">
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is
              material, we will provide at least 30 days' notice prior to any new terms taking effect.
            </p>

            <p className="mb-6">
              By using SokogateOS, you agree to our <a href="/privacy-policy" className="text-primary-600 hover:underline">Privacy Policy</a>.
            </p>

            <p className="text-center text-sm text-gray-500">
              © {new Date().getFullYear()} SokogateOS. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;