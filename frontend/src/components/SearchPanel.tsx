import React, { useState, useEffect } from 'react';
import { Search, Filter, Building, Coins, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Entity, Article } from '../types';

interface SearchPanelProps {
  entities: Entity[];
  onSearch: (query: string) => void;
  searchQuery: string;
  results: Article[];
  isSearching: boolean;
}

const SearchPanel: React.FC<SearchPanelProps> = ({
  entities,
  onSearch,
  searchQuery,
  results,
  isSearching
}) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [suggestions, setSuggestions] = useState<Entity[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

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

  const handleSearch = () => {
    onSearch(inputValue);
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (entityName: string) => {
    setInputValue(entityName);
    onSearch(entityName);
    setShowSuggestions(false);
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
        return 'text-sentiment-positive bg-green-50';
      case 'negative':
        return 'text-sentiment-negative bg-red-50';
      default:
        return 'text-sentiment-neutral bg-gray-50';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-accent-600 to-primary-600 p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Search Companies</h2>
        <p className="text-accent-100">Find sentiment analysis for specific entities</p>
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
          onClick={handleSearch}
          className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors mb-6"
        >
          Search Analysis
        </button>

        {/* Results */}
        {isSearching && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Search Results ({results.length})
            </h3>
            
            {results.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {results.map((article) => (
                  <div key={article.id} className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">
                      {article.title}
                    </h4>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {article.cleaned_text?.substring(0, 120)}...
                    </p>
                    
                    {article.sentiments && article.sentiments.length > 0 && (
                      <div className="space-y-2">
                        {article.sentiments.slice(0, 2).map((sentiment, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">
                              {sentiment.entity_name}
                            </span>
                            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${getSentimentColor(sentiment.financial_sentiment)}`}>
                              {getSentimentIcon(sentiment.financial_sentiment)}
                              <span className="capitalize">{sentiment.financial_sentiment}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No articles found for "{searchQuery}"</p>
              </div>
            )}
          </div>
        )}

        {/* Popular Entities */}
        {!isSearching && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Entities</h3>
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