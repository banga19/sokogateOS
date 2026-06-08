import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const TermsAcceptancePage = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAcceptance = async () => {
    setLoading(true);
    setError(null);

    try {
      // In a real implementation, this would call an API to update the user's terms acceptance
      // For now, we'll simulate it by updating the auth context
      await updateUser({
        ...user,
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        termsVersion: '1.0'
      });

      // Redirect to dashboard after acceptance
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to save your acceptance. Please try again.');
      console.error('Terms acceptance error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            Terms & Conditions
          </h1>

          <div className="prose prose-lg max-w-none mb-8">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Last Updated: June 8, 2026</h2>

            <p className="mb-4">
              Welcome to SokogateOS! By accessing or using our platform, you agree to be bound by these Terms of Service ("Terms").
              Please read these Terms carefully before using SokogateOS.
            </p>

            <h3 className="text-xl font-semibold text-gray-700 mb-3">1. Acceptance of Terms</h3>
            <p className="mb-4">
              By clicking "I Accept" below, you acknowledge that you have read, understood, and agree to be bound by these Terms
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

            <h3 className="text-xl font-semibold text-gray-700 mb-3">6. Termination</h3>
            <p className="mb-4">
              We may terminate or suspend your account and access to SokogateOS immediately, without prior notice or liability,
              for any reason whatsoever, including without limitation if you breach these Terms.
            </p>

            <h3 className="text-xl font-semibold text-gray-700 mb-3">7. Limitation of Liability</h3>
            <p className="mb-4">
              In no event shall SokogateOS, nor its directors, employees, partners, agents, suppliers, or affiliates, be
              liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation
              loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of
              SokogateOS.
            </p>

            <h3 className="text-xl font-semibold text-gray-700 mb-3">8. Governing Law</h3>
            <p className="mb-4">
              These Terms shall be governed by and construed in accordance with the laws of Kenya, without regard to its
              conflict of law principles.
            </p>

            <p className="mb-6">
              By accepting these Terms, you also acknowledge that you have read and understood our
              <a href="/privacy-policy" className="text-primary-600 hover:underline">Privacy Policy</a>.
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="terms-checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
            </div>
            <label htmlFor="terms-checkbox" className="text-sm text-gray-600">
              I have read and agree to the <a href="/terms-of-service" className="text-primary-600 hover:underline">Terms of Service</a>
              and <a href="/privacy-policy" className="text-primary-600 hover:underline">Privacy Policy</a>
            </label>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600">
              {error}
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={handleAcceptance}
              disabled={!accepted || loading}
              className={`w-full flex items-center justify-center px-6 py-3 text-base font-medium rounded-lg
                         ${!accepted || loading
                           ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                           : 'bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50'}`}
            >
              {loading ? 'Processing...' : 'I Accept, Continue to Dashboard'}
            </button>
          </div>

          <div className="mt-4 text-center text-sm text-gray-500">
            By using SokogateOS, you agree to our <a href="/terms-of-service" className="text-primary-600 hover:underline">Terms of Service</a>
            and <a href="/privacy-policy" className="text-primary-600 hover:underline">Privacy Policy</a>.
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAcceptancePage;