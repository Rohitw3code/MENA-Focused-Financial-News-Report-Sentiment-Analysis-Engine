import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, RefreshCw, ChevronRight, Search, Filter, Calendar, User, TrendingUp } from 'lucide-react';
import { useApi } from '../contexts/ApiContext';
import ArticleCard from '../components/ArticleCard';
import ArticleModal from '../components/ArticleModal';

const Articles: React.FC = () => {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [articlesPage, setArticlesPage] = useState(1);
  const [hasMoreArticles, setHasMoreArticles] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [articleFilters, setArticleFilters] = useState({
    entity_name: '',
    entity_type: '',
    financial_sentiment: '',
    overall_sentiment: ''
  });
  const { fetchData } = useApi();

  const ARTICLES_PER_PAGE = 12;

  useEffect(() => {
    loadArticles(1, true);
  }, []);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm !== articleFilters.entity_name) {
        handleArticleFilterChange({ ...articleFilters, entity_name: searchTerm });
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  const loadArticles = async (page: number, reset: boolean = false) => {
    try {
      setArticlesLoading(true);
      const params = {
        limit: ARTICLES_PER_PAGE,
        ...articleFilters
      };
      
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key as keyof typeof params] === '') {
          delete params[key as keyof typeof params];
        }
      });

      const newArticles = await fetchData('/articles', params);
      
      if (reset) {
        setArticles(newArticles);
        setArticlesPage(1);
      } else {
        setArticles(prev => [...prev, ...newArticles]);
      }
      
      setHasMoreArticles(newArticles.length === ARTICLES_PER_PAGE);
    } catch (error) {
      console.error('Error loading articles:', error);
    } finally {
      setLoading(false);
      setArticlesLoading(false);
    }
  };

  const loadMoreArticles = () => {
    if (!articlesLoading && hasMoreArticles) {
      const nextPage = articlesPage + 1;
      setArticlesPage(nextPage);
      loadArticles(nextPage, false);
    }
  };

  const handleArticleFilterChange = (newFilters: any) => {
    setArticleFilters(newFilters);
    loadArticles(1, true);
  };

  const handleReadMore = (article: any) => {
    setSelectedArticle(article);
    setShowArticleModal(true);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setArticleFilters({
      entity_name: '',
      entity_type: '',
      financial_sentiment: '',
      overall_sentiment: ''
    });
    loadArticles(1, true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-full mix-blend-multiply filter blur-xl animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full mix-blend-multiply filter blur-xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-cyan-400/10 to-blue-400/10 rounded-full mix-blend-multiply filter blur-xl animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-4 mb-6 bg-news-gradient rounded-2xl shadow-glow">
              <BookOpen className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
              <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                Financial News
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Articles
              </span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Explore AI-analyzed financial news with comprehensive sentiment insights and market intelligence
            </p>
          </div>
        </motion.div>

        {/* Search and Filters Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-card-gradient rounded-xl shadow-card border border-white/50 p-6 mb-8"
        >
          {/* Search Bar */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-700 mb-3">
              🔍 Search Articles by Entity
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-6 w-6 text-slate-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-12 pr-4 py-4 text-lg border-2 border-slate-200 rounded-xl leading-5 bg-gradient-to-r from-white to-slate-50 placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200"
                placeholder="Search by company name, cryptocurrency..."
              />
            </div>
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Entity Type</label>
              <select
                value={articleFilters.entity_type}
                onChange={(e) => handleArticleFilterChange({ ...articleFilters, entity_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="company">Companies</option>
                <option value="cryptocurrency">Cryptocurrencies</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Financial Sentiment</label>
              <select
                value={articleFilters.financial_sentiment}
                onChange={(e) => handleArticleFilterChange({ ...articleFilters, financial_sentiment: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Sentiments</option>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Overall Sentiment</label>
              <select
                value={articleFilters.overall_sentiment}
                onChange={(e) => handleArticleFilterChange({ ...articleFilters, overall_sentiment: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Sentiments</option>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
            <div className="flex items-end space-x-2">
              <button
                onClick={() => loadArticles(1, true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-100 to-green-100 hover:from-emerald-200 hover:to-green-200 text-emerald-700 rounded-lg transition-all duration-200 shadow-sm"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </button>
              <button
                onClick={clearFilters}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 rounded-lg transition-all duration-200 shadow-sm"
              >
                <Filter className="h-4 w-4" />
                <span>Clear</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Articles Stats */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Latest Articles
              <span className="text-slate-500 ml-2">({articles.length} loaded)</span>
            </h2>
            
            <div className="flex items-center space-x-4 text-sm text-slate-600">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>Updated continuously</span>
              </div>
              <div className="flex items-center space-x-1">
                <TrendingUp className="h-4 w-4" />
                <span>AI-analyzed</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Articles Grid */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-card-gradient rounded-xl shadow-card p-6 animate-pulse border border-white/50">
                  <div className="h-6 bg-slate-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-slate-200 rounded w-full mb-4"></div>
                  <div className="flex space-x-2">
                    <div className="h-8 bg-slate-200 rounded w-16"></div>
                    <div className="h-8 bg-slate-200 rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-slate-400 mb-4">
                <BookOpen className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">No articles found</h3>
              <p className="text-slate-600 mb-6">Try adjusting your search criteria or filters to find relevant articles.</p>
              <button
                onClick={clearFilters}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-gradient hover:shadow-glow text-white font-semibold rounded-xl transition-all duration-300"
              >
                <Filter className="h-5 w-5" />
                <span>Clear All Filters</span>
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map((article, index) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    index={index}
                    onReadMore={handleReadMore}
                  />
                ))}
              </div>

              {/* Load More Button */}
              {hasMoreArticles && (
                <div className="text-center mt-12">
                  <button
                    onClick={loadMoreArticles}
                    disabled={articlesLoading}
                    className="inline-flex items-center space-x-2 px-8 py-4 bg-primary-gradient hover:shadow-glow text-white font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                  >
                    {articlesLoading ? (
                      <>
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        <span>Loading More Articles...</span>
                      </>
                    ) : (
                      <>
                        <span>Load More Articles</span>
                        <ChevronRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>

      {/* Article Modal */}
      <ArticleModal
        article={selectedArticle}
        isOpen={showArticleModal}
        onClose={() => setShowArticleModal(false)}
      />
    </div>
  );
};

export default Articles;