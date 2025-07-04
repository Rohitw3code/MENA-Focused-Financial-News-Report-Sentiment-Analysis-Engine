import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, RefreshCw, ChevronRight, Search, Filter, Calendar, TrendingUp, Menu } from 'lucide-react';
import { useApi } from '../contexts/ApiContext';
import { ResponsiveContainer, ResponsiveGrid, MobileDrawer, ResponsiveCard } from '../components/ResponsiveLayout';
import { SkeletonGrid, LoadingSpinner, EmptyState, InlineLoader } from '../components/LoadingStates';
import ArticleCard from '../components/ArticleCard';
import ArticleModal from '../components/ArticleModal';
import { detectEntityType } from '../utils/entityDetection';

const Articles: React.FC = () => {
  const [articles, setArticles] = useState<any[]>([]);
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
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { fetchData } = useApi();
  const ARTICLES_PER_PAGE = 12;

  useEffect(() => {
    loadArticles(1, true);
  }, []);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm !== articleFilters.entity_name) {
        // Auto-detect entity type when searching
        const detectedType = searchTerm.trim() ? detectEntityType(searchTerm) : '';
        handleArticleFilterChange({ 
          ...articleFilters, 
          entity_name: searchTerm,
          entity_type: detectedType
        });
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  const loadArticles = async (page: number, reset: boolean = false) => {
    try {
      setArticlesLoading(true);
      setError(null);
      
      const params: any = {
        limit: ARTICLES_PER_PAGE
      };
      
      // Add filters only if they have values
      if (articleFilters.entity_name.trim()) {
        params.entity_name = articleFilters.entity_name.trim();
      }
      if (articleFilters.entity_type) {
        params.entity_type = articleFilters.entity_type;
      }
      if (articleFilters.financial_sentiment) {
        params.financial_sentiment = articleFilters.financial_sentiment;
      }
      if (articleFilters.overall_sentiment) {
        params.overall_sentiment = articleFilters.overall_sentiment;
      }

      console.log('Loading articles with params:', params);
      const newArticles = await fetchData('/articles', params);
      
      // Ensure we have an array
      const articlesArray = Array.isArray(newArticles) ? newArticles : [];
      
      if (reset) {
        setArticles(articlesArray);
        setArticlesPage(1);
      } else {
        setArticles(prev => [...prev, ...articlesArray]);
      }
      
      setHasMoreArticles(articlesArray.length === ARTICLES_PER_PAGE);
      
      if (reset) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading articles:', error);
      setError('Failed to load articles. Please try again.');
      if (reset) {
        setArticles([]);
        setLoading(false);
      }
    } finally {
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
    setArticles([]); // Clear current articles
    setLoading(true); // Show loading state
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
    setArticles([]); // Clear current articles
    setLoading(true); // Show loading state
    setError(null); // Clear any errors
    loadArticles(1, true);
  };

  const retryLoad = () => {
    setError(null);
    setArticles([]);
    setLoading(true);
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

      <ResponsiveContainer className="relative z-10 py-4 sm:py-8">
        {/* Page Header */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-6 sm:mb-8"
        >
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center p-3 sm:p-4 mb-4 sm:mb-6 bg-news-gradient rounded-2xl shadow-glow">
              <BookOpen className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 leading-tight">
              <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                Financial News
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Articles
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto px-4">
              Explore AI-analyzed financial news with comprehensive sentiment insights and market intelligence
            </p>
          </div>
        </motion.div>

        {/* Search and Filters Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <ResponsiveCard className="p-4 sm:p-6 mb-6 sm:mb-8">
            {/* Search Bar */}
            <div className="mb-4 sm:mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-3">
                🔍 Search Articles by Entity
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 text-base sm:text-lg border-2 border-slate-200 rounded-xl leading-5 bg-gradient-to-r from-white to-slate-50 placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200"
                  placeholder="Search by company name, cryptocurrency (e.g., Apple, Bitcoin, ETH)..."
                />
              </div>
              {searchTerm && (
                <div className="mt-2 text-sm text-slate-600">
                  <span className="font-medium">Auto-detected type:</span>{' '}
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    detectEntityType(searchTerm) === 'crypto' 
                      ? 'bg-amber-100 text-amber-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {detectEntityType(searchTerm)}
                  </span>
                </div>
              )}
            </div>

            {/* Filter Controls */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between space-y-4 sm:space-y-0 sm:space-x-4">
              {/* Desktop Filters */}
              <div className="hidden sm:grid sm:grid-cols-4 gap-4 flex-1">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Entity Type</label>
                  <select
                    value={articleFilters.entity_type}
                    onChange={(e) => handleArticleFilterChange({ ...articleFilters, entity_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Types</option>
                    <option value="company">Companies</option>
                    <option value="crypto">Cryptocurrencies</option>
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
                    disabled={articlesLoading}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-100 to-green-100 hover:from-emerald-200 hover:to-green-200 text-emerald-700 rounded-lg transition-all duration-200 shadow-sm disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${articlesLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                  <button
                    onClick={clearFilters}
                    disabled={articlesLoading}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 rounded-lg transition-all duration-200 shadow-sm disabled:opacity-50"
                  >
                    <Filter className="h-4 w-4" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>

              {/* Mobile Filter Button */}
              <div className="flex sm:hidden space-x-2">
                <button
                  onClick={() => setIsMobileFiltersOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 text-blue-700 rounded-lg transition-all duration-200 shadow-sm flex-1"
                >
                  <Menu className="h-4 w-4" />
                  <span>Filters</span>
                </button>
                <button
                  onClick={() => loadArticles(1, true)}
                  disabled={articlesLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-100 to-green-100 hover:from-emerald-200 hover:to-green-200 text-emerald-700 rounded-lg transition-all duration-200 shadow-sm disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${articlesLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={clearFilters}
                  disabled={articlesLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 rounded-lg transition-all duration-200 shadow-sm disabled:opacity-50"
                >
                  <Filter className="h-4 w-4" />
                  <span>Clear</span>
                </button>
              </div>
            </div>
          </ResponsiveCard>
        </motion.div>

        {/* Articles Stats */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Latest Articles
              <span className="text-slate-500 ml-2">({articles.length} loaded)</span>
            </h2>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0 text-sm text-slate-600">
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

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-8"
          >
            <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-6 text-center">
              <div className="text-red-600 mb-4">
                <BookOpen className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-bold text-red-900 mb-2">Error Loading Articles</h3>
              <p className="text-red-700 mb-4">{error}</p>
              <button
                onClick={retryLoad}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all duration-300"
              >
                <RefreshCw className="h-5 w-5" />
                <span>Try Again</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Articles Grid */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {loading ? (
            <SkeletonGrid count={6} />
          ) : articles.length === 0 && !error ? (
            <EmptyState
              icon={BookOpen}
              title="No articles found"
              description="Try adjusting your search criteria or filters to find relevant articles."
              action={
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-gradient hover:shadow-glow text-white font-semibold rounded-xl transition-all duration-300"
                >
                  <Filter className="h-5 w-5" />
                  <span>Clear All Filters</span>
                </button>
              }
            />
          ) : (
            <>
              <ResponsiveGrid cols={{ sm: 1, md: 2, lg: 3 }} gap={6}>
                {articles.map((article, index) => (
                  <ArticleCard
                    key={`${article.id}-${index}`}
                    article={article}
                    index={index}
                    onReadMore={handleReadMore}
                  />
                ))}
              </ResponsiveGrid>

              {/* Load More Button */}
              {hasMoreArticles && !error && (
                <div className="text-center mt-8 sm:mt-12">
                  <button
                    onClick={loadMoreArticles}
                    disabled={articlesLoading}
                    className="inline-flex items-center space-x-2 px-6 sm:px-8 py-3 sm:py-4 bg-primary-gradient hover:shadow-glow text-white font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                  >
                    {articlesLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                        <span>Loading More Articles...</span>
                      </>
                    ) : (
                      <>
                        <span>Load More Articles</span>
                        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </motion.div>
      </ResponsiveContainer>

      {/* Mobile Filters Drawer */}
      <MobileDrawer
        isOpen={isMobileFiltersOpen}
        onClose={() => setIsMobileFiltersOpen(false)}
        title="Filter Articles"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Entity Type</label>
            <select
              value={articleFilters.entity_type}
              onChange={(e) => {
                handleArticleFilterChange({ ...articleFilters, entity_type: e.target.value });
                setIsMobileFiltersOpen(false);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="company">Companies</option>
              <option value="crypto">Cryptocurrencies</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Financial Sentiment</label>
            <select
              value={articleFilters.financial_sentiment}
              onChange={(e) => {
                handleArticleFilterChange({ ...articleFilters, financial_sentiment: e.target.value });
                setIsMobileFiltersOpen(false);
              }}
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
              onChange={(e) => {
                handleArticleFilterChange({ ...articleFilters, overall_sentiment: e.target.value });
                setIsMobileFiltersOpen(false);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Sentiments</option>
              <option value="positive">Positive</option>
              <option value="negative">Negative</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
        </div>
      </MobileDrawer>

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