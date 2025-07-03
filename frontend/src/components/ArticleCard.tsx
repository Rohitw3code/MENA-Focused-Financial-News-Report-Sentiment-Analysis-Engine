import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Calendar, User, TrendingUp, TrendingDown, Minus, Building2, Bitcoin, Eye, Clock } from 'lucide-react';

interface ArticleCardProps {
  article: {
    id: number;
    title: string;
    url: string;
    author: string;
    publication_date: string;
    cleaned_text: string;
    sentiments: Array<{
      entity_name: string;
      entity_type: string;
      financial_sentiment: string;
      overall_sentiment: string;
      reasoning: string;
    }>;
  };
  index: number;
  onReadMore: (article: any) => void;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article, index, onReadMore }) => {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getReadingTime = (text: string) => {
    const wordsPerMinute = 200;
    const wordCount = text.split(' ').length;
    const readingTime = Math.ceil(wordCount / wordsPerMinute);
    return readingTime;
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="bg-card-gradient rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 border border-white/50 overflow-hidden group"
    >
      {/* Article Header */}
      <div className="p-4 sm:p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors leading-tight">
              {article.title}
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0 text-xs sm:text-sm text-slate-500">
              <div className="flex items-center space-x-1">
                <User className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="font-medium truncate">{article.author}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">{formatDate(article.publication_date)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span>{getReadingTime(article.cleaned_text)} min read</span>
              </div>
            </div>
          </div>
        </div>

        {/* Article Preview */}
        <p className="text-slate-600 text-sm mb-4 line-clamp-3 leading-relaxed">
          {article.cleaned_text?.substring(0, 200)}...
        </p>

        {/* Sentiment Analysis */}
        {article.sentiments && article.sentiments.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-700 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-blue-600" />
              Sentiment Analysis ({article.sentiments.length} entities)
            </h4>
            <div className="space-y-2">
              {article.sentiments.slice(0, 2).map((sentiment, idx) => {
                const SentimentIcon = getSentimentIcon(sentiment.overall_sentiment);
                const EntityIcon = getEntityIcon(sentiment.entity_type);
                
                return (
                  <div key={idx} className="flex items-center justify-between p-2 sm:p-3 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg border border-slate-200">
                    <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                      <div className="p-1.5 sm:p-2 bg-white rounded-lg shadow-sm flex-shrink-0">
                        <EntityIcon className="h-3 w-3 sm:h-4 sm:w-4 text-slate-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900 text-xs sm:text-sm truncate">{sentiment.entity_name}</div>
                        <div className="text-xs text-slate-500 capitalize">{sentiment.entity_type}</div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2 flex-shrink-0">
                      <span className={`inline-flex items-center px-1.5 sm:px-2 py-1 rounded-full text-xs font-semibold border ${getSentimentColor(sentiment.financial_sentiment)}`}>
                        <SentimentIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                        <span className="hidden sm:inline">F:</span> {sentiment.financial_sentiment.charAt(0).toUpperCase()}
                      </span>
                      <span className={`inline-flex items-center px-1.5 sm:px-2 py-1 rounded-full text-xs font-semibold border ${getSentimentColor(sentiment.overall_sentiment)}`}>
                        <SentimentIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                        <span className="hidden sm:inline">O:</span> {sentiment.overall_sentiment.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })}
              {article.sentiments.length > 2 && (
                <div className="text-center py-2">
                  <span className="text-xs text-slate-500 font-medium">
                    +{article.sentiments.length - 2} more entities
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Article Actions */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-slate-50 to-blue-50 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between space-y-2 sm:space-y-0">
        <button
          onClick={() => onReadMore(article)}
          className="flex items-center justify-center space-x-2 text-blue-600 hover:text-blue-700 font-semibold transition-colors group px-3 py-2 rounded-lg hover:bg-blue-50"
        >
          <Eye className="h-4 w-4" />
          <span>Read Full Article</span>
        </button>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center space-x-2 text-slate-600 hover:text-slate-800 font-medium transition-colors group px-3 py-2 rounded-lg hover:bg-slate-100"
        >
          <span>Source</span>
          <ExternalLink className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
        </a>
      </div>
    </motion.div>
  );
};

export default ArticleCard;