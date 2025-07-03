import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, Filter, Building, Coins, TrendingUp, TrendingDown, Minus, Brain, 
  Loader, ChevronDown, ChevronUp, ExternalLink, FileText, Calendar, 
  ArrowLeft, BarChart3, Users, Zap, Target, Award, AlertTriangle,
  Activity, Globe, DollarSign, Clock, Star, BookOpen
} from 'lucide-react';
import { Entity, Article, EntitySummary } from '../types';

const ResearchCenter = () => {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [suggestions, setSuggestions] = useState<Entity[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchResults, setSearchResults] = useState<Article[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [entitySummary, setEntitySummary] = useState<EntitySummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({});
  const [expandedArticles, setExpandedArticles] = useState<{[key: number]: boolean}>({});
  const [animationKey, setAnimationKey] = useState(0);

  // Fetch entities on component mount
  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/entities');
        if (response.ok) {
          const entitiesData = await response.json();
          setEntities(entitiesData);
        }
      } catch (error) {
        console.error('Error fetching entities:', error);
      }
    };

    fetchEntities();
  }, []);

  useEffect(() => {
    if (inputValue.length > 0) {
      const filtered = entities.filter(entity =>
        entity.entity_name.toLowerCase().includes(inputValue.toLowerCase()) &&
        (selectedFilter === 'all' || entity.entity_type === selectedFilter)
      ).slice(0, 8);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [inputValue, entities, selectedFilter]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSearch = async (entityName?: string) => {
    const searchTerm = entityName || inputValue;
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    setSelectedEntity(searchTerm);
    setShowSuggestions(false);
    setExpandedSections({});
    setExpandedArticles({});
    setAnimationKey(prev => prev + 1);

    try {
      // Search for articles
      const articlesResponse = await fetch(`http://localhost:5000/api/articles?entity_name=${encodeURIComponent(searchTerm)}&limit=50`);
      if (articlesResponse.ok) {
        const articlesData = await articlesResponse.json();
        setSearchResults(articlesData);
      }

      // Get AI summary
      await fetchEntitySummary(searchTerm);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const fetchEntitySummary = async (entityName: string) => {
    setIsLoadingSummary(true);
    try {
      const response = await fetch(`http://localhost:5000/api/summarize_entity?entity_name=${encodeURIComponent(entityName)}`);
      if (response.ok) {
        const summaryData = await response.json();
        setEntitySummary(summaryData);
      } else {
        setEntitySummary(null);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
      setEntitySummary(null);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleSuggestionClick = (entityName: string) => {
    setInputValue(entityName);
    handleSearch(entityName);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-sentiment-positive" />;
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-sentiment-negative" />;
      default:
        return <Minus className="h-4 w-4 text-sentiment-neutral" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'negative':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const toggleArticle = (articleId: number) => {
    setExpandedArticles(prev => ({
      ...prev,
      [articleId]: !prev[articleId]
    }));
  };

  const getRelatedArticles = (items: string[]) => {
    return searchResults.filter(article => 
      items.some(item => 
        article.cleaned_text?.toLowerCase().includes(item.toLowerCase().substring(0, 20)) ||
        article.sentiments?.some(sentiment => 
          sentiment.reasoning?.toLowerCase().includes(item.toLowerCase().substring(0, 20))
        )
      )
    ).slice(0, 3);
  };

  const calculateSentimentStats = () => {
    if (!searchResults.length) return { positive: 0, negative: 0, neutral: 0, total: 0 };
    
    let positive = 0, negative = 0, neutral = 0;
    
    searchResults.forEach(article => {
      article.sentiments?.forEach(sentiment => {
        if (sentiment.financial_sentiment === 'positive') positive++;
        else if (sentiment.financial_sentiment === 'negative') negative++;
        else neutral++;
      });
    });
    
    const total = positive + negative + neutral;
    return { positive, negative, neutral, total };
  };

  const renderSummarySection = (title: string, items: string[], type: 'positive' | 'negative') => {
    const isExpanded = expandedSections[title];
    const colorClass = type === 'positive' 
      ? 'text-green-700 bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-green-100' 
      : 'text-red-700 bg-gradient-to-br from-red-50 to-red-100 border-red-200 shadow-red-100';
    const icon = type === 'positive' ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />;
    const relatedArticles = getRelatedArticles(items);

    return (
      <div className={`border rounded-xl ${colorClass} shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}>
        <button
          onClick={() => toggleSection(title)}
          className="w-full p-6 flex items-center justify-between hover:bg-opacity-80 transition-all duration-200"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white bg-opacity-50 rounded-lg">
              {icon}
            </div>
            <div className="text-left">
              <span className="font-bold text-lg">{title}</span>
              <div className="text-sm opacity-75">({items.length} key points)</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {relatedArticles.length > 0 && (
              <span className="text-xs bg-white bg-opacity-50 px-2 py-1 rounded-full">
                {relatedArticles.length} articles
              </span>
            )}
            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </button>
        
        {isExpanded && (
          <div className="px-6 pb-6 space-y-6 animate-slide-up">
            {/* Key Points */}
            <div className="bg-white bg-opacity-60 rounded-lg p-4">
              <h5 className="font-bold text-base mb-4 flex items-center space-x-2">
                <Target className="h-4 w-4" />
                <span>Key Insights</span>
              </h5>
              <div className="grid gap-3">
                {items.map((item, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-current border-opacity-20 hover:shadow-md transition-shadow">
                    <div className="w-6 h-6 rounded-full bg-current bg-opacity-20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold">{index + 1}</span>
                    </div>
                    <span className="text-sm leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Related Articles */}
            {relatedArticles.length > 0 && (
              <div className="bg-white bg-opacity-60 rounded-lg p-4">
                <h5 className="font-bold text-base mb-4 flex items-center space-x-2">
                  <BookOpen className="h-4 w-4" />
                  <span>Supporting Evidence ({relatedArticles.length})</span>
                </h5>
                <div className="grid gap-3">
                  {relatedArticles.map((article, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg border border-current border-opacity-20 hover:shadow-md transition-all duration-200 hover:scale-105">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h6 className="font-semibold text-sm line-clamp-2 mb-2">{article.title}</h6>
                          <div className="flex items-center space-x-3 text-xs opacity-75 mb-2">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{article.publication_date ? new Date(article.publication_date).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            {article.author && (
                              <span>by {article.author}</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {article.cleaned_text?.substring(0, 100)}...
                          </p>
                        </div>
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-3 p-2 hover:bg-current hover:bg-opacity-10 rounded-lg transition-colors group"
                          title="Read full article"
                        >
                          <ExternalLink className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const stats = calculateSentimentStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link to="/dashboard" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors">
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <div className="flex items-center space-x-2">
                <Brain className="h-8 w-8 text-primary-600" />
                <span className="text-xl font-bold text-gray-900">Research Center</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 bg-gradient-to-r from-primary-600 to-secondary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-white">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 animate-fade-in">
              AI-Powered Research Center
            </h1>
            <p className="text-xl text-primary-100 mb-8 max-w-3xl mx-auto animate-slide-up">
              Deep dive into comprehensive financial analysis with AI-generated insights, 
              sentiment tracking, and evidence-based research for MENA markets.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Search Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden mb-12 animate-slide-up">
          <div className="bg-gradient-to-r from-accent-600 to-primary-600 p-8">
            <div className="flex items-center space-x-3 mb-4">
              <Search className="h-8 w-8 text-white" />
              <h2 className="text-3xl font-bold text-white">Entity Research</h2>
            </div>
            <p className="text-accent-100 text-lg">
              Search and analyze any company or cryptocurrency with comprehensive AI insights
            </p>
          </div>

          <div className="p-8">
            {/* Search Input */}
            <div className="relative mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search companies, cryptocurrencies..."
                  className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 shadow-sm"
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                />
              </div>
              
              {/* Enhanced Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-2xl max-h-80 overflow-y-auto animate-slide-up">
                  {suggestions.map((entity, index) => (
                    <button
                      key={index}
                      className="w-full px-6 py-4 text-left hover:bg-gradient-to-r hover:from-primary-50 hover:to-secondary-50 flex items-center space-x-4 border-b border-gray-100 last:border-b-0 transition-all duration-200"
                      onClick={() => handleSuggestionClick(entity.entity_name)}
                    >
                      <div className={`p-3 rounded-lg ${entity.entity_type === 'company' ? 'bg-primary-100' : 'bg-secondary-100'}`}>
                        {entity.entity_type === 'company' ? (
                          <Building className="h-6 w-6 text-primary-600" />
                        ) : (
                          <Coins className="h-6 w-6 text-secondary-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-lg">{entity.entity_name}</div>
                        <div className="text-sm text-gray-500 capitalize">{entity.entity_type}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-3 mb-8">
              {[
                { value: 'all', label: 'All Entities', icon: Filter, color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
                { value: 'company', label: 'Companies', icon: Building, color: 'bg-primary-100 text-primary-700 hover:bg-primary-200' },
                { value: 'crypto', label: 'Cryptocurrencies', icon: Coins, color: 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200' }
              ].map(filter => (
                <button
                  key={filter.value}
                  onClick={() => setSelectedFilter(filter.value)}
                  className={`flex items-center space-x-3 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 transform hover:scale-105 ${
                    selectedFilter === filter.value
                      ? 'bg-primary-600 text-white shadow-lg'
                      : filter.color
                  }`}
                >
                  <filter.icon className="h-5 w-5" />
                  <span>{filter.label}</span>
                </button>
              ))}
            </div>

            {/* Search Button */}
            <button
              onClick={() => handleSearch()}
              disabled={isSearching || !inputValue.trim()}
              className="w-full bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-4 rounded-xl font-bold text-lg hover:from-primary-700 hover:to-secondary-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              {isSearching ? (
                <>
                  <Loader className="h-6 w-6 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Brain className="h-6 w-6" />
                  <span>Start Deep Research</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Section */}
        {selectedEntity && (
          <div key={animationKey} className="space-y-12 animate-fade-in">
            {/* Entity Header */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-primary-600 to-secondary-600 p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2">{selectedEntity}</h2>
                    <p className="text-primary-100 text-lg">Comprehensive Research Analysis</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">{searchResults.length}</div>
                    <div className="text-primary-100">Articles Found</div>
                  </div>
                </div>
              </div>

              {/* Stats Dashboard */}
              {stats.total > 0 && (
                <div className="p-8 bg-gradient-to-r from-gray-50 to-white">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
                    <BarChart3 className="h-6 w-6 text-primary-600" />
                    <span>Sentiment Overview</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-3">
                        <Activity className="h-8 w-8 text-primary-600" />
                        <div>
                          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                          <div className="text-gray-600">Total Mentions</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-green-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-3">
                        <TrendingUp className="h-8 w-8 text-green-600" />
                        <div>
                          <div className="text-2xl font-bold text-green-700">{stats.positive}</div>
                          <div className="text-gray-600">Positive</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-red-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-3">
                        <TrendingDown className="h-8 w-8 text-red-600" />
                        <div>
                          <div className="text-2xl font-bold text-red-700">{stats.negative}</div>
                          <div className="text-gray-600">Negative</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-3">
                        <Minus className="h-8 w-8 text-gray-600" />
                        <div>
                          <div className="text-2xl font-bold text-gray-700">{stats.neutral}</div>
                          <div className="text-gray-600">Neutral</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* AI Summary Section */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-accent-600 to-primary-600 p-8">
                <div className="flex items-center space-x-3">
                  <Brain className="h-8 w-8 text-white" />
                  <h3 className="text-3xl font-bold text-white">AI-Generated Analysis</h3>
                </div>
                <p className="text-accent-100 text-lg mt-2">
                  Comprehensive insights powered by advanced AI analysis
                </p>
              </div>
              
              <div className="p-8">
                {isLoadingSummary ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="relative">
                      <Loader className="h-12 w-12 animate-spin text-primary-600" />
                      <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full bg-primary-200"></div>
                    </div>
                    <span className="mt-4 text-lg text-gray-600">Generating comprehensive AI analysis...</span>
                    <span className="mt-2 text-sm text-gray-500">This may take a few moments</span>
                  </div>
                ) : entitySummary ? (
                  <div className="space-y-8">
                    {/* Executive Summary */}
                    <div className="bg-gradient-to-br from-primary-50 to-secondary-50 p-8 rounded-xl border border-primary-200 shadow-lg">
                      <h4 className="text-2xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                        <Award className="h-6 w-6 text-primary-600" />
                        <span>Executive Summary</span>
                      </h4>
                      <p className="text-lg text-gray-700 leading-relaxed">{entitySummary.final_summary}</p>
                    </div>

                    {/* Detailed Analysis Sections */}
                    <div className="grid gap-6">
                      {entitySummary.positive_financial.length > 0 && 
                        renderSummarySection('Positive Financial Performance', entitySummary.positive_financial, 'positive')}
                      
                      {entitySummary.negative_financial.length > 0 && 
                        renderSummarySection('Financial Challenges', entitySummary.negative_financial, 'negative')}
                      
                      {entitySummary.positive_overall.length > 0 && 
                        renderSummarySection('Strategic Strengths', entitySummary.positive_overall, 'positive')}
                      
                      {entitySummary.negative_overall.length > 0 && 
                        renderSummarySection('Operational Concerns', entitySummary.negative_overall, 'negative')}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <h4 className="text-xl font-semibold text-gray-700 mb-2">No Analysis Available</h4>
                    <p className="text-gray-500">No sentiment data found for this entity</p>
                  </div>
                )}
              </div>
            </div>

            {/* Research Articles Section */}
            {searchResults.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-secondary-600 to-accent-600 p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-3xl font-bold text-white mb-2">Source Articles</h3>
                      <p className="text-secondary-100 text-lg">
                        Detailed analysis of {searchResults.length} research articles
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">{searchResults.length}</div>
                      <div className="text-secondary-100">Articles</div>
                    </div>
                  </div>
                </div>
                
                <div className="p-8">
                  <div className="grid gap-6">
                    {searchResults.map((article, index) => (
                      <div key={article.id} className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h4 className="font-bold text-xl text-gray-900 line-clamp-2 mb-3">
                                {article.title}
                              </h4>
                              <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                                {article.publication_date && (
                                  <div className="flex items-center space-x-1">
                                    <Calendar className="h-4 w-4" />
                                    <span>{new Date(article.publication_date).toLocaleDateString()}</span>
                                  </div>
                                )}
                                {article.author && (
                                  <div className="flex items-center space-x-1">
                                    <Users className="h-4 w-4" />
                                    <span>{article.author}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                              <button
                                onClick={() => toggleArticle(article.id)}
                                className="p-2 text-gray-400 hover:text-primary-600 transition-colors rounded-lg hover:bg-gray-100"
                                title={expandedArticles[article.id] ? "Collapse" : "Expand"}
                              >
                                {expandedArticles[article.id] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                              </button>
                              <a
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-gray-400 hover:text-primary-600 transition-colors rounded-lg hover:bg-gray-100"
                                title="Read full article"
                              >
                                <ExternalLink className="h-5 w-5" />
                              </a>
                            </div>
                          </div>
                          
                          <p className={`text-gray-600 leading-relaxed mb-6 ${expandedArticles[article.id] ? '' : 'line-clamp-3'}`}>
                            {expandedArticles[article.id] 
                              ? article.cleaned_text 
                              : `${article.cleaned_text?.substring(0, 200)}...`
                            }
                          </p>
                          
                          {article.sentiments && article.sentiments.length > 0 && (
                            <div className="space-y-4">
                              <h5 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                                <BarChart3 className="h-5 w-5 text-primary-600" />
                                <span>Sentiment Analysis</span>
                              </h5>
                              <div className="grid gap-4">
                                {article.sentiments.slice(0, expandedArticles[article.id] ? undefined : 3).map((sentiment, sentIndex) => (
                                  <div key={sentIndex} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center space-x-2">
                                        <span className="font-semibold text-gray-900">{sentiment.entity_name}</span>
                                        <span className="text-sm text-gray-500 capitalize bg-gray-100 px-2 py-1 rounded-full">
                                          {sentiment.entity_type}
                                        </span>
                                      </div>
                                      <div className="flex space-x-2">
                                        <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium border ${getSentimentColor(sentiment.financial_sentiment)}`}>
                                          {getSentimentIcon(sentiment.financial_sentiment)}
                                          <span className="capitalize">Financial: {sentiment.financial_sentiment}</span>
                                        </div>
                                        <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium border ${getSentimentColor(sentiment.overall_sentiment)}`}>
                                          {getSentimentIcon(sentiment.overall_sentiment)}
                                          <span className="capitalize">Overall: {sentiment.overall_sentiment}</span>
                                        </div>
                                      </div>
                                    </div>
                                    {sentiment.reasoning && expandedArticles[article.id] && (
                                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                        <div className="text-sm font-medium text-gray-700 mb-1">Analysis Reasoning:</div>
                                        <div className="text-sm text-gray-600 leading-relaxed">{sentiment.reasoning}</div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                              {article.sentiments.length > 3 && !expandedArticles[article.id] && (
                                <button
                                  onClick={() => toggleArticle(article.id)}
                                  className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center space-x-1"
                                >
                                  <span>+{article.sentiments.length - 3} more entities</span>
                                  <ChevronDown className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Popular Entities Section */}
        {!selectedEntity && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden animate-slide-up">
            <div className="bg-gradient-to-r from-secondary-600 to-primary-600 p-8">
              <h3 className="text-3xl font-bold text-white mb-2">Popular Research Targets</h3>
              <p className="text-secondary-100 text-lg">
                Explore trending companies and cryptocurrencies in MENA markets
              </p>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {entities.slice(0, 12).map((entity, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(entity.entity_name)}
                    className="flex items-center space-x-4 p-4 rounded-xl border border-gray-200 hover:bg-gradient-to-r hover:from-primary-50 hover:to-secondary-50 hover:border-primary-200 transition-all duration-200 text-left transform hover:scale-105 hover:shadow-md"
                  >
                    <div className={`p-3 rounded-lg ${entity.entity_type === 'company' ? 'bg-primary-100' : 'bg-secondary-100'}`}>
                      {entity.entity_type === 'company' ? (
                        <Building className="h-6 w-6 text-primary-600" />
                      ) : (
                        <Coins className="h-6 w-6 text-secondary-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{entity.entity_name}</div>
                      <div className="text-sm text-gray-500 capitalize">{entity.entity_type}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResearchCenter;