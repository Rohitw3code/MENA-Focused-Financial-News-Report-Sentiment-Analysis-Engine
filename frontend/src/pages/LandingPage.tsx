import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, TrendingUp, Users, Calendar, ExternalLink, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';
import { useApi } from '../contexts/ApiContext';

const LandingPage: React.FC = () => {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const { fetchData } = useApi();

  useEffect(() => {
    const loadFeaturedArticles = async () => {
      try {
        const data = await fetchData('/articles', { limit: 10 });
        setArticles(data.length > 0 ? data : mockArticles);
      } catch (error) {
        console.error('Error loading articles:', error);
        setArticles(mockArticles);
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedArticles();
  }, [fetchData]);

  // Auto-rotate news every 5 seconds
  useEffect(() => {
    if (articles.length > 0) {
      const interval = setInterval(() => {
        setCurrentNewsIndex((prev) => (prev + 1) % articles.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [articles.length]);

  const mockArticles = [
    {
      id: 1,
      title: "Tech Giants Show Mixed Earnings Results Amid Market Volatility",
      url: "#",
      author: "Financial Times",
      publication_date: "2024-01-15",
      cleaned_text: "Major technology companies reported mixed earnings results as market conditions remain challenging...",
      sentiments: [
        { entity_name: "Apple", entity_type: "company", financial_sentiment: "positive", overall_sentiment: "positive" },
        { entity_name: "Google", entity_type: "company", financial_sentiment: "neutral", overall_sentiment: "positive" }
      ]
    },
    {
      id: 2,
      title: "Cryptocurrency Market Experiences Significant Volatility",
      url: "#",
      author: "CoinDesk",
      publication_date: "2024-01-14",
      cleaned_text: "Bitcoin and other cryptocurrencies experienced significant volatility following regulatory announcements...",
      sentiments: [
        { entity_name: "Bitcoin", entity_type: "crypto", financial_sentiment: "negative", overall_sentiment: "neutral" }
      ]
    },
    {
      id: 3,
      title: "Electric Vehicle Adoption Accelerates Globally",
      url: "#",
      author: "Reuters",
      publication_date: "2024-01-13",
      cleaned_text: "Electric vehicle sales continue to grow globally as governments push for cleaner transportation...",
      sentiments: [
        { entity_name: "Tesla", entity_type: "company", financial_sentiment: "positive", overall_sentiment: "positive" }
      ]
    },
    {
      id: 4,
      title: "Banking Sector Faces New Regulatory Challenges",
      url: "#",
      author: "Wall Street Journal",
      publication_date: "2024-01-12",
      cleaned_text: "Major banks are adapting to new regulatory requirements while maintaining profitability...",
      sentiments: [
        { entity_name: "JPMorgan", entity_type: "company", financial_sentiment: "neutral", overall_sentiment: "negative" }
      ]
    }
  ];

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200';
      case 'negative': return 'text-red-600 bg-gradient-to-r from-red-50 to-rose-50 border-red-200';
      case 'neutral': return 'text-slate-600 bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200';
      default: return 'text-slate-600 bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200';
    }
  };

  const nextNews = () => {
    setCurrentNewsIndex((prev) => (prev + 1) % articles.length);
  };

  const prevNews = () => {
    setCurrentNewsIndex((prev) => (prev - 1 + articles.length) % articles.length);
  };

  const currentArticle = articles[currentNewsIndex];

  return (
    <div className="min-h-screen">
      {/* Enhanced Hero Section with Dynamic News and Gradients */}
      <section className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-20 relative overflow-hidden">
        {/* Background Animation */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-full mix-blend-multiply filter blur-xl animate-float"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full mix-blend-multiply filter blur-xl animate-float" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-cyan-400/10 to-blue-400/10 rounded-full mix-blend-multiply filter blur-xl animate-float" style={{ animationDelay: '4s' }}></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Hero Content */}
            <div>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="mb-8"
              >
                <div className="inline-flex items-center justify-center p-4 mb-6 bg-news-gradient rounded-2xl shadow-glow">
                  <TrendingUp className="h-10 w-10 text-white" />
                </div>
                <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                  <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                    Financial News
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Intelligence
                  </span>
                </h1>
                <p className="text-xl md:text-2xl text-slate-600 mb-8 leading-relaxed">
                  Unlock the power of AI-driven sentiment analysis to understand market movements and make informed investment decisions.
                </p>
              </motion.div>
              
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center px-8 py-4 bg-primary-gradient hover:shadow-glow text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Open Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <button className="inline-flex items-center justify-center px-8 py-4 border-2 border-blue-300 bg-gradient-to-r from-white to-blue-50 text-blue-600 hover:from-blue-50 hover:to-blue-100 font-bold rounded-xl transition-all duration-300">
                  Learn More
                </button>
              </motion.div>
            </div>

            {/* Right Side - Dynamic News Display with Gradient */}
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative"
            >
              <div className="bg-card-gradient backdrop-blur-sm rounded-2xl shadow-card-hover border border-white/50 overflow-hidden">
                <div className="bg-news-gradient px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-bold text-lg">📈 Live Market News</h3>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-white text-sm font-medium">Live</span>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="p-6 space-y-4">
                    <div className="h-6 bg-slate-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-slate-200 rounded w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/2 animate-pulse"></div>
                  </div>
                ) : (
                  <div className="relative h-80">
                    <AnimatePresence mode="wait">
                      {currentArticle && (
                        <motion.div
                          key={currentNewsIndex}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.5 }}
                          className="absolute inset-0 p-6"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-sm text-blue-600 font-bold">{currentArticle.author}</span>
                            <span className="text-sm text-slate-500 font-medium">
                              {new Date(currentArticle.publication_date).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <h4 className="text-lg font-bold text-slate-900 mb-4 line-clamp-2 leading-tight">
                            {currentArticle.title}
                          </h4>
                          
                          <p className="text-slate-600 text-sm mb-4 line-clamp-3 leading-relaxed">
                            {currentArticle.cleaned_text?.substring(0, 150)}...
                          </p>
                          
                          {currentArticle.sentiments && currentArticle.sentiments.length > 0 && (
                            <div className="space-y-3">
                              <h5 className="text-sm font-bold text-slate-700">💡 Sentiment Analysis:</h5>
                              <div className="flex flex-wrap gap-2">
                                {currentArticle.sentiments.slice(0, 3).map((sentiment: any, idx: number) => (
                                  <motion.span
                                    key={idx}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className={`px-3 py-1 rounded-full text-xs font-bold border ${getSentimentColor(sentiment.financial_sentiment)}`}
                                  >
                                    {sentiment.entity_name} • {sentiment.financial_sentiment}
                                  </motion.span>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Navigation Controls */}
                    <div className="absolute bottom-4 right-4 flex space-x-2">
                      <button
                        onClick={prevNews}
                        className="p-2 bg-white/90 hover:bg-white rounded-full shadow-md transition-all duration-200 hover:scale-110"
                      >
                        <ChevronLeft className="h-4 w-4 text-slate-600" />
                      </button>
                      <button
                        onClick={nextNews}
                        className="p-2 bg-white/90 hover:bg-white rounded-full shadow-md transition-all duration-200 hover:scale-110"
                      >
                        <ChevronRight className="h-4 w-4 text-slate-600" />
                      </button>
                    </div>

                    {/* Progress Indicators */}
                    <div className="absolute bottom-4 left-4 flex space-x-1">
                      {articles.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentNewsIndex(index)}
                          className={`w-2 h-2 rounded-full transition-all duration-200 ${
                            index === currentNewsIndex ? 'bg-blue-500' : 'bg-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section with Gradients */}
      <section className="py-20 bg-gradient-to-br from-white via-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                Why Choose SentiNews?
              </span>
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Advanced AI technology meets financial expertise to deliver actionable insights.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: TrendingUp,
                title: "Real-time Analysis",
                description: "Get instant sentiment analysis of breaking financial news and market movements.",
                gradient: "from-blue-100 to-indigo-100",
                iconGradient: "from-blue-500 to-indigo-500"
              },
              {
                icon: Users,
                title: "Company Insights",
                description: "Deep dive into individual company performance and market perception.",
                gradient: "from-purple-100 to-pink-100",
                iconGradient: "from-purple-500 to-pink-500"
              },
              {
                icon: Calendar,
                title: "Historical Trends",
                description: "Track sentiment changes over time to identify patterns and opportunities.",
                gradient: "from-emerald-100 to-green-100",
                iconGradient: "from-emerald-500 to-green-500"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`p-8 rounded-2xl bg-gradient-to-br ${feature.gradient} border border-white/50 hover:shadow-card-hover transition-all duration-300 group`}
              >
                <div className={`inline-flex p-4 bg-gradient-to-r ${feature.iconGradient} rounded-xl mb-6 shadow-sm group-hover:shadow-md transition-all duration-300`}>
                  <feature.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">{feature.title}</h3>
                <p className="text-slate-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Articles Section with Gradient */}
      <section className="py-20 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                Latest Market Insights
              </span>
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Stay informed with our AI-analyzed financial news and sentiment data.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.slice(0, 6).map((article, index) => (
              <motion.div
                key={article.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-card-gradient rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 p-6 border border-white/50 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-slate-500 font-medium">{article.author}</span>
                  <span className="text-sm text-slate-500 font-medium">
                    {new Date(article.publication_date).toLocaleDateString()}
                  </span>
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">
                  {article.title}
                </h3>
                
                <p className="text-slate-600 text-sm mb-4 line-clamp-3">
                  {article.cleaned_text?.substring(0, 150)}...
                </p>
                
                {article.sentiments && article.sentiments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {article.sentiments.slice(0, 3).map((sentiment: any, idx: number) => (
                      <span
                        key={idx}
                        className={`px-2 py-1 rounded-full text-xs font-semibold border ${getSentimentColor(sentiment.financial_sentiment)}`}
                      >
                        {sentiment.entity_name}
                      </span>
                    ))}
                  </div>
                )}
                
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold group"
                >
                  Read More
                  <ExternalLink className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section with News Gradient */}
      <section className="py-20 bg-news-gradient relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 via-indigo-600/90 to-purple-600/90"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Make Smarter Investment Decisions?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join thousands of investors who rely on our AI-powered sentiment analysis to stay ahead of the market.
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center px-8 py-4 bg-white text-blue-600 hover:bg-blue-50 font-bold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Get Started Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;