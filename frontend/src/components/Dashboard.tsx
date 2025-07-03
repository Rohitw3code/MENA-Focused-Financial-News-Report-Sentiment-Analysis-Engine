import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, ArrowLeft, BarChart3, Users, FileText, Zap, Brain, ArrowRight } from 'lucide-react';
import SearchPanel from './SearchPanel';
import NewsCarousel from './NewsCarousel';
import { Article, Entity } from '../types';

const Dashboard = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalArticles: 0,
    totalEntities: 0,
    totalSentiments: 0
  });

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
          
          // Calculate stats
          const totalSentiments = articlesData.reduce((acc: number, article: Article) => 
            acc + (article.sentiments?.length || 0), 0
          );
          
          setStats(prev => ({
            ...prev,
            totalArticles: articlesData.length,
            totalSentiments
          }));
        }

        if (entitiesResponse.ok) {
          const entitiesData = await entitiesResponse.json();
          setEntities(entitiesData);
          setStats(prev => ({
            ...prev,
            totalEntities: entitiesData.length
          }));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading research platform...</p>
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
                <span className="text-xl font-bold text-gray-900">MENA Research Platform</span>
              </div>
            </div>
            <Link
              to="/research"
              className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center space-x-2"
            >
              <Brain className="h-5 w-5" />
              <span>Research Center</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-primary-200" />
              <div>
                <div className="text-2xl font-bold">{stats.totalArticles}</div>
                <div className="text-primary-200 text-sm">Research Articles</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Users className="h-6 w-6 text-primary-200" />
              <div>
                <div className="text-2xl font-bold">{stats.totalEntities}</div>
                <div className="text-primary-200 text-sm">Tracked Entities</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-6 w-6 text-primary-200" />
              <div>
                <div className="text-2xl font-bold">{stats.totalSentiments}</div>
                <div className="text-primary-200 text-sm">Sentiment Analyses</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - News Carousel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-primary-600 to-secondary-600 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Latest Market Intelligence</h2>
                    <p className="text-primary-100">
                      Real-time sentiment analysis from MENA financial markets
                    </p>
                  </div>
                  <Zap className="h-8 w-8 text-primary-200" />
                </div>
              </div>
              
              <NewsCarousel articles={articles} />
            </div>
          </div>

          {/* Right Panel - Research Tools */}
          <div className="lg:col-span-1">
            <SearchPanel entities={entities} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;