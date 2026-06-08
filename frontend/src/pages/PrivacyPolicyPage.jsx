import React from 'react';

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            Privacy Policy
          </h1>

          <div className="prose prose-lg max-w-none">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Last Updated: June 8, 2026</h2>

            <p className="mb-4">
              SokogateOS ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform ("Service").
            </p>

            <h3 className="text-xl font-semibold text-gray-700 mb-3">1. Information We Collect</h3>
            <p className="mb-4">
              We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support. This may include:
            </p>
            <ul className="list-disc list-inside mb-4">
              <li>Personal information (name, email address, phone number, company details)</li>
              <li>Authentication credentials (encrypted passwords)</li>
              <li>Payment information (processed securely through third-party payment processors)</li>
              <li>Usage data (how you interact with our platform)</li>
              <li>Communication data (messages sent via WhatsApp integration)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-700 mb-3">2. How We Use Your Information</h3>
            <p className="mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside mb-4">
              <li>Provide, maintain, and improve our Service</li>
              <li>Process transactions and manage your account</li>
              <li>Send you important communications about updates, security alerts, and support information</li>
              <li>Personalize your experience and provide relevant recommendations</li>
              <li>Ensure the security and integrity of our platform</li>
              <li>Comply with legal obligations and resolve disputes</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-700 mb-3">3. Sharing Your Information</h3>
            <p className="mb-4">
              We may share your information in the following circumstances:
            </p>
            <ul className="list-disc list-inside mb-4">
              <li>With service providers who help us operate our business (hosting, payment processing, analytics)</li>
              <li>When required by law or to protect our rights</li>
              <li>In connection with a business transfer (merger, acquisition, or sale of assets)</li>
              <li>With your explicit consent for specific purposes</li>
            </ul>
            <p className="mb-4">
              We do not sell your personal information to third parties.
            </p>

            <h3 className="text-xl font-semibold text-gray-700 mb-3">4. Data Security</h3>
            <p className="mb-4">
              We implement appropriate technical and organizational measures to protect your personal information from accidental or unlawful destruction, loss, alteration, unauthorized disclosure, or access. However, no method of transmission over the internet or electronic storage is 100% secure.
            </p>

            <h3 className="text-xl font-semibold text-gray-700 mb-3">5. Your Rights and Choices</h3>
            <p className="mb-4">
              Depending on your jurisdiction, you may have the right to:
            </p>
            <ul className="list-disc list-inside mb-4">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate or incomplete information</li>
              <li>Request deletion of your personal information</li>
              <li>Object to or restrict certain uses of your information</li>
              <li>Receive your personal information in a structured, commonly used format</li>
              <li>Withdraw consent where we rely on your consent to process your information</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-700 mb-3">6. International Data Transfers</h3>
            <p className="mb-4">
              We are based in Kenya and may transfer your information to, and store it in, other countries. When we transfer your information outside Kenya, we ensure appropriate safeguards are in place.
            </p>

            <h3 className="text-xl font-semibold text-gray-700 mb-3">7. Children's Privacy</h3>
            <p className="mb-4">
              Our Service is not directed to children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
            </p>

            <h3 className="text-xl font-semibold text-gray-700 mb-3">8. Changes to This Privacy Policy</h3>
            <p className="mb-4">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
            </p>

            <h3 className="text-xl font-semibold text-gray-700 mb-3">9. Contact Us</h3>
            <p className="mb-4">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className="mb-4">
              Email: <a href="mailto:bangali@ultimotradingltd.co.ke" className="text-primary-600 hover:underline">bangali@ultimotradingltd.co.ke</a><br/>
              Address: SokogateOS, Nairobi, Kenya
            </p>

            <p className="mt-6 text-center text-sm text-gray-500">
              © {new Date().getFullYear()} SokogateOS. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;