import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, Bitcoin, TrendingUp, TrendingDown, Minus, ArrowRight, ExternalLink, Calendar, FileText, Brain, Loader } from 'lucide-react';
import { useApi } from '../contexts/ApiContext';

interface CompanyCardProps {
  entityName: string;
  entityType: string;
}

const CompanyCard: React.FC<CompanyCardProps> = ({ entityName, entityType }) => {
  const [entityData, setEntityData] = useState<any>(null);
  const [sentimentTrend, setSentimentTrend] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const { fetchData } = useApi();

  useEffect(() => {
    loadEntityData();
  }, [entityName, entityType]);

  const loadEntityData = async () => {
    try {
      setLoading(true);
      
      // Load basic entity data
      const [articlesData, trendData] = await Promise.all([
        fetchData('/entity_articles_by_sentiment', {
          entity_name: entityName,
          entity_type: entityType
        }),
        fetchData('/sentiment_over_time', { entity_name: entityName }).catch(() => ({ financial_sentiment_trend: [] }))
      ]);

      setEntityData(articlesData);
      setSentimentTrend(trendData.financial_sentiment_trend || []);
      setLoading(false);

      // Load AI summary separately
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
    } finally {
      setSummaryLoading(false);
    }
  };

  const getEntityIcon = () => {
    return entityType === 'company' ? Building2 : Bitcoin;
  };

  const getEntityColor = () => {
    return entityType === 'company' ? 'blue' : 'amber';
  };

  const getSentimentStats = () => {
    if (!entityData) return { positive: 0, negative: 0, neutral: 0, total: 0 };
    
    const allArticles = [
      ...entityData.positive_overall || [],
      ...entityData.negative_overall || [],
      ...entityData.neutral_overall || []
    ];
    
    return {
      positive: entityData.positive_overall?.length || 0,
      negative: entityData.negative_overall?.length || 0,
      neutral: entityData.neutral_overall?.length || 0,
      total: allArticles.length
    };
  };

  const getRecentTrend = () => {
    if (sentimentTrend.length < 2) return 'neutral';
    const recent = sentimentTrend.slice(-3);
    const average = recent.reduce((sum, [, score]) => sum + score, 0) / recent.length;
    if (average > 0.2) return 'positive';
    if (average < -0.2) return 'negative';
    return 'neutral';
  };

  const EntityIcon = getEntityIcon();
  const entityColor = getEntityColor();
  const stats = getSentimentStats();
  const trend = getRecentTrend();

  if (loading) {
    return (
      <div className="bg-card-gradient rounded-xl shadow-card border border-white/50 p-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-slate-200 rounded w-full mb-4"></div>
        <div className="flex space-x-2">
          <div className="h-8 bg-slate-200 rounded w-16"></div>
          <div className="h-8 bg-slate-200 rounded w-16"></div>
        </div>
      </div>
    );
  }

  if (entityData?.error) {
    return (
      <div className="bg-card-gradient rounded-xl shadow-card border border-white/50 p-6">
        <div className="text-center py-8">
          <div className="text-slate-400 mb-4">
            <FileText className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">No data found</h3>
          <p className="text-slate-600">{entityData.error}</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="bg-card-gradient rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 border border-white/50 overflow-hidden"
    >
      {/* Header */}
      <div className={`bg-gradient-to-r from-${entityColor}-500 to-${entityColor}-600 px-6 py-4 text-white`}>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <EntityIcon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{entityName}</h2>
            <p className="text-sm opacity-90 capitalize">{entityType}</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.positive}</div>
            <div className="text-xs text-slate-600 font-medium">Positive</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.negative}</div>
            <div className="text-xs text-slate-600 font-medium">Negative</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-600">{stats.neutral}</div>
            <div className="text-xs text-slate-600 font-medium">Neutral</div>
          </div>
        </div>

        {/* Sentiment Distribution Bar */}
        {stats.total > 0 && (
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600 font-medium">Sentiment Distribution</span>
              <span className="text-slate-900 font-bold">{stats.total} articles</span>
            </div>
            <div className="flex h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="bg-success-gradient"
                style={{ width: `${(stats.positive / stats.total) * 100}%` }}
              ></div>
              <div
                className="bg-error-gradient"
                style={{ width: `${(stats.negative / stats.total) * 100}%` }}
              ></div>
              <div
                className="bg-gradient-to-r from-slate-400 to-slate-500"
                style={{ width: `${(stats.neutral / stats.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Recent Trend */}
        <div className="mb-6">
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg border border-slate-200">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-slate-600" />
              <span className="text-slate-700 font-medium">Recent Trend</span>
            </div>
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold ${
              trend === 'positive' ? 'text-green-600 bg-green-100' :
              trend === 'negative' ? 'text-red-600 bg-red-100' :
              'text-slate-600 bg-slate-100'
            }`}>
              {trend === 'positive' ? <TrendingUp className="h-3 w-3" /> :
               trend === 'negative' ? <TrendingDown className="h-3 w-3" /> :
               <Minus className="h-3 w-3" />}
              <span className="capitalize">{trend}</span>
            </div>
          </div>
        </div>

        {/* AI Summary */}
        <div className="mb-6">
          <div className="flex items-center mb-3">
            <div className="p-1.5 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg mr-2">
              <Brain className="h-4 w-4 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">AI Summary</h3>
            {summaryLoading && (
              <Loader className="h-4 w-4 text-blue-600 ml-2 animate-spin" />
            )}
          </div>
          
          {summaryLoading ? (
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 rounded animate-pulse"></div>
              <div className="h-4 bg-slate-200 rounded w-3/4 animate-pulse"></div>
            </div>
          ) : summary ? (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
              <p className="text-slate-700 text-sm leading-relaxed">{summary.final_summary}</p>
            </div>
          ) : (
            <div className="text-center py-4 text-slate-500">
              <p className="text-sm">AI summary not available</p>
            </div>
          )}
        </div>

        {/* Recent Articles Preview */}
        {entityData && (
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-700">Recent Articles</h4>
            {[
              ...(entityData.positive_overall?.slice(0, 2) || []),
              ...(entityData.negative_overall?.slice(0, 1) || [])
            ].slice(0, 3).map((article: any, index: number) => (
              <div key={index} className="p-3 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg border border-slate-200">
                <h5 className="font-semibold text-slate-900 text-sm mb-1 line-clamp-2">{article.title}</h5>
                <p className="text-xs text-slate-600 mb-2 line-clamp-2">{article.reasoning}</p>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 hover:text-blue-700 text-xs font-medium group"
                >
                  Read Article
                  <ExternalLink className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform duration-200" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-blue-50 border-t border-slate-100">
        <a
          href={`/entity/${encodeURIComponent(entityName)}`}
          className="flex items-center justify-center space-x-2 text-blue-600 hover:text-blue-700 font-semibold transition-colors group"
        >
          <span>View Full Analysis</span>
          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
        </a>
      </div>
    </motion.div>
  );
};

export default CompanyCard;