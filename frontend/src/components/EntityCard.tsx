import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, Bitcoin, TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
import { useApi } from '../contexts/ApiContext';

interface EntityCardProps {
  entity: {
    entity_name: string;
    entity_type: string;
  };
}

const EntityCard: React.FC<EntityCardProps> = ({ entity }) => {
  const [sentimentData, setSentimentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { fetchData } = useApi();

  useEffect(() => {
    loadSentimentData();
  }, [entity]);

  const loadSentimentData = async () => {
    try {
      // Use the correct entity_type parameter
      const data = await fetchData('/articles', { 
        entity_name: entity.entity_name,
        entity_type: entity.entity_type,
        limit: 5
      });
      
      // Calculate sentiment distribution
      const sentiments = data.reduce((acc: any, article: any) => {
        article.sentiments?.forEach((sentiment: any) => {
          if (sentiment.entity_name.toLowerCase().includes(entity.entity_name.toLowerCase()) &&
              sentiment.entity_type === entity.entity_type) {
            acc[sentiment.overall_sentiment] = (acc[sentiment.overall_sentiment] || 0) + 1;
          }
        });
        return acc;
      }, {});
      
      setSentimentData({
        positive: sentiments.positive || 0,
        negative: sentiments.negative || 0,
        neutral: sentiments.neutral || 0,
        total: (sentiments.positive || 0) + (sentiments.negative || 0) + (sentiments.neutral || 0)
      });
    } catch (error) {
      console.error('Error loading sentiment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEntityIcon = () => {
    return entity.entity_type === 'company' ? Building2 : Bitcoin;
  };

  const getEntityColor = () => {
    return entity.entity_type === 'company' ? 'blue' : 'amber';
  };

  const getDominantSentiment = () => {
    if (!sentimentData || sentimentData.total === 0) return 'neutral';
    
    const { positive, negative, neutral } = sentimentData;
    if (positive > negative && positive > neutral) return 'positive';
    if (negative > positive && negative > neutral) return 'negative';
    return 'neutral';
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return TrendingUp;
      case 'negative': return TrendingDown;
      case 'neutral': return Minus;
      default: return Minus;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200';
      case 'negative': return 'text-red-600 bg-gradient-to-r from-red-50 to-rose-50 border-red-200';
      case 'neutral': return 'text-slate-600 bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200';
      default: return 'text-slate-600 bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200';
    }
  };

  const EntityIcon = getEntityIcon();
  const entityColor = getEntityColor();
  const dominantSentiment = getDominantSentiment();
  const SentimentIcon = getSentimentIcon(dominantSentiment);

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="bg-card-gradient rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 border border-white/50 overflow-hidden group"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-3 bg-gradient-to-br from-${entityColor}-100 to-${entityColor}-200 rounded-xl shadow-sm group-hover:shadow-md transition-all duration-300`}>
              <EntityIcon className={`h-6 w-6 text-${entityColor}-600`} />
            </div>
            <div>
              <h3 className="text-lg font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                {entity.entity_name}
              </h3>
              <p className="text-sm text-slate-500 capitalize font-medium">{entity.entity_type}</p>
            </div>
          </div>
          <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold border ${getSentimentColor(dominantSentiment)}`}>
            <SentimentIcon className="h-3 w-3" />
            <span className="capitalize">{dominantSentiment}</span>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-4 bg-slate-200 rounded w-3/4 animate-pulse"></div>
          </div>
        ) : sentimentData && sentimentData.total > 0 ? (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 font-medium">Sentiment Analysis</span>
              <span className="text-slate-900 font-bold">{sentimentData.total} articles</span>
            </div>
            
            <div className="flex space-x-2">
              <div className="flex-1 bg-slate-200 rounded-full h-3 overflow-hidden">
                <div className="flex h-full">
                  <div
                    className="bg-success-gradient h-full"
                    style={{ width: `${(sentimentData.positive / sentimentData.total) * 100}%` }}
                  ></div>
                  <div
                    className="bg-error-gradient h-full"
                    style={{ width: `${(sentimentData.negative / sentimentData.total) * 100}%` }}
                  ></div>
                  <div
                    className="bg-gradient-to-r from-slate-400 to-slate-500 h-full"
                    style={{ width: `${(sentimentData.neutral / sentimentData.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-green-600">{sentimentData.positive}+</span>
              <span className="text-red-600">{sentimentData.negative}−</span>
              <span className="text-slate-600">{sentimentData.neutral}○</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-slate-500">
            <p className="text-sm">No sentiment data available</p>
          </div>
        )}
      </div>

      <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-blue-50 border-t border-slate-100">
        <Link
          to={`/entity/${encodeURIComponent(entity.entity_name)}`}
          className="flex items-center justify-center space-x-2 text-blue-600 hover:text-blue-700 font-semibold transition-colors group"
        >
          <span>View Details</span>
          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
        </Link>
      </div>
    </motion.div>
  );
};

export default EntityCard;