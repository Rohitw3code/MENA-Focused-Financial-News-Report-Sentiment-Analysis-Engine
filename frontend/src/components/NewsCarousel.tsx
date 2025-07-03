import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Calendar, User, TrendingUp, TrendingDown, Minus, Expand, Play, Pause, BarChart3 } from 'lucide-react';
import { Article } from '../types';

interface NewsCarouselProps {
  articles: Article[];
}

const NewsCarousel: React.FC<NewsCarouselProps> = ({ articles }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false); // Changed default to false
  const [expandedArticle, setExpandedArticle] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(15); // Increased to 15 seconds

  // Auto-advance carousel with longer intervals
  useEffect(() => {
    if (isAutoPlaying && articles.length > 0 && expandedArticle === null) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % articles.length);
        setTimeRemaining(15); // Reset timer
      }, 15000); // Increased to 15 seconds

      return () => clearInterval(interval);
    }
  }, [articles.length, isAutoPlaying, expandedArticle]);

  // Timer countdown
  useEffect(() => {
    if (isAutoPlaying && expandedArticle === null && timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [timeRemaining, isAutoPlaying, expandedArticle]);

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
    const baseClasses = "inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium";
    
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'negative':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const nextArticle = () => {
    setCurrentIndex((prev) => (prev + 1) % articles.length);
    setTimeRemaining(15);
  };

  const prevArticle = () => {
    setCurrentIndex((prev) => (prev - 1 + articles.length) % articles.length);
    setTimeRemaining(15);
  };

  const toggleExpand = (articleId: number) => {
    setExpandedArticle(expandedArticle === articleId ? null : articleId);
    if (expandedArticle !== articleId) {
      setIsAutoPlaying(false); // Pause auto-play when expanding
    }
  };

  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying);
    if (!isAutoPlaying) {
      setTimeRemaining(15);
    }
  };

  if (articles.length === 0) {
    return (
      <div className="p-12 text-center">
        <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No research articles available</p>
      </div>
    );
  }

  const currentArticle = articles[currentIndex];

  return (
    <div className="relative">
      {/* Main Article Display */}
      <div className="p-6">
        <div className="relative bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Article Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-900 line-clamp-2 flex-1 mr-4">
                {currentArticle.title}
              </h3>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  onClick={() => toggleExpand(currentArticle.id)}
                  className="p-2 text-gray-400 hover:text-primary-600 transition-colors rounded-lg hover:bg-gray-100"
                  title={expandedArticle === currentArticle.id ? "Collapse" : "Expand"}
                >
                  <Expand className="h-5 w-5" />
                </button>
                <a
                  href={currentArticle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-primary-600 transition-colors rounded-lg hover:bg-gray-100"
                  title="Open article"
                >
                  <ExternalLink className="h-5 w-5" />
                </a>
              </div>
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
              {currentArticle.author && (
                <div className="flex items-center space-x-1">
                  <User className="h-4 w-4" />
                  <span>{currentArticle.author}</span>
                </div>
              )}
              {currentArticle.publication_date && (
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(currentArticle.publication_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* Article Preview */}
            {currentArticle.cleaned_text && (
              <p className={`text-gray-600 leading-relaxed ${
                expandedArticle === currentArticle.id ? '' : 'line-clamp-3'
              }`}>
                {expandedArticle === currentArticle.id 
                  ? currentArticle.cleaned_text 
                  : `${currentArticle.cleaned_text.substring(0, 300)}...`
                }
              </p>
            )}
          </div>

          {/* Sentiment Analysis */}
          {currentArticle.sentiments && currentArticle.sentiments.length > 0 && (
            <div className="p-6 bg-gray-50">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-primary-600" />
                <span>Sentiment Analysis</span>
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentArticle.sentiments.slice(0, expandedArticle === currentArticle.id ? undefined : 4).map((sentiment, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-semibold text-gray-900">{sentiment.entity_name}</div>
                        <div className="text-sm text-gray-500 capitalize">({sentiment.entity_type})</div>
                      </div>
                      <div className="flex flex-col space-y-1">
                        <div className={getSentimentBadge(sentiment.financial_sentiment)}>
                          {getSentimentIcon(sentiment.financial_sentiment)}
                          <span className="capitalize">Financial: {sentiment.financial_sentiment}</span>
                        </div>
                        <div className={getSentimentBadge(sentiment.overall_sentiment)}>
                          {getSentimentIcon(sentiment.overall_sentiment)}
                          <span className="capitalize">Overall: {sentiment.overall_sentiment}</span>
                        </div>
                      </div>
                    </div>
                    
                    {sentiment.reasoning && expandedArticle === currentArticle.id && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-700 mb-1">Analysis:</div>
                        <div className="text-sm text-gray-600">{sentiment.reasoning}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {currentArticle.sentiments.length > 4 && expandedArticle !== currentArticle.id && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => toggleExpand(currentArticle.id)}
                    className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                  >
                    +{currentArticle.sentiments.length - 4} more entities
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Navigation Controls */}
      <div className="flex items-center justify-between p-6 bg-gray-50 border-t border-gray-200">
        <button
          onClick={prevArticle}
          className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </button>

        <div className="flex items-center space-x-6">
          <span className="text-sm text-gray-600">
            {currentIndex + 1} of {articles.length}
          </span>
          
          {/* Auto-play controls with timer */}
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleAutoPlay}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isAutoPlaying 
                  ? 'bg-primary-100 text-primary-700 border border-primary-200' 
                  : 'bg-gray-100 text-gray-600 border border-gray-200'
              }`}
            >
              {isAutoPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              <span>{isAutoPlaying ? 'Pause' : 'Auto'}</span>
            </button>
            
            {isAutoPlaying && expandedArticle === null && (
              <div className="flex items-center space-x-2">
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${((15 - timeRemaining) / 15) * 100}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500 w-6">{timeRemaining}s</span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={nextArticle}
          className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Progress Indicators */}
      <div className="flex justify-center space-x-2 pb-4">
        {articles.slice(0, 10).map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentIndex(index);
              setTimeRemaining(15);
            }}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentIndex ? 'bg-primary-600' : 'bg-gray-300'
            }`}
          />
        ))}
        {articles.length > 10 && (
          <span className="text-xs text-gray-500 ml-2">+{articles.length - 10}</span>
        )}
      </div>
    </div>
  );
};

export default NewsCarousel;