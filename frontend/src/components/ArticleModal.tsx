import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Calendar, User, TrendingUp, TrendingDown, Minus, Building2, Bitcoin, Clock, Brain } from 'lucide-react';

interface ArticleModalProps {
  article: any;
  isOpen: boolean;
  onClose: () => void;
}

const ArticleModal: React.FC<ArticleModalProps> = ({ article, isOpen, onClose }) => {
  if (!article) return null;

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
      month: 'long',
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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="bg-news-gradient px-6 py-4 text-white relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 via-indigo-600/90 to-purple-600/90"></div>
                <div className="relative z-10 flex items-start justify-between">
                  <div className="flex-1 pr-4">
                    <h2 className="text-xl font-bold mb-2 leading-tight">{article.title}</h2>
                    <div className="flex items-center space-x-4 text-blue-100">
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span className="font-medium">{article.author}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(article.publication_date)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{getReadingTime(article.cleaned_text)} min read</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="max-h-[70vh] overflow-y-auto">
                <div className="p-6">
                  {/* Article Content */}
                  <div className="prose prose-slate max-w-none mb-8">
                    <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {article.cleaned_text}
                    </div>
                  </div>

                  {/* Sentiment Analysis Section */}
                  {article.sentiments && article.sentiments.length > 0 && (
                    <div className="border-t border-slate-200 pt-6">
                      <div className="flex items-center mb-6">
                        <div className="p-2 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg mr-3">
                          <Brain className="h-6 w-6 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">
                          AI Sentiment Analysis ({article.sentiments.length} entities)
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {article.sentiments.map((sentiment: any, idx: number) => {
                          const SentimentIcon = getSentimentIcon(sentiment.overall_sentiment);
                          const EntityIcon = getEntityIcon(sentiment.entity_type);
                          
                          return (
                            <motion.div
                              key={idx}
                              initial={{ y: 20, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: idx * 0.1 }}
                              className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-4 border border-slate-200"
                            >
                              <div className="flex items-center space-x-3 mb-3">
                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                  <EntityIcon className="h-5 w-5 text-slate-600" />
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900">{sentiment.entity_name}</div>
                                  <div className="text-sm text-slate-500 capitalize">{sentiment.entity_type}</div>
                                </div>
                              </div>

                              <div className="flex space-x-2 mb-3">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getSentimentColor(sentiment.financial_sentiment)}`}>
                                  <SentimentIcon className="h-3 w-3 mr-1" />
                                  Financial: {sentiment.financial_sentiment}
                                </span>
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getSentimentColor(sentiment.overall_sentiment)}`}>
                                  <SentimentIcon className="h-3 w-3 mr-1" />
                                  Overall: {sentiment.overall_sentiment}
                                </span>
                              </div>

                              {sentiment.reasoning && (
                                <div className="bg-white/70 rounded-lg p-3 border border-slate-200">
                                  <div className="text-xs font-semibold text-slate-600 mb-1">AI Reasoning:</div>
                                  <div className="text-sm text-slate-700 leading-relaxed">
                                    {sentiment.reasoning}
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    Article ID: {article.id} • Published by {article.author}
                  </div>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    <span>View Original</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ArticleModal;