import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, TrendingUp, TrendingDown, Minus, Users, FileText, BarChart3, Brain, ChevronDown, Building2, Bitcoin, Coins, BookOpen, RefreshCw, ChevronRight } from 'lucide-react';
import { useApi } from '../contexts/ApiContext';
import SearchBar from '../components/SearchBar';
import FilterPanel from '../components/FilterPanel';
import EntityCard from '../components/EntityCard';
import StatsCard from '../components/StatsCard';
import ArticleCard from '../components/ArticleCard';
import ArticleModal from '../components/ArticleModal';

const Dashboard: React.FC = () => {
  const [entities, setEntities] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [allArticles, setAllArticles] = useState<any[]>([]);
  const [topEntities, setTopEntities] = useState<any[]>([]);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [articlesPage, setArticlesPage] = useState(1);
  const [hasMoreArticles, setHasMoreArticles] = useState(true);
  const [articleFilters, setArticleFilters] = useState({
    entity_name: '',
    entity_type: '',
    financial_sentiment: '',
    overall_sentiment: ''
  });
  const [filters, setFilters] = useState({
    entityType: '',
    sentimentType: 'overall',
    sentiment: '',
    timeRange: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);
  const { fetchData } = useApi();

  const ARTICLES_PER_PAGE = 6;

  useEffect(() => {
    loadDashboardData();
    loadAISummary();
    loadArticles(1, true);
  }, []);

  useEffect(() => {
    if (searchTerm.length > 1) {
      const filteredSuggestions = topEntities
        .filter(entity => 
          entity.entity_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .slice(0, 5)
        .map(entity => entity.entity_name);
      setSuggestions(filteredSuggestions);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [searchTerm, topEntities]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [entitiesData, articlesData, topEntitiesData] = await Promise.all([
        fetchData('/entities'),
        fetchData('/articles', { limit: 20 }),
        fetchData('/top_entities', { sentiment_type: 'overall', sentiment: 'positive', limit: 10 })
      ]);
      
      setEntities(entitiesData);
      setArticles(articlesData);
      setTopEntities(topEntitiesData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

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
        setAllArticles(newArticles);
        setArticlesPage(1);
      } else {
        setAllArticles(prev => [...prev, ...newArticles]);
      }
      
      setHasMoreArticles(newArticles.length === ARTICLES_PER_PAGE);
    } catch (error) {
      console.error('Error loading articles:', error);
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
    loadArticles(1, true);
  };

  const loadAISummary = async () => {
    const summaryText = "Based on the latest market analysis, we're seeing mixed sentiment across major sectors. Technology companies show resilient performance with 68% positive sentiment, while cryptocurrency markets remain volatile with increased regulatory scrutiny. Energy sector demonstrates strong fundamentals driven by sustainable initiatives. Banking institutions face headwinds from interest rate uncertainties, though major players maintain stable outlooks. Overall market sentiment leans cautiously optimistic with investors focusing on companies with strong fundamentals and clear growth strategies.";
    setAiSummary(summaryText);
  };

  const getFilteredEntities = () => {
    let filtered = entities.filter(entity => {
      const matchesSearch = entity.entity_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = !filters.entityType || entity.entity_type === filters.entityType;
      const matchesActiveFilter = activeFilter === 'all' || entity.entity_type === activeFilter;
      return matchesSearch && matchesType && matchesActiveFilter;
    });
    return filtered;
  };

  const getSentimentStats = () => {
    const stats = articles.reduce((acc, article) => {
      article.sentiments?.forEach((sentiment: any) => {
        if (sentiment.overall_sentiment === 'positive') acc.positive++;
        else if (sentiment.overall_sentiment === 'negative') acc.negative++;
        else acc.neutral++;
      });
      return acc;
    }, { positive: 0, negative: 0, neutral: 0 });

    return [
      { label: 'Positive', value: stats.positive, color: 'success', icon: TrendingUp },
      { label: 'Negative', value: stats.negative, color: 'error', icon: TrendingDown },
      { label: 'Neutral', value: stats.neutral, color: 'gray', icon: Minus }
    ];
  };

  const dashboardStats = [
    { label: 'Total Entities', value: entities.length, color: 'primary', icon: Users },
    { label: 'Articles Analyzed', value: articles.length, color: 'secondary', icon: FileText },
    { label: 'Sentiment Points', value: articles.reduce((acc, article) => acc + (article.sentiments?.length || 0), 0), color: 'finance', icon: BarChart3 }
  ];

  const filterButtons = [
    { id: 'all', label: 'All', icon: BarChart3, count: entities.length },
    { id: 'company', label: 'Companies', icon: Building2, count: entities.filter(e => e.entity_type === 'company').length },
    { id: 'cryptocurrency', label: 'Crypto', icon: Bitcoin, count: entities.filter(e => e.entity_type === 'cryptocurrency').length },
  ];

  const handleSuggestionClick = (suggestion: string) => {
    setSearchTerm(suggestion);
    setShowSuggestions(false);
  };

  const handleReadMore = (article: any) => {
    setSelectedArticle(article);
    setShowArticleModal(true);
  };

  const filteredEntities = getFilteredEntities();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-full mix-blend-multiply filter blur-xl animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full mix-blend-multiply filter blur-xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-cyan-400/10 to-blue-400/10 rounded-full mix-blend-multiply filter blur-xl animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-4">
              Market Intelligence Dashboard
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Analyze sentiment trends and market movements in real-time with AI-powered insights
            </p>
          </div>
        </motion.div>

        {/* AI Summary Section
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-news-gradient rounded-2xl shadow-glow p-6 mb-8 text-white relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 via-indigo-600/90 to-purple-600/90"></div>
          <div className="relative z-10">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-white/20 rounded-xl mr-4 backdrop-blur-sm">
                <Brain className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold">AI Market Intelligence</h2>
            </div>
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/20">
              <p className="text-white/95 leading-relaxed">
                {aiSummary}
              </p>
            </div>
          </div>
        </motion.div> */}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {dashboardStats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
              className="bg-card-gradient rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 p-6 border border-white/50"
            >
              <div className="flex items-center">
                <div className={`p-4 bg-gradient-to-br from-${stat.color}-100 to-${stat.color}-200 rounded-xl mr-4 shadow-sm`}>
                  <stat.icon className={`h-7 w-7 text-${stat.color}-600`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                    {stat.value.toLocaleString()}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Side - Entities and Articles */}
          <div className="lg:col-span-3 space-y-8">
            {/* Sentiment Overview */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="bg-card-gradient rounded-xl shadow-card border border-white/50 p-6"
            >
              <h2 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-6">
                Sentiment Distribution
              </h2>
              <div className="grid grid-cols-3 gap-6">
                {getSentimentStats().map((stat, index) => (
                  <motion.div 
                    key={index} 
                    className="text-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                  >
                    <div className={`inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-${stat.color}-100 to-${stat.color}-200 rounded-xl mb-3 shadow-sm`}>
                      <stat.icon className={`h-7 w-7 text-${stat.color}-600`} />
                    </div>
                    <div className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                      {stat.value}
                    </div>
                    <div className="text-sm text-slate-600 font-medium">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Enhanced Search and Filter Section */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="bg-card-gradient rounded-xl shadow-card border border-white/50 p-6"
            >
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 lg:flex-[2]">
                  <label className="block text-sm font-bold text-slate-700 mb-3">
                    🔍 Search Financial Entities
                  </label>
                  <div className="relative">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-6 w-6 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-12 pr-4 py-4 text-lg border-2 border-slate-200 rounded-xl leading-5 bg-gradient-to-r from-white to-slate-50 placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200"
                        placeholder="Search companies, cryptocurrencies..."
                      />
                    </div>
                    
                    <AnimatePresence>
                      {showSuggestions && suggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-full left-0 right-0 mt-2 bg-card-gradient border border-slate-200 rounded-xl shadow-card-hover z-10 overflow-hidden"
                        >
                          {suggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              onClick={() => handleSuggestionClick(suggestion)}
                              className="w-full text-left px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 first:rounded-t-xl last:rounded-b-xl transition-all duration-200 text-lg font-medium text-slate-700"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="lg:w-auto lg:flex-1">
                  <label className="block text-sm font-bold text-slate-700 mb-3">Filter by Type</label>
                  <div className="flex flex-wrap gap-3">
                    {filterButtons.map((button) => {
                      const Icon = button.icon;
                      const isActive = activeFilter === button.id;
                      return (
                        <motion.button
                          key={button.id}
                          onClick={() => setActiveFilter(button.id)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`flex items-center space-x-2 px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${
                            isActive
                              ? 'bg-primary-gradient text-white shadow-glow'
                              : 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 hover:from-slate-200 hover:to-slate-300 shadow-sm'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                          <span>{button.label}</span>
                          <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                            isActive ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-600'
                          }`}>
                            {button.count}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="text-sm font-bold text-slate-700 mb-3">🔥 Top Performing Entities</h4>
                <div className="flex flex-wrap gap-2">
                  {topEntities.slice(0, 8).map((entity, index) => (
                    <motion.button
                      key={entity.entity_name}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.7 + index * 0.05 }}
                      onClick={() => setSearchTerm(entity.entity_name)}
                      className="px-4 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-full text-sm font-medium hover:from-blue-200 hover:to-indigo-200 transition-all duration-200 border border-blue-200 shadow-sm"
                    >
                      {entity.entity_name}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Advanced Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mb-6 p-6 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200"
                >
                  <FilterPanel
                    filters={filters}
                    onFiltersChange={setFilters}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Entities Grid */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  {activeFilter === 'all' ? 'All Entities' : 
                   activeFilter === 'company' ? 'Companies' : 'Cryptocurrencies'} 
                  <span className="text-slate-500 ml-2">({filteredEntities.length})</span>
                </h2>
                
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 rounded-xl transition-all duration-200 shadow-sm"
                >
                  <Filter className="h-4 w-4" />
                  <span>Advanced Filters</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>
              </div>
              
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              ) : filteredEntities.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-slate-400 mb-4">
                    <Search className="h-12 w-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No entities found</h3>
                  <p className="text-slate-600">Try adjusting your search criteria or filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredEntities.map((entity, index) => (
                    <motion.div
                      key={`${entity.entity_name}-${entity.entity_type}`}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                    >
                      <EntityCard entity={entity} />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Articles Reading Section */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="bg-card-gradient rounded-xl shadow-card border border-white/50 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-emerald-100 to-green-100 rounded-lg">
                    <BookOpen className="h-6 w-6 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                    Latest Articles
                    <span className="text-slate-500 ml-2 text-lg">({allArticles.length})</span>
                  </h2>
                </div>
                
                <button
                  onClick={() => loadArticles(1, true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-100 to-green-100 hover:from-emerald-200 hover:to-green-200 text-emerald-700 rounded-xl transition-all duration-200 shadow-sm"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Article Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Entity Name</label>
                  <input
                    type="text"
                    value={articleFilters.entity_name}
                    onChange={(e) => handleArticleFilterChange({ ...articleFilters, entity_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Search entity..."
                  />
                </div>
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
              </div>

              {/* Articles Grid */}
              {allArticles.length === 0 && !articlesLoading ? (
                <div className="text-center py-12">
                  <div className="text-slate-400 mb-4">
                    <BookOpen className="h-12 w-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No articles found</h3>
                  <p className="text-slate-600">Try adjusting your filters or check back later for new content.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {allArticles.map((article, index) => (
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
                    <div className="text-center mt-8">
                      <button
                        onClick={loadMoreArticles}
                        disabled={articlesLoading}
                        className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-gradient hover:shadow-glow text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {articlesLoading ? (
                          <>
                            <RefreshCw className="h-5 w-5 animate-spin" />
                            <span>Loading...</span>
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

          {/* Right Side - Quick Stats */}
          <div className="lg:col-span-1 space-y-6">
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="bg-card-gradient rounded-xl shadow-card border border-white/50 p-6"
            >
              <h3 className="text-lg font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-4">
                Quick Stats
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                  <div className="flex items-center space-x-3">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    <span className="text-slate-700 font-medium">Companies</span>
                  </div>
                  <span className="font-bold text-blue-600 text-lg">{entities.filter(e => e.entity_type === 'company').length}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                  <div className="flex items-center space-x-3">
                    <Bitcoin className="h-5 w-5 text-amber-600" />
                    <span className="text-slate-700 font-medium">Cryptocurrencies</span>
                  </div>
                  <span className="font-bold text-amber-600 text-lg">{entities.filter(e => e.entity_type === 'cryptocurrency').length}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-100">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-emerald-600" />
                    <span className="text-slate-700 font-medium">Total Articles</span>
                  </div>
                  <span className="font-bold text-emerald-600 text-lg">{allArticles.length}</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="bg-card-gradient rounded-xl shadow-card border border-white/50 p-6"
            >
              <h3 className="text-lg font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-4">
                Market Trends
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 font-medium">Positive Sentiment</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-success-gradient rounded-full" style={{ width: '68%' }}></div>
                    </div>
                    <span className="text-sm font-bold text-green-600">68%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 font-medium">Negative Sentiment</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-error-gradient rounded-full" style={{ width: '22%' }}></div>
                    </div>
                    <span className="text-sm font-bold text-red-600">22%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 font-medium">Neutral Sentiment</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-slate-400 to-slate-500 rounded-full" style={{ width: '10%' }}></div>
                    </div>
                    <span className="text-sm font-bold text-slate-600">10%</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
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

export default Dashboard;