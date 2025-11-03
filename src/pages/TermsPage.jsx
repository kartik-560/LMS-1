import React from "react"
import { Link } from "react-router-dom"

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow-md rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h1>
        
        <p className="text-gray-600 mb-4">
          By accessing or using our platform, you agree to comply with the following Terms of Service.
        </p>

        <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-2">1. Acceptance of Terms</h2>
        <p className="text-gray-600 mb-4">
          By creating an account or using our services, you acknowledge that you have read, understood, and agreed to these terms.
        </p>

        <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-2">2. User Responsibilities</h2>
        <p className="text-gray-600 mb-4">
          You agree to use the platform for lawful purposes only and not engage in activities that may harm the platform or other users.
        </p>

        <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-2">3. Account Security</h2>
        <p className="text-gray-600 mb-4">
          You are responsible for maintaining the confidentiality of your account credentials and all activities under your account.
        </p>

        <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-2">4. Termination</h2>
        <p className="text-gray-600 mb-4">
          We reserve the right to suspend or terminate accounts that violate these terms without prior notice.
        </p>

        <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-2">5. Changes to Terms</h2>
        <p className="text-gray-600 mb-4">
          We may update these Terms of Service at any time. Continued use of the platform indicates acceptance of the updated terms.
        </p>

        <div className="mt-8">
          <Link to="/login" className="text-primary-600 hover:underline">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}

export default TermsPage
