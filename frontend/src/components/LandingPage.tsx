import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Search, BarChart3, Globe, ArrowRight, Star, Users, Zap } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">MENA Financial</span>
            </div>
            <Link
              to="/dashboard"
              className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                MENA Financial News
              </span>
              <br />
              Sentiment Analysis
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Advanced AI-powered sentiment analysis for Middle East & North Africa financial news. 
              Get real-time insights on market sentiment, company performance, and investment opportunities.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/dashboard"
                className="bg-primary-600 text-white px-8 py-4 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2"
              >
                <span>Start Analyzing</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <button className="border border-gray-300 text-gray-700 px-8 py-4 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                Learn More
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to stay ahead in MENA financial markets
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-8 rounded-xl hover:bg-gray-100 transition-colors">
              <div className="bg-primary-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Smart Search</h3>
              <p className="text-gray-600">
                Find relevant financial news and sentiment data with our intelligent search system.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl hover:bg-gray-100 transition-colors">
              <div className="bg-secondary-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-secondary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Sentiment Analysis</h3>
              <p className="text-gray-600">
                Advanced AI models analyze sentiment and provide actionable insights for each entity.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl hover:bg-gray-100 transition-colors">
              <div className="bg-accent-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Globe className="h-6 w-6 text-accent-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">MENA Focus</h3>
              <p className="text-gray-600">
                Specialized coverage of Middle East & North Africa financial markets and companies.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl hover:bg-gray-100 transition-colors">
              <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Real-time Updates</h3>
              <p className="text-gray-600">
                Get the latest news and sentiment updates as they happen in the market.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl hover:bg-gray-100 transition-colors">
              <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Multi-Entity Support</h3>
              <p className="text-gray-600">
                Track sentiment for companies, cryptocurrencies, and other financial entities.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl hover:bg-gray-100 transition-colors">
              <div className="bg-orange-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Star className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Premium Analytics</h3>
              <p className="text-gray-600">
                Professional-grade analytics and reporting tools for informed decision making.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-secondary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Join thousands of financial professionals who trust our platform for MENA market insights.
          </p>
          <Link
            to="/dashboard"
            className="bg-white text-primary-600 px-8 py-4 rounded-lg font-medium hover:bg-gray-100 transition-colors inline-flex items-center space-x-2"
          >
            <span>Access Dashboard</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <TrendingUp className="h-8 w-8 text-primary-400" />
              <span className="text-xl font-bold">MENA Financial</span>
            </div>
            <p className="text-gray-400 text-center md:text-right">
              © 2025 MENA Financial News Dashboard. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;