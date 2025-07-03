import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, ExternalLink, Calendar, FileText, Brain, Loader } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useApi } from '../contexts/ApiContext';

const EntityDetail: React.FC = () => {
  const { entityName } = useParams<{ entityName: string }>();
  const [sentimentTrend, setSentimentTrend] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const { fetchData } = useApi();

  useEffect(() => {
    if (entityName) {
      loadEntityData();
    }
  }, [entityName]);

  const loadEntityData = async () => {
    try {
      setLoading(true);
      
      // Load basic data first for fast initial render
      const [trendData, articlesData] = await Promise.all([
        fetchData('/sentiment_over_time', { entity_name: entityName }),
        fetchData('/articles', { entity_name: entityName, limit: 10 })
      ]);

      setSentimentTrend(trendData.financial_sentiment_trend || []);
      setArticles(articlesData);
      setLoading(false);

      // Load AI summary separately after basic data is loaded
      loadAISummary();
    } catch (error) {
      console.error('Error loading entity data:', error);
      setLoading(false);
    }
  };

  const loadAISummary = async () => {
    try {
      setSummaryLoading(true);
      const summaryData = await fetchData('/summarize_entity', { entity_name: entityName });
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading AI summary:', error);
      // Don't show error, just leave summary empty
    } finally {
      setSummaryLoading(false);
    }
  };

  const getSentimentDistribution = () => {
    const distribution = articles.reduce((acc, article) => {
      article.sentiments?.forEach((sentiment: any) => {
        if (sentiment.entity_name.toLowerCase().includes(entityName?.toLowerCase() || '')) {
          acc[sentiment.overall_sentiment] = (acc[sentiment.overall_sentiment] || 0) + 1;
        }
      });
      return acc;
    }, {} as Record<string, number>);

    return [
      { name: 'Positive', value: distribution.positive || 0, color: '#22c55e' },
      { name: 'Negative', value: distribution.negative || 0, color: '#ef4444' },
      { name: 'Neutral', value: distribution.neutral || 0, color: '#6b7280' }
    ];
  };

  const formatTrendData = () => {
    return sentimentTrend.map(([date, score]) => ({
      date: new Date(date).toLocaleDateString(),
      score: score
    }));
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-card-gradient rounded-xl p-6 h-96 border border-white/50"></div>
                <div className="bg-card-gradient rounded-xl p-6 h-64 border border-white/50"></div>
              </div>
              <div className="space-y-6">
                <div className="bg-card-gradient rounded-xl p-6 h-48 border border-white/50"></div>
                <div className="bg-card-gradient rounded-xl p-6 h-96 border border-white/50"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-400/10 to-indigo-400/10 rounded-full mix-blend-multiply filter blur-xl animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full mix-blend-multiply filter blur-xl animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <Link
            to="/dashboard"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4 font-semibold"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
              {entityName} Analysis
            </span>
          </h1>
          <p className="text-lg text-slate-600">
            Comprehensive sentiment analysis and market insights
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sentiment Trend Chart */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-card-gradient rounded-xl shadow-card border border-white/50 p-6"
            >
              <h2 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-6">
                Sentiment Trend
              </h2>
              {formatTrendData().length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={formatTrendData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#64748b" />
                    <YAxis domain={[-1, 1]} stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="url(#colorGradient)" 
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    />
                    <defs>
                      <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                    </defs>
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4" />
                  <p>No trend data available</p>
                </div>
              )}
            </motion.div>

            {/* AI Summary - Loads separately with Gradient */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-card-gradient rounded-xl shadow-card border border-white/50 p-6"
            >
              <div className="flex items-center mb-6">
                <div className="p-2 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg mr-3">
                  <Brain className="h-6 w-6 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  AI-Generated Summary
                </h2>
                {summaryLoading && (
                  <Loader className="h-5 w-5 text-blue-600 ml-2 animate-spin" />
                )}
              </div>
              
              {summaryLoading ? (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                    <div className="h-4 bg-slate-200 rounded animate-pulse"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-200 rounded animate-pulse"></div>
                      <div className="h-20 bg-slate-100 rounded animate-pulse"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-200 rounded animate-pulse"></div>
                      <div className="h-20 bg-slate-100 rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ) : summary ? (
                <>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-6">
                    <p className="text-slate-700 font-medium">{summary.final_summary}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-bold text-slate-900 mb-3">Financial Sentiment</h3>
                      <div className="space-y-2">
                        {summary.positive_financial?.length > 0 && (
                          <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                            <h4 className="text-sm font-bold text-green-800 mb-1">Positive</h4>
                            <ul className="text-sm text-green-700 space-y-1">
                              {summary.positive_financial.slice(0, 3).map((point: string, idx: number) => (
                                <li key={idx}>• {point}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {summary.negative_financial?.length > 0 && (
                          <div className="p-3 bg-gradient-to-r from-red-50 to-rose-50 rounded-lg border border-red-200">
                            <h4 className="text-sm font-bold text-red-800 mb-1">Negative</h4>
                            <ul className="text-sm text-red-700 space-y-1">
                              {summary.negative_financial.slice(0, 3).map((point: string, idx: number) => (
                                <li key={idx}>• {point}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-bold text-slate-900 mb-3">Overall Sentiment</h3>
                      <div className="space-y-2">
                        {summary.positive_overall?.length > 0 && (
                          <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                            <h4 className="text-sm font-bold text-green-800 mb-1">Positive</h4>
                            <ul className="text-sm text-green-700 space-y-1">
                              {summary.positive_overall.slice(0, 3).map((point: string, idx: number) => (
                                <li key={idx}>• {point}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {summary.negative_overall?.length > 0 && (
                          <div className="p-3 bg-gradient-to-r from-red-50 to-rose-50 rounded-lg border border-red-200">
                            <h4 className="text-sm font-bold text-red-800 mb-1">Negative</h4>
                            <ul className="text-sm text-red-700 space-y-1">
                              {summary.negative_overall.slice(0, 3).map((point: string, idx: number) => (
                                <li key={idx}>• {point}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Brain className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>AI summary not available for this entity</p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar with Gradients */}
          <div className="space-y-6">
            {/* Sentiment Distribution */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-card-gradient rounded-xl shadow-card border border-white/50 p-6"
            >
              <h2 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-6">
                Sentiment Distribution
              </h2>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={getSentimentDistribution()}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                  >
                    {getSentimentDistribution().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {getSentimentDistribution().map((entry, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: entry.color }}
                      ></div>
                      <span className="text-sm text-slate-600 font-medium">{entry.name}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{entry.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Recent Articles */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-card-gradient rounded-xl shadow-card border border-white/50 p-6"
            >
              <h2 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-6">
                Recent Articles
              </h2>
              {articles.length > 0 ? (
                <div className="space-y-4">
                  {articles.slice(0, 5).map((article, index) => (
                    <div key={article.id} className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                      <h3 className="font-bold text-slate-900 mb-2 line-clamp-2">
                        {article.title}
                      </h3>
                      <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
                        <span className="font-medium">{article.author}</span>
                        <span>{new Date(article.publication_date).toLocaleDateString()}</span>
                      </div>
                      {article.sentiments?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {article.sentiments.slice(0, 2).map((sentiment: any, idx: number) => {
                            const Icon = getSentimentIcon(sentiment.overall_sentiment);
                            return (
                              <span
                                key={idx}
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${getSentimentColor(sentiment.overall_sentiment)}`}
                              >
                                <Icon className="h-3 w-3 mr-1" />
                                {sentiment.overall_sentiment}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-semibold group"
                      >
                        Read Article
                        <ExternalLink className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform duration-200" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <FileText className="h-12 w-12 mx-auto mb-4" />
                  <p>No articles available</p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EntityDetail;