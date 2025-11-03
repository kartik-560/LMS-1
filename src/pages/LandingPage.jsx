import React from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Users, Award, Play, ArrowRight } from 'lucide-react'
import Button from '../components/ui/Button'

const LandingPage = () => {
  const features = [
    {
      icon: <BookOpen size={24} />,
      title: 'Comprehensive Learning',
      description: ' Acquire industry-aligned skills through our expertly curated courses and earn certifications that showcase your professional readiness.'
    },
    {
      icon: <Users size={24} />,
      title: 'Take the Assessment',
      description: ' Demonstrate your mastery with a placement-style final test, designed to evaluate your competencies and ensure you’re career-ready.'
    },
    {
      icon: <Award size={24} />,
      title: 'Take the Assessment',
      description: 'Excel in AI-driven mock interviews with three attempts per course, receive personalized feedback, and confidently prepare for real-world opportunities.'
    }
  ]

  const stats = [
    { number: '100+', label: 'Industry-Relevant Courses' },
    { number: '50+', label: 'Global Industry Partners' },
    { number: '70+', label: 'Partner Colleges Across India' },
    { number: '95%', label: 'Satisfaction Rate' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Learn Achieve Shine.

              <span className="text-primary-600 block">With Pugarch</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              “One platform to simplify teaching and supercharge learning with PugArch.”
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {/* <Link to="/courses">
                <Button size="lg" className="group">
                  Browse Courses
                  <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link> */}
              <Link to="/login">
                <Button variant="outline" size="lg">
                Login to you Account
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-primary-200 rounded-full opacity-20"></div>
        <div className="absolute top-40 right-20 w-32 h-32 bg-accent-200 rounded-full opacity-20"></div>
        <div className="absolute bottom-20 left-1/4 w-16 h-16 bg-purple-200 rounded-full opacity-20"></div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Build Career-Ready Skills with Industry-Aligned Courses & AI Interview Prep
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
Our platform equips students with the skills they need to succeed. Through industry-ready courses and certifications, learners gain practical expertise that employers value. AI-driven interview practice builds confidence and prepares students for real-world opportunities. With anytime, anywhere access, students can learn and grow at their own pace, while colleges empower their campus to deliver career-ready graduates.


            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center p-6">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 mx-auto mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index}>
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {stat.number}
                </div>
                <div className="text-primary-100">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Ready to Start Learning?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of learners who have already transformed their skills with Pugarch.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {/* <Link to="/register">
              <Button size="lg">
                Create Free Account
              </Button>
            </Link> */}
            <Link to="/courses">
              <Button variant="outline" size="lg">
                Explore Courses
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <BookOpen size={20} className="text-white" />
                </div>
                <span className="text-xl font-bold">PugArch</span>
              </div>
              <p className="text-gray-400">
                Transforming education through innovative technology and collaborative learning.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/courses" className="hover:text-white transition-colors">Courses</Link></li>
                <li><Link to="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link to="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
                <li><Link to="/tutorials" className="hover:text-white transition-colors">Tutorials</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link to="/cookies" className="hover:text-white transition-colors">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 PugArch. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
