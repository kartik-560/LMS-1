import React from "react"
import { Link } from "react-router-dom"

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow-md rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        
        <p className="text-gray-600 mb-4">
          Your privacy is important to us. This policy explains how we collect, use, and protect your information.
        </p>

        <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-2">1. Information We Collect</h2>
        <p className="text-gray-600 mb-4">
          We collect personal information such as your name, email address, and usage activity when you interact with our platform.
        </p>

        <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-2">2. How We Use Information</h2>
        <p className="text-gray-600 mb-4">
          Your data is used to provide services, improve user experience, and ensure platform security.
        </p>

        <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-2">3. Data Sharing</h2>
        <p className="text-gray-600 mb-4">
          We do not sell your personal information. We may share data with trusted service providers for operational purposes.
        </p>

        <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-2">4. Data Security</h2>
        <p className="text-gray-600 mb-4">
          We implement appropriate security measures to protect your information from unauthorized access.
        </p>

        <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-2">5. Changes to Policy</h2>
        <p className="text-gray-600 mb-4">
          We may update this Privacy Policy occasionally. Continued use of our services means you accept any changes.
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

export default PrivacyPage
