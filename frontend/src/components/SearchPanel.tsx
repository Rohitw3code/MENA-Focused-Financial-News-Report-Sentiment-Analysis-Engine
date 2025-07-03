import React, { useState, useEffect } from 'react';
import { Search, Filter, Building, Coins, TrendingUp, TrendingDown, Minus, Brain, Loader, ChevronDown, ChevronUp, ExternalLink, FileText, Calendar } from 'lucide-react';
import { Entity, Article, EntitySummary } from '../types';

interface SearchPanelProps {
  entities: Entity[];
}

const SearchPanel: React.FC<SearchPanelProps> = ({ entities }) => {
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

    try {
      // Search for articles
      const articlesResponse = await fetch(`http://localhost:5000/api/articles?entity_name=${encodeURIComponent(searchTerm)}&limit=20`);
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
        return 'text-sentiment-positive bg-green-50 border-green-200';
      case 'negative':
        return 'text-sentiment-negative bg-red-50 border-red-200';
      default:
        return 'text-sentiment-neutral bg-gray-50 border-gray-200';
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
    // Find articles that contain mentions of the summary points
    return searchResults.filter(article => 
      items.some(item => 
        article.cleaned_text?.toLowerCase().includes(item.toLowerCase().substring(0, 20)) ||
        article.sentiments?.some(sentiment => 
          sentiment.reasoning?.toLowerCase().includes(item.toLowerCase().substring(0, 20))
        )
      )
    ).slice(0, 3);
  };

  const renderSummarySection = (title: string, items: string[], type: 'positive' | 'negative') => {
    const isExpanded = expandedSections[title];
    const colorClass = type === 'positive' ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200';
    const icon = type === 'positive' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
    const relatedArticles = getRelatedArticles(items);

    return (
      <div className={`border rounded-lg ${colorClass}`}>
        <button
          onClick={() => toggleSection(title)}
          className="w-full p-4 flex items-center justify-between hover:bg-opacity-80 transition-colors"
        >
          <div className="flex items-center space-x-2">
            {icon}
            <span className="font-medium">{title}</span>
            <span className="text-sm opacity-75">({items.length})</span>
          </div>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        
        {isExpanded && (
          <div className="px-4 pb-4 space-y-4">
            {/* Key Points */}
            <div>
              <h5 className="font-medium text-sm mb-3">Key Points:</h5>
              <ul className="space-y-2">
                {items.map((item, index) => (
                  <li key={index} className="text-sm flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-current mt-2 flex-shrink-0"></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Related Articles */}
            {relatedArticles.length > 0 && (
              <div className="border-t pt-3">
                <h5 className="font-medium text-sm mb-3 flex items-center space-x-1">
                  <FileText className="h-4 w-4" />
                  <span>Supporting Articles ({relatedArticles.length}):</span>
                </h5>
                <div className="space-y-2">
                  {relatedArticles.map((article, index) => (
                    <div key={index} className="bg-white bg-opacity-60 p-3 rounded-lg border border-current border-opacity-20">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h6 className="font-medium text-sm line-clamp-2 mb-1">{article.title}</h6>
                          <div className="flex items-center space-x-2 text-xs opacity-75">
                            <Calendar className="h-3 w-3" />
                            <span>{article.publication_date ? new Date(article.publication_date).toLocaleDateString() : 'N/A'}</span>
                          </div>
                        </div>
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 p-1 hover:bg-current hover:bg-opacity-10 rounded transition-colors"
                          title="Read full article"
                        >
                          <ExternalLink className="h-3 w-3" />
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-accent-600 to-primary-600 p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Research Center</h2>
        <p className="text-accent-100">AI-powered entity analysis and insights</p>
      </div>

      <div className="p-6">
        {/* Search Input */}
        <div className="relative mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search companies, cryptocurrencies..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
            />
          </div>
          
          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {suggestions.map((entity, index) => (
                <button
                  key={index}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 border-b border-gray-100 last:border-b-0"
                  onClick={() => handleSuggestionClick(entity.entity_name)}
                >
                  {entity.entity_type === 'company' ? (
                    <Building className="h-4 w-4 text-primary-600" />
                  ) : (
                    <Coins className="h-4 w-4 text-secondary-600" />
                  )}
                  <div>
                    <div className="font-medium text-gray-900">{entity.entity_name}</div>
                    <div className="text-sm text-gray-500 capitalize">{entity.entity_type}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="flex space-x-2 mb-6">
          {[
            { value: 'all', label: 'All', icon: Filter },
            { value: 'company', label: 'Companies', icon: Building },
            { value: 'crypto', label: 'Crypto', icon: Coins }
          ].map(filter => (
            <button
              key={filter.value}
              onClick={() => setSelectedFilter(filter.value)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedFilter === filter.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <filter.icon className="h-4 w-4" />
              <span>{filter.label}</span>
            </button>
          ))}
        </div>

        {/* Search Button */}
        <button
          onClick={() => handleSearch()}
          disabled={isSearching}
          className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors mb-6 disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          {isSearching ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              <span>Researching...</span>
            </>
          ) : (
            <>
              <Brain className="h-4 w-4" />
              <span>Start Research</span>
            </>
          )}
        </button>

        {/* AI Summary Section */}
        {selectedEntity && (
          <div className="border-t pt-6 mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <Brain className="h-5 w-5 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900">AI Analysis: {selectedEntity}</h3>
            </div>
            
            {isLoadingSummary ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="h-6 w-6 animate-spin text-primary-600" />
                <span className="ml-2 text-gray-600">Generating AI summary...</span>
              </div>
            ) : entitySummary ? (
              <div className="space-y-4">
                {/* Final Summary */}
                <div className="bg-gradient-to-r from-primary-50 to-secondary-50 p-4 rounded-lg border border-primary-200">
                  <h4 className="font-semibold text-gray-900 mb-2">Executive Summary</h4>
                  <p className="text-gray-700">{entitySummary.final_summary}</p>
                </div>

                {/* Detailed Analysis */}
                <div className="space-y-3">
                  {entitySummary.positive_financial.length > 0 && 
                    renderSummarySection('Positive Financial', entitySummary.positive_financial, 'positive')}
                  
                  {entitySummary.negative_financial.length > 0 && 
                    renderSummarySection('Negative Financial', entitySummary.negative_financial, 'negative')}
                  
                  {entitySummary.positive_overall.length > 0 && 
                    renderSummarySection('Positive Overall', entitySummary.positive_overall, 'positive')}
                  
                  {entitySummary.negative_overall.length > 0 && 
                    renderSummarySection('Negative Overall', entitySummary.negative_overall, 'negative')}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No analysis data available for this entity</p>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Search Results */}
        {selectedEntity && searchResults.length > 0 && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Research Articles ({searchResults.length})
            </h3>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {searchResults.map((article) => (
                <div key={article.id} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 line-clamp-2 flex-1 mr-2">
                        {article.title}
                      </h4>
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <button
                          onClick={() => toggleArticle(article.id)}
                          className="p-1 text-gray-400 hover:text-primary-600 transition-colors rounded"
                          title={expandedArticles[article.id] ? "Collapse" : "Expand"}
                        >
                          {expandedArticles[article.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-gray-400 hover:text-primary-600 transition-colors rounded"
                          title="Read full article"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-gray-500 mb-3">
                      {article.publication_date && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(article.publication_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      {article.author && (
                        <span>by {article.author}</span>
                      )}
                    </div>
                    
                    <p className={`text-sm text-gray-600 mb-3 ${expandedArticles[article.id] ? '' : 'line-clamp-2'}`}>
                      {expandedArticles[article.id] 
                        ? article.cleaned_text 
                        : `${article.cleaned_text?.substring(0, 120)}...`
                      }
                    </p>
                    
                    {article.sentiments && article.sentiments.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-xs font-medium text-gray-700 uppercase tracking-wide">Sentiment Analysis</h5>
                        <div className="grid grid-cols-1 gap-2">
                          {article.sentiments.slice(0, expandedArticles[article.id] ? undefined : 2).map((sentiment, index) => (
                            <div key={index} className="bg-white p-3 rounded border">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">
                                  {sentiment.entity_name}
                                </span>
                                <div className="flex space-x-1">
                                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs border ${getSentimentColor(sentiment.financial_sentiment)}`}>
                                    {getSentimentIcon(sentiment.financial_sentiment)}
                                    <span className="capitalize">F: {sentiment.financial_sentiment}</span>
                                  </div>
                                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs border ${getSentimentColor(sentiment.overall_sentiment)}`}>
                                    {getSentimentIcon(sentiment.overall_sentiment)}
                                    <span className="capitalize">O: {sentiment.overall_sentiment}</span>
                                  </div>
                                </div>
                              </div>
                              {sentiment.reasoning && expandedArticles[article.id] && (
                                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                  <strong>Analysis:</strong> {sentiment.reasoning}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        {article.sentiments.length > 2 && !expandedArticles[article.id] && (
                          <button
                            onClick={() => toggleArticle(article.id)}
                            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                          >
                            +{article.sentiments.length - 2} more entities
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Popular Entities */}
        {!selectedEntity && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Research Targets</h3>
            <div className="grid grid-cols-1 gap-2">
              {entities.slice(0, 8).map((entity, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(entity.entity_name)}
                  className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
                >
                  {entity.entity_type === 'company' ? (
                    <Building className="h-5 w-5 text-primary-600" />
                  ) : (
                    <Coins className="h-5 w-5 text-secondary-600" />
                  )}
                  <div>
                    <div className="font-medium text-gray-900">{entity.entity_name}</div>
                    <div className="text-sm text-gray-500 capitalize">{entity.entity_type}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPanel;