import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, TrendingUp, TrendingDown, Minus, Users, FileText, BarChart3, Brain, Building2, Bitcoin, BookOpen, ArrowRight, ExternalLink, Eye, Loader, Database, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApiWithCache } from '../hooks/useApi';
import { ResponsiveContainer, ResponsiveGrid, MobileDrawer, ResponsiveCard } from '../components/ResponsiveLayout';
import { SkeletonGrid, LoadingSpinner, EmptyState, InlineLoader } from '../components/LoadingStates';
import EntityCard from '../components/EntityCard';

const Dashboard: React.FC = () => {
  const [topEntities, setTopEntities] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [entityDetails, setEntityDetails] = useState<any>(null);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [matchingEntities, setMatchingEntities] = useState<any[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [sentimentFilter, setSentimentFilter] = useState<string>('positive');
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const { fetchWithCache, loading, error } = useApiWithCache({ cacheTime: 5 * 60 * 1000 });
  const [searchLoading, setSearchLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    loadDashboardData();
    loadAISummary();
  }, []);

  useEffect(() => {
    loadTopEntities();
  }, [activeFilter, sentimentFilter]);

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
      const [statsData, articlesData] = await Promise.all([
        fetchWithCache('/dashboard_stats'),
        fetchWithCache('/articles', { limit: 20 })
      ]);
      
      setDashboardStats(statsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const loadTopEntities = async () => {
    try {
      const params = {
        sentiment_type: 'financial',
        sentiment: sentimentFilter,
        limit: 20
      };
      
      const data = await fetchWithCache('/top_entities', params);
      
      const filteredData = activeFilter === 'all' 
        ? data 
        : data.filter((entity: any) => entity.entity_type === activeFilter);
      
      setTopEntities(filteredData);
    } catch (error) {
      console.error('Error loading top entities:', error);
    }
  };

  const loadAISummary = async () => {
    const summaryText = "Based on the latest market analysis, we're seeing mixed sentiment across major sectors. Technology companies show resilient performance with 68% positive sentiment, while cryptocurrency markets remain volatile with increased regulatory scrutiny. Energy sector demonstrates strong fundamentals driven by sustainable initiatives. Banking institutions face headwinds from interest rate uncertainties, though major players maintain stable outlooks. Overall market sentiment leans cautiously optimistic with investors focusing on companies with strong fundamentals and clear growth strategies.";
    setAiSummary(summaryText);
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults(null);
      setEntityDetails(null);
      setMatchingEntities([]);
      setSelectedEntity(null);
      setSearchQuery('');
      return;
    }

    try {
      setSearchLoading(true);
      setSearchQuery(searchTerm);
      
      // Find all matching entities (not just the first one)
      const matches = topEntities.filter(entity => 
        entity.entity_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      if (matches.length > 1) {
        // Multiple matches found - show selection list
        setMatchingEntities(matches);
        setSearchResults(null);
        setEntityDetails(null);
        setSelectedEntity(null);
      } else if (matches.length === 1) {
        // Single match found - load details directly
        const entity = matches[0];
        setMatchingEntities([]);
        setSelectedEntity(entity);
        await loadEntityDetails(entity.entity_name, entity.entity_type);
      } else {
        // No exact matches - try fuzzy search with both entity types
        setMatchingEntities([]);
        setSelectedEntity({ name: searchTerm, type: 'company' }); // Default to company
        await loadEntityDetails(searchTerm, 'company');
      }
      
    } catch (error) {
      console.error('Error searching entity:', error);
      setSearchResults({ error: 'Search failed. Please try again.' });
      setEntityDetails(null);
      setMatchingEntities([]);
      setSelectedEntity(null);
    } finally {
      setSearchLoading(false);
      setShowSuggestions(false);
    }
  };

  const handleEntitySelect = async (entity: any) => {
    setSelectedEntity(entity);
    setMatchingEntities([]);
    await loadEntityDetails(entity.entity_name, entity.entity_type);
  };

  const loadEntityDetails = async (entityName: string, entityType: string) => {
    try {
      setDetailsLoading(true);
      
      const [articlesData, sentimentData, summaryData] = await Promise.allSettled([
        fetchWithCache('/entity_articles_by_sentiment', {
          entity_name: entityName,
          entity_type: entityType
        }),
        fetchWithCache('/sentiment_over_time', { entity_name: entityName }),
        fetchWithCache('/summarize_entity', { entity_name: entityName })
      ]);

      const details: any = {
        entity_name: entityName,
        entity_type: entityType,
        articles: articlesData.status === 'fulfilled' ? articlesData.value : null,
        sentiment_trend: sentimentData.status === 'fulfilled' ? sentimentData.value : null,
        ai_summary: summaryData.status === 'fulfilled' ? summaryData.value : null,
        error: null
      };

      if (details.articles) {
        const allArticles = [
          ...details.articles.positive_financial || [],
          ...details.articles.negative_financial || [],
          ...details.articles.neutral_financial || [],
          ...details.articles.positive_overall || [],
          ...details.articles.negative_overall || [],
          ...details.articles.neutral_overall || []
        ];
        
        const uniqueArticles = allArticles.filter((article, index, self) => 
          index === self.findIndex(a => a.title === article.title)
        );
        
        details.total_articles = uniqueArticles.length;
        details.unique_articles = uniqueArticles;
        
        details.sentiment_distribution = {
          positive_financial: details.articles.positive_financial?.length || 0,
          negative_financial: details.articles.negative_financial?.length || 0,
          neutral_financial: details.articles.neutral_financial?.length || 0,
          positive_overall: details.articles.positive_overall?.length || 0,
          negative_overall: details.articles.negative_overall?.length || 0,
          neutral_overall: details.articles.neutral_overall?.length || 0
        };
      }

      setEntityDetails(details);
      setSearchResults(details.articles);
      
    } catch (error) {
      console.error('Error loading entity details:', error);
      setEntityDetails({
        entity_name: entityName,
        entity_type: entityType,
        error: 'Failed to load entity details'
      });
      setSearchResults({ error: 'No data found for this entity' });
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchQuery('');
    setSearchResults(null);
    setEntityDetails(null);
    setMatchingEntities([]);
    setSelectedEntity(null);
    setShowSuggestions(false);
  };

  const getSentimentStats = () => {
    if (!dashboardStats?.sentiment_distribution) {
      return [
        { label: 'Positive', value: 0, color: 'success', icon: TrendingUp },
        { label: 'Negative', value: 0, color: 'error', icon: TrendingDown },
        { label: 'Neutral', value: 0, color: 'gray', icon: Minus }
      ];
    }

    const { sentiment_distribution } = dashboardStats;
    return [
      { label: 'Positive', value: sentiment_distribution.positive || 0, color: 'success', icon: TrendingUp },
      { label: 'Negative', value: sentiment_distribution.negative || 0, color: 'error', icon: TrendingDown },
      { label: 'Neutral', value: sentiment_distribution.neutral || 0, color: 'gray', icon: Minus }
    ];
  };

  const getDashboardStatsCards = () => {
    if (!dashboardStats) {
      return [
        { label: 'Total Entities', value: 0, color: 'primary', icon: Users },
        { label: 'Articles Analyzed', value: 0, color: 'secondary', icon: FileText },
        { label: 'Sentiment Points', value: 0, color: 'finance', icon: BarChart3 }
      ];
    }

    return [
      { label: 'Total Entities', value: dashboardStats.total_entities || 0, color: 'primary', icon: Users },
      { label: 'Articles Analyzed', value: dashboardStats.articles_analyzed || 0, color: 'secondary', icon: FileText },
      { label: 'Sentiment Points', value: dashboardStats.total_sentiment_points || 0, color: 'finance', icon: BarChart3 }
    ];
  };

  const filterButtons = [
    { id: 'all', label: 'All', icon: BarChart3 },
    { id: 'company', label: 'Companies', icon: Building2 },
    { id: 'crypto', label: 'Crypto', icon: Bitcoin },
  ];

  const sentimentButtons = [
    { id: 'positive', label: 'Positive', color: 'success', icon: TrendingUp },
    { id: 'negative', label: 'Negative', color: 'error', icon: TrendingDown },
  ];

  const handleSuggestionClick = (suggestion: string) => {
    setSearchTerm(suggestion);
    setShowSuggestions(false);
    setTimeout(() => handleSearch(), 100);
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200';
      case 'negative': return 'text-red-600 bg-gradient-to-r from-red-50 to-rose-50 border-red-200';
      case 'neutral': return 'text-slate-600 bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200';
      default: return 'text-slate-600 bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return TrendingUp;
      case 'negative': return TrendingDown;
      case 'neutral': return Minus;
      default: return Minus;
    }
  };

  const getEntityIcon = (entityType: string) => {
    return entityType === 'company' ? Building2 : Bitcoin;
  };

  const displayEntities = (searchResults || matchingEntities.length > 0 || selectedEntity) ? [] : topEntities;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-full mix-blend-multiply filter blur-xl animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full mix-blend-multiply filter blur-xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-cyan-400/10 to-blue-400/10 rounded-full mix-blend-multiply filter blur-xl animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      <ResponsiveContainer className="relative z-10 py-4 sm:py-8">
        {/* Dashboard Header */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-6 sm:mb-8"
        >
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 leading-tight">
              <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                Market Intelligence Dashboard
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto px-4">
              Analyze sentiment trends and market movements in real-time with AI-powered insights
            </p>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <ResponsiveGrid cols={{ sm: 1, md: 3 }} gap={6} className="mb-6 sm:mb-8">
          {getDashboardStatsCards().map((stat, index) => (
            <motion.div
              key={index}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
            >
              <ResponsiveCard className="p-4 sm:p-6">
                <div className="flex items-center">
                  <div className={`p-3 sm:p-4 bg-gradient-to-br from-${stat.color}-100 to-${stat.color}-200 rounded-xl mr-3 sm:mr-4 shadow-sm`}>
                    <stat.icon className={`h-6 w-6 sm:h-7 sm:w-7 text-${stat.color}-600`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-600 mb-1">{stat.label}</p>
                    <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                      {loading ? (
                        <div className="h-6 sm:h-8 w-12 sm:w-16 bg-slate-200 rounded animate-pulse"></div>
                      ) : (
                        stat.value.toLocaleString()
                      )}
                    </p>
                  </div>
                </div>
              </ResponsiveCard>
            </motion.div>
          ))}
        </ResponsiveGrid>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 sm:gap-8">
          {/* Left Side - Search and Entities */}
          <div className="xl:col-span-3 space-y-6 sm:space-y-8">
            {/* Sentiment Overview */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <ResponsiveCard className="p-4 sm:p-6">
                <div className="flex items-center mb-4 sm:mb-6">
                  <div className="p-2 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg mr-3">
                    <Database className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                    Real-time Sentiment Distribution
                  </h2>
                </div>
                <ResponsiveGrid cols={{ sm: 3 }} gap={4} className="sm:gap-6">
                  {getSentimentStats().map((stat, index) => (
                    <motion.div 
                      key={index} 
                      className="text-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                    >
                      <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-${stat.color}-100 to-${stat.color}-200 rounded-xl mb-3 shadow-sm`}>
                        <stat.icon className={`h-6 w-6 sm:h-7 sm:w-7 text-${stat.color}-600`} />
                      </div>
                      <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                        {loading ? (
                          <div className="h-5 sm:h-6 w-8 sm:w-12 bg-slate-200 rounded animate-pulse mx-auto"></div>
                        ) : (
                          stat.value.toLocaleString()
                        )}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-600 font-medium">{stat.label}</div>
                    </motion.div>
                  ))}
                </ResponsiveGrid>
              </ResponsiveCard>
            </motion.div>

            {/* Enhanced Search Section */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <ResponsiveCard className="p-4 sm:p-6">
                <div className="space-y-4 sm:space-y-6">
                  {/* Search Input */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3">
                      🔍 Search Financial Entities
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="block w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 text-base sm:text-lg border-2 border-slate-200 rounded-xl leading-5 bg-gradient-to-r from-white to-slate-50 placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200"
                        placeholder="Search companies, cryptocurrencies... (Press Enter to search)"
                      />
                    </div>
                    
                    {/* Auto-suggestions */}
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
                              className="w-full text-left px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 first:rounded-t-xl last:rounded-b-xl transition-all duration-200 text-base sm:text-lg font-medium text-slate-700"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  {/* Search Actions */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                    <button
                      onClick={handleSearch}
                      disabled={searchLoading || !searchTerm.trim()}
                      className="flex items-center justify-center space-x-2 px-6 py-3 bg-primary-gradient hover:shadow-glow text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {searchLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Searching...</span>
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4" />
                          <span>Search Entity</span>
                        </>
                      )}
                    </button>
                    
                    {searchQuery && (
                      <button
                        onClick={clearSearch}
                        className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 rounded-xl transition-all duration-200"
                      >
                        <span>Clear Search</span>
                      </button>
                    )}

                    {/* Mobile Filter Toggle */}
                    <button
                      onClick={() => setIsMobileFiltersOpen(true)}
                      className="flex sm:hidden items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 rounded-xl transition-all duration-200"
                    >
                      <Menu className="h-4 w-4" />
                      <span>Filters</span>
                    </button>
                  </div>

                  {/* Desktop Filter Buttons */}
                  <div className="hidden sm:block space-y-4">
                    <div>
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
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-3">Financial Sentiment</label>
                      <div className="flex flex-wrap gap-3">
                        {sentimentButtons.map((button) => {
                          const Icon = button.icon;
                          const isActive = sentimentFilter === button.id;
                          return (
                            <motion.button
                              key={button.id}
                              onClick={() => setSentimentFilter(button.id)}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className={`flex items-center space-x-2 px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${
                                isActive
                                  ? `bg-${button.color}-gradient text-white shadow-glow`
                                  : 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 hover:from-slate-200 hover:to-slate-300 shadow-sm'
                              }`}
                            >
                              <Icon className="h-5 w-5" />
                              <span>{button.label}</span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Popular Entities */}
                  {!searchQuery && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-700 mb-3">🔥 Top Performing Entities</h4>
                      <div className="flex flex-wrap gap-2">
                        {topEntities.slice(0, 8).map((entity, index) => (
                          <motion.button
                            key={entity.entity_name}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.7 + index * 0.05 }}
                            onClick={() => {
                              setSearchTerm(entity.entity_name);
                              setTimeout(() => handleSearch(), 100);
                            }}
                            className="px-3 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-full text-sm font-medium hover:from-blue-200 hover:to-indigo-200 transition-all duration-200 border border-blue-200 shadow-sm"
                          >
                            {entity.entity_name}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ResponsiveCard>
            </motion.div>

            {/* Search Results or Entities Grid */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              {searchQuery ? (
                <div>
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                      Search Results for "{searchQuery}"
                    </h2>
                    {detailsLoading && (
                      <Loader className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 animate-spin" />
                    )}
                  </div>
                  
                  {searchLoading ? (
                    <LoadingSpinner size="lg" text="Searching for entities..." className="py-12" />
                  ) : matchingEntities.length > 1 ? (
                    // Multiple matches found - show selection list
                    <div>
                      <div className="mb-4">
                        <p className="text-slate-600">
                          Found {matchingEntities.length} entities matching "{searchQuery}". Select one to view details:
                        </p>
                      </div>
                      <ResponsiveGrid cols={{ sm: 1, md: 2 }} gap={4}>
                        {matchingEntities.map((entity, index) => {
                          const EntityIcon = getEntityIcon(entity.entity_type);
                          return (
                            <motion.button
                              key={`${entity.entity_name}-${entity.entity_type}`}
                              initial={{ y: 20, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ duration: 0.6, delay: index * 0.1 }}
                              onClick={() => handleEntitySelect(entity)}
                              className="p-4 sm:p-6 bg-card-gradient rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 border border-white/50 text-left group"
                            >
                              <div className="flex items-center space-x-3 sm:space-x-4">
                                <div className={`p-3 bg-gradient-to-br from-${entity.entity_type === 'company' ? 'blue' : 'amber'}-100 to-${entity.entity_type === 'company' ? 'blue' : 'amber'}-200 rounded-xl shadow-sm group-hover:shadow-md transition-all duration-300`}>
                                  <EntityIcon className={`h-6 w-6 text-${entity.entity_type === 'company' ? 'blue' : 'amber'}-600`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-lg font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent group-hover:from-blue-600 group-hover:to-indigo-600 transition-all duration-300">
                                    {entity.entity_name}
                                  </h3>
                                  <p className="text-sm text-slate-500 capitalize font-medium">
                                    {entity.entity_type} • {entity.sentiment_count} mentions
                                  </p>
                                </div>
                                <div className="flex items-center text-blue-600 group-hover:translate-x-1 transition-transform duration-200">
                                  <ArrowRight className="h-5 w-5" />
                                </div>
                              </div>
                            </motion.button>
                          );
                        })}
                      </ResponsiveGrid>
                    </div>
                  ) : selectedEntity && entityDetails?.error ? (
                    <EmptyState
                      icon={Search}
                      title="No data found"
                      description={entityDetails.error}
                      action={
                        <button
                          onClick={clearSearch}
                          className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-gradient hover:shadow-glow text-white font-semibold rounded-xl transition-all duration-300"
                        >
                          <span>Back to Top Entities</span>
                        </button>
                      }
                    />
                  ) : selectedEntity && entityDetails ? (
                    // Single entity selected - show detailed view
                    <div className="space-y-6 sm:space-y-8">
                      {/* Entity Overview Card */}
                      <ResponsiveCard className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 sm:mb-6 space-y-4 sm:space-y-0">
                          <div className="flex items-center space-x-3 sm:space-x-4">
                            <div className="p-3 sm:p-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl shadow-sm">
                              {React.createElement(getEntityIcon(entityDetails.entity_type), { 
                                className: "h-6 w-6 sm:h-8 sm:w-8 text-blue-600" 
                              })}
                            </div>
                            <div>
                              <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                                {entityDetails.entity_name}
                              </h3>
                              <p className="text-base sm:text-lg text-slate-600 capitalize font-medium">
                                {entityDetails.entity_type}
                              </p>
                            </div>
                          </div>
                          <Link
                            to={`/entity/${encodeURIComponent(entityDetails.entity_name)}`}
                            className="flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-lg hover:from-blue-200 hover:to-indigo-200 transition-all duration-200 font-semibold"
                          >
                            <Eye className="h-4 w-4" />
                            <span>Detailed View</span>
                          </Link>
                        </div>

                        {/* Quick Stats */}
                        {entityDetails.sentiment_distribution && (
                          <ResponsiveGrid cols={{ sm: 2, md: 4 }} gap={4} className="mb-4 sm:mb-6">
                            <div className="text-center p-3 sm:p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-200">
                              <div className="text-xl sm:text-2xl font-bold text-emerald-600">
                                {entityDetails.sentiment_distribution.positive_financial + entityDetails.sentiment_distribution.positive_overall}
                              </div>
                              <div className="text-xs sm:text-sm text-emerald-700 font-medium">Positive</div>
                            </div>
                            <div className="text-center p-3 sm:p-4 bg-gradient-to-r from-red-50 to-rose-50 rounded-lg border border-red-200">
                              <div className="text-xl sm:text-2xl font-bold text-red-600">
                                {entityDetails.sentiment_distribution.negative_financial + entityDetails.sentiment_distribution.negative_overall}
                              </div>
                              <div className="text-xs sm:text-sm text-red-700 font-medium">Negative</div>
                            </div>
                            <div className="text-center p-3 sm:p-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg border border-slate-200">
                              <div className="text-xl sm:text-2xl font-bold text-slate-600">
                                {entityDetails.sentiment_distribution.neutral_financial + entityDetails.sentiment_distribution.neutral_overall}
                              </div>
                              <div className="text-xs sm:text-sm text-slate-700 font-medium">Neutral</div>
                            </div>
                            <div className="text-center p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                              <div className="text-xl sm:text-2xl font-bold text-blue-600">
                                {entityDetails.total_articles || 0}
                              </div>
                              <div className="text-xs sm:text-sm text-blue-700 font-medium">Total Articles</div>
                            </div>
                          </ResponsiveGrid>
                        )}

                        {/* AI Summary */}
                        {entityDetails.ai_summary && (
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-3 sm:p-4 rounded-r-lg">
                            <div className="flex items-center mb-2">
                              <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mr-2" />
                              <span className="font-bold text-blue-800 text-sm sm:text-base">AI Summary</span>
                            </div>
                            <p className="text-slate-700 font-medium leading-relaxed text-sm sm:text-base">
                              {entityDetails.ai_summary.final_summary}
                            </p>
                          </div>
                        )}
                      </ResponsiveCard>

                      {/* Articles by Sentiment */}
                      {searchResults && Object.entries(searchResults).map(([category, articles]: [string, any]) => {
                        if (!Array.isArray(articles) || articles.length === 0) return null;
                        
                        const categoryLabels: Record<string, { label: string; icon: any; color: string }> = {
                          positive_financial: { label: '📈 Positive Financial', icon: TrendingUp, color: 'emerald' },
                          negative_financial: { label: '📉 Negative Financial', icon: TrendingDown, color: 'red' },
                          neutral_financial: { label: '📊 Neutral Financial', icon: Minus, color: 'slate' },
                          positive_overall: { label: '✅ Positive Overall', icon: TrendingUp, color: 'green' },
                          negative_overall: { label: '❌ Negative Overall', icon: TrendingDown, color: 'rose' },
                          neutral_overall: { label: '⚪ Neutral Overall', icon: Minus, color: 'gray' }
                        };
                        
                        const categoryInfo = categoryLabels[category];
                        if (!categoryInfo) return null;
                        
                        return (
                          <motion.div 
                            key={category} 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.6 }}
                          >
                            <ResponsiveCard className="p-4 sm:p-6">
                              <div className="flex items-center mb-4">
                                <div className={`p-2 bg-gradient-to-r from-${categoryInfo.color}-100 to-${categoryInfo.color}-200 rounded-lg mr-3`}>
                                  <categoryInfo.icon className={`h-4 w-4 sm:h-5 sm:w-5 text-${categoryInfo.color}-600`} />
                                </div>
                                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                                  {categoryInfo.label} ({articles.length} articles)
                                </h3>
                              </div>
                              <ResponsiveGrid cols={{ sm: 1, md: 2 }} gap={4}>
                                {articles.slice(0, 6).map((article: any, index: number) => (
                                  <motion.div 
                                    key={index} 
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="p-3 sm:p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg border border-slate-200 hover:shadow-md transition-all duration-200 group"
                                  >
                                    <h4 className="font-semibold text-slate-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors text-sm sm:text-base">
                                      {article.title}
                                    </h4>
                                    <p className="text-xs sm:text-sm text-slate-600 mb-3 line-clamp-2 leading-relaxed">
                                      {article.reasoning}
                                    </p>
                                    <a
                                      href={article.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-medium group"
                                    >
                                      Read Article
                                      <ExternalLink className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform duration-200" />
                                    </a>
                                  </motion.div>
                                ))}
                              </ResponsiveGrid>
                              {articles.length > 6 && (
                                <div className="text-center mt-4">
                                  <p className="text-xs sm:text-sm text-slate-500 font-medium">
                                    +{articles.length - 6} more articles in this category
                                  </p>
                                </div>
                              )}
                            </ResponsiveCard>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : detailsLoading ? (
                    <LoadingSpinner size="lg" text="Loading entity details..." className="py-12" />
                  ) : null}
                </div>
              ) : (
                // Default Top Entities Grid
                <div>
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                      Top {sentimentFilter === 'positive' ? 'Performing' : 'Declining'} {activeFilter === 'all' ? 'Entities' : 
                       activeFilter === 'company' ? 'Companies' : 'crypto'} 
                      <span className="text-slate-500 ml-2">({displayEntities.length})</span>
                    </h2>
                  </div>
                  
                  {loading ? (
                    <SkeletonGrid count={6} />
                  ) : displayEntities.length === 0 ? (
                    <EmptyState
                      icon={Search}
                      title="No entities found"
                      description="Try adjusting your filters."
                      className="py-12"
                    />
                  ) : (
                    <ResponsiveGrid cols={{ sm: 1, md: 2 }} gap={6}>
                      {displayEntities.map((entity, index) => (
                        <motion.div
                          key={`${entity.entity_name}-${entity.entity_type}`}
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ duration: 0.6, delay: index * 0.1 }}
                        >
                          <EntityCard entity={entity} />
                        </motion.div>
                      ))}
                    </ResponsiveGrid>
                  )}
                </div>
              )}
            </motion.div>
          </div>

          {/* Right Side - Quick Stats and Articles Link */}
          <div className="xl:col-span-1 space-y-6">
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <ResponsiveCard className="p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-4">
                  Quick Stats
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                      <span className="text-slate-700 font-medium text-sm sm:text-base">Companies</span>
                    </div>
                    <span className="font-bold text-blue-600 text-base sm:text-lg">
                      {loading ? (
                        <div className="h-4 sm:h-5 w-6 sm:w-8 bg-slate-200 rounded animate-pulse"></div>
                      ) : (
                        topEntities.filter(e => e.entity_type === 'company').length
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <Bitcoin className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                      <span className="text-slate-700 font-medium text-sm sm:text-base">Cryptocurrencies</span>
                    </div>
                    <span className="font-bold text-amber-600 text-base sm:text-lg">
                      {loading ? (
                        <div className="h-4 sm:h-5 w-6 sm:w-8 bg-slate-200 rounded animate-pulse"></div>
                      ) : (
                        topEntities.filter(e => e.entity_type === 'crypto').length
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-100">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                      <span className="text-slate-700 font-medium text-sm sm:text-base">Total Articles</span>
                    </div>
                    <span className="font-bold text-emerald-600 text-base sm:text-lg">
                      {loading ? (
                        <div className="h-4 sm:h-5 w-6 sm:w-8 bg-slate-200 rounded animate-pulse"></div>
                      ) : (
                        dashboardStats?.articles_analyzed?.toLocaleString() || '0'
                      )}
                    </span>
                  </div>
                </div>
              </ResponsiveCard>
            </motion.div>

            {/* Articles Quick Access */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.9 }}
            >
              <ResponsiveCard className="p-4 sm:p-6">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg mr-3">
                    <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                    Latest Articles
                  </h3>
                </div>
                <p className="text-slate-600 mb-4 text-sm">
                  Explore AI-analyzed financial news with comprehensive sentiment insights.
                </p>
                <Link
                  to="/articles"
                  className="flex items-center justify-center space-x-2 w-full px-4 py-3 bg-primary-gradient hover:shadow-glow text-white font-semibold rounded-xl transition-all duration-300 group"
                >
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Browse Articles</span>
                  <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform duration-200" />
                </Link>
              </ResponsiveCard>
            </motion.div>

            {/* Market Trends */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.0 }}
            >
              <ResponsiveCard className="p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-4">
                  Market Trends
                </h3>
                <div className="space-y-4">
                  {getSentimentStats().map((stat, index) => {
                    const total = getSentimentStats().reduce((sum, s) => sum + s.value, 0);
                    const percentage = total > 0 ? Math.round((stat.value / total) * 100) : 0;
                    
                    return (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm text-slate-600 font-medium">{stat.label} Sentiment</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 sm:w-20 h-2 sm:h-3 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full bg-${stat.color}-gradient rounded-full transition-all duration-500`} 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className={`text-xs sm:text-sm font-bold text-${stat.color}-600`}>
                            {loading ? (
                              <div className="h-3 sm:h-4 w-6 sm:w-8 bg-slate-200 rounded animate-pulse"></div>
                            ) : (
                              `${percentage}%`
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ResponsiveCard>
            </motion.div>
          </div>
        </div>
      </ResponsiveContainer>

      {/* Mobile Filters Drawer */}
      <MobileDrawer
        isOpen={isMobileFiltersOpen}
        onClose={() => setIsMobileFiltersOpen(false)}
        title="Filters"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">Filter by Type</label>
            <div className="space-y-2">
              {filterButtons.map((button) => {
                const Icon = button.icon;
                const isActive = activeFilter === button.id;
                return (
                  <button
                    key={button.id}
                    onClick={() => {
                      setActiveFilter(button.id);
                      setIsMobileFiltersOpen(false);
                    }}
                    className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${
                      isActive
                        ? 'bg-primary-gradient text-white shadow-glow'
                        : 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 hover:from-slate-200 hover:to-slate-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{button.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">Financial Sentiment</label>
            <div className="space-y-2">
              {sentimentButtons.map((button) => {
                const Icon = button.icon;
                const isActive = sentimentFilter === button.id;
                return (
                  <button
                    key={button.id}
                    onClick={() => {
                      setSentimentFilter(button.id);
                      setIsMobileFiltersOpen(false);
                    }}
                    className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${
                      isActive
                        ? `bg-${button.color}-gradient text-white shadow-glow`
                        : 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 hover:from-slate-200 hover:to-slate-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{button.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </MobileDrawer>
    </div>
  );
};

export default Dashboard;