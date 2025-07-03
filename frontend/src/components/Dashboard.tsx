import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Search, Filter, ArrowLeft, ExternalLink } from 'lucide-react';
import ArticleCard from './ArticleCard';
import SearchPanel from './SearchPanel';
import { Article, Entity } from '../types';

const Dashboard = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [filteredResults, setFilteredResults] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentArticleIndex, setCurrentArticleIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [articlesResponse, entitiesResponse] = await Promise.all([
          fetch('http://localhost:5000/api/articles?limit=50'),
          fetch('http://localhost:5000/api/entities')
        ]);

        if (articlesResponse.ok) {
          const articlesData = await articlesResponse.json();
          setArticles(articlesData);
        }

        if (entitiesResponse.ok) {
          const entitiesData = await entitiesResponse.json();
          setEntities(entitiesData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Auto-scroll through articles
  useEffect(() => {
    if (articles.length > 0 && !isSearching) {
      const interval = setInterval(() => {
        setCurrentArticleIndex((prev) => (prev + 1) % Math.min(articles.length, 10));
      }, 4000);

      return () => clearInterval(interval);
    }
  }, [articles, isSearching]);

  // Search functionality
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setIsSearching(!!query);

    if (!query.trim()) {
      setFilteredResults([]);
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/articles?entity_name=${encodeURIComponent(query)}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setFilteredResults(data);
      }
    } catch (error) {
      console.error('Error searching:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading financial news data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link to="/" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Home</span>
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-8 w-8 text-primary-600" />
                <span className="text-xl font-bold text-gray-900">MENA Financial Dashboard</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {articles.length} Articles • {entities.length} Entities
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Articles Feed */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-primary-600 to-secondary-600 p-6">
                <h2 className="text-2xl font-bold text-white mb-2">Latest Financial News</h2>
                <p className="text-primary-100">
                  Real-time sentiment analysis from MENA financial markets
                </p>
              </div>
              
              <div className="p-6">
                {articles.length > 0 ? (
                  <div className="space-y-6">
                    {articles.slice(0, 5).map((article, index) => (
                      <div
                        key={article.id}
                        className={`transition-all duration-500 ${
                          index === currentArticleIndex % 5 ? 'ring-2 ring-primary-200 bg-primary-50' : ''
                        }`}
                      >
                        <ArticleCard article={article} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No articles available at the moment</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Search */}
          <div className="lg:col-span-1">
            <SearchPanel
              entities={entities}
              onSearch={handleSearch}
              searchQuery={searchQuery}
              results={filteredResults}
              isSearching={isSearching}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;