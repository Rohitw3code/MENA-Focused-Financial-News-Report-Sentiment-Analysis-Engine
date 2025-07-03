import React from 'react';
import { ExternalLink, Calendar, User, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Article } from '../types';

interface ArticleCardProps {
  article: Article;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article }) => {
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

  const getSentimentBadge = (sentiment: string) => {
    const baseClasses = "inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium";
    
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'negative':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1 mr-4">
          {article.title}
        </h3>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-primary-600 transition-colors flex-shrink-0"
        >
          <ExternalLink className="h-5 w-5" />
        </a>
      </div>

      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
        {article.author && (
          <div className="flex items-center space-x-1">
            <User className="h-4 w-4" />
            <span>{article.author}</span>
          </div>
        )}
        {article.publication_date && (
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span>{new Date(article.publication_date).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {article.cleaned_text && (
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {article.cleaned_text.substring(0, 200)}...
        </p>
      )}

      {article.sentiments && article.sentiments.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Sentiment Analysis</h4>
          <div className="space-y-2">
            {article.sentiments.slice(0, 3).map((sentiment, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">
                    {sentiment.entity_name}
                  </span>
                  <span className="text-xs text-gray-500 capitalize">
                    ({sentiment.entity_type})
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={getSentimentBadge(sentiment.financial_sentiment)}>
                    {getSentimentIcon(sentiment.financial_sentiment)}
                    <span className="capitalize">{sentiment.financial_sentiment}</span>
                  </div>
                </div>
              </div>
            ))}
            {article.sentiments.length > 3 && (
              <p className="text-xs text-gray-500 mt-2">
                +{article.sentiments.length - 3} more entities
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticleCard;