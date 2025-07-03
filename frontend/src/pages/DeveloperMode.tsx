import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  Key, 
  Play, 
  Pause, 
  Clock, 
  Database, 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  Calendar,
  BarChart3,
  Zap,
  Shield,
  Server,
  Brain,
  TrendingUp,
  FileText,
  Users,
  ExternalLink,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Download,
  Trash2,
  Archive
} from 'lucide-react';
import { useApi } from '../contexts/ApiContext';

interface PipelineStatus {
  is_running: boolean;
  status: string;
  progress: number;
  total: number;
  current_task: string;
}

interface LastRun {
  run_timestamp: string;
  new_links_found: number;
  articles_scraped: number;
  entities_analyzed: number;
  status: string;
}

interface UsageStats {
  provider: string;
  total_calls: number;
  total_tokens: number;
  total_cost: number;
}

interface Article {
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
}

const DeveloperMode: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  
  // API Keys State
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    groq: '',
    pipeline_password: ''
  });
  const [showKeys, setShowKeys] = useState({
    openai: false,
    groq: false,
    pipeline_password: false
  });
  
  // Pipeline State
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  const [lastRun, setLastRun] = useState<LastRun | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats[]>([]);
  
  // Configuration State
  const [scheduleTime, setScheduleTime] = useState('01:00');
  const [provider, setProvider] = useState('openai');
  const [modelName, setModelName] = useState('gpt-4o-mini');
  
  // Articles State
  const [articles, setArticles] = useState<Article[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [articleSearch, setArticleSearch] = useState('');
  const [articleFilters, setArticleFilters] = useState({
    sentiment: '',
    entity_type: '',
    author: ''
  });
  const [expandedArticle, setExpandedArticle] = useState<number | null>(null);
  const [articlesPage, setArticlesPage] = useState(1);
  const [totalArticles, setTotalArticles] = useState(0);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const { fetchData, apiBaseUrl } = useApi();

  useEffect(() => {
    if (isAuthenticated) {
      loadDeveloperData();
      if (autoRefresh) {
        const interval = setInterval(() => {
          loadPipelineStatus();
          // Auto-refresh costs after pipeline completion
          if (pipelineStatus?.status === 'Completed' && !pipelineStatus.is_running) {
            loadUsageStats();
          }
        }, 2000);
        return () => clearInterval(interval);
      }
    }
  }, [isAuthenticated, autoRefresh, pipelineStatus?.status]);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'articles') {
      loadArticles();
    }
  }, [isAuthenticated, activeTab, articlesPage, articleSearch, articleFilters]);

  const authenticate = () => {
    if (password === 'dev123') { // Simple auth for demo
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Invalid password');
    }
  };

  const loadDeveloperData = async () => {
    try {
      const [statusData, lastRunData, usageData] = await Promise.all([
        fetchData('/pipeline_status'),
        fetchData('/pipeline_last_run').catch(() => null),
        fetchData('/usage_stats', { summarize: true }).catch(() => [])
      ]);
      
      setPipelineStatus(statusData);
      setLastRun(lastRunData);
      setUsageStats(usageData);
    } catch (error) {
      console.error('Error loading developer data:', error);
    }
  };

  const loadPipelineStatus = async () => {
    try {
      const statusData = await fetchData('/pipeline_status');
      setPipelineStatus(statusData);
    } catch (error) {
      console.error('Error loading pipeline status:', error);
    }
  };

  const loadUsageStats = async () => {
    try {
      const usageData = await fetchData('/usage_stats', { summarize: true });
      setUsageStats(usageData);
    } catch (error) {
      console.error('Error loading usage stats:', error);
    }
  };

  const loadArticles = async () => {
    setArticlesLoading(true);
    try {
      const params: any = { 
        limit: 20,
        offset: (articlesPage - 1) * 20
      };
      
      if (articleSearch) params.search = articleSearch;
      if (articleFilters.sentiment) params.overall_sentiment = articleFilters.sentiment;
      if (articleFilters.entity_type) params.entity_type = articleFilters.entity_type;
      if (articleFilters.author) params.author = articleFilters.author;
      
      const data = await fetchData('/articles', params);
      setArticles(data);
      setTotalArticles(data.length); // In a real app, this would come from the API
    } catch (error) {
      console.error('Error loading articles:', error);
      setMessage({ type: 'error', text: 'Failed to load articles' });
    } finally {
      setArticlesLoading(false);
    }
  };

  const triggerPipeline = async () => {
    if (!apiKeys.pipeline_password) {
      setMessage({ type: 'error', text: 'Pipeline password is required' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/trigger_pipeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: apiKeys.pipeline_password,
          provider,
          model_name: modelName,
          openai_api_key: apiKeys.openai,
          groq_api_key: apiKeys.groq
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Pipeline started successfully! Costs will auto-refresh upon completion.' });
        // Start monitoring for completion
        setAutoRefresh(true);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to start pipeline' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const updateSchedule = async () => {
    if (!apiKeys.pipeline_password) {
      setMessage({ type: 'error', text: 'Pipeline password is required' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/configure_schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: apiKeys.pipeline_password,
          schedule_time: scheduleTime
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: `Schedule updated to ${scheduleTime} UTC` });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update schedule' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await Promise.all([
      loadDeveloperData(),
      activeTab === 'articles' ? loadArticles() : Promise.resolve()
    ]);
    setLoading(false);
    setMessage({ type: 'success', text: 'Data refreshed successfully!' });
  };

  const exportArticles = () => {
    const csvContent = [
      ['ID', 'Title', 'Author', 'Date', 'URL', 'Entities', 'Sentiments'].join(','),
      ...articles.map(article => [
        article.id,
        `"${article.title.replace(/"/g, '""')}"`,
        `"${article.author}"`,
        article.publication_date,
        article.url,
        `"${article.sentiments.map(s => s.entity_name).join('; ')}"`,
        `"${article.sentiments.map(s => `${s.entity_name}: ${s.overall_sentiment}`).join('; ')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `articles_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'text-green-600 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200';
      case 'running': return 'text-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200';
      case 'idle': return 'text-slate-600 bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200';
      default: return 'text-red-600 bg-gradient-to-r from-red-50 to-rose-50 border-red-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return CheckCircle;
      case 'running': return Activity;
      case 'idle': return Pause;
      default: return XCircle;
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-card-gradient rounded-2xl shadow-card-hover border border-white/50 p-8 w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="p-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl inline-block mb-4">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-2">
              Developer Mode
            </h1>
            <p className="text-slate-600">Enter password to access admin panel</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && authenticate()}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter developer password"
              />
            </div>
            
            {authError && (
              <div className="text-red-600 text-sm bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-lg p-3">
                {authError}
              </div>
            )}
            
            <button
              onClick={authenticate}
              className="w-full bg-primary-gradient text-white font-semibold py-3 rounded-xl hover:shadow-glow transition-all duration-300"
            >
              Access Developer Mode
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-400/10 to-indigo-400/10 rounded-full mix-blend-multiply filter blur-xl animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full mix-blend-multiply filter blur-xl animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-2">
                Developer Control Panel
              </h1>
              <p className="text-lg text-slate-600">Manage API keys, pipeline operations, and system configuration</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={refreshData}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 rounded-xl transition-all duration-200 shadow-sm"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoRefresh"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="autoRefresh" className="text-sm text-slate-600">Auto-refresh</label>
              </div>
              <div className="p-3 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl">
                <Settings className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Message Display */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-6 p-4 rounded-xl border ${
                message.type === 'success' ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-800' :
                message.type === 'error' ? 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200 text-red-800' :
                'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {message.type === 'success' ? <CheckCircle className="h-5 w-5 mr-2" /> :
                   message.type === 'error' ? <XCircle className="h-5 w-5 mr-2" /> :
                   <AlertCircle className="h-5 w-5 mr-2" />}
                  {message.text}
                </div>
                <button
                  onClick={() => setMessage(null)}
                  className="text-current opacity-70 hover:opacity-100"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-gradient-to-r from-slate-100 to-slate-200 p-1 rounded-xl overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'pipeline', label: 'Pipeline Control', icon: Play },
              { id: 'articles', label: 'Articles & Data', icon: FileText },
              { id: 'config', label: 'Configuration', icon: Settings },
              { id: 'keys', label: 'API Keys', icon: Key }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-primary-gradient text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* System Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    label: 'Pipeline Status',
                    value: pipelineStatus?.status || 'Unknown',
                    icon: getStatusIcon(pipelineStatus?.status || ''),
                    color: getStatusColor(pipelineStatus?.status || ''),
                    subtitle: pipelineStatus?.is_running ? 'Running...' : 'Ready'
                  },
                  {
                    label: 'Last Run Articles',
                    value: lastRun?.articles_scraped || 0,
                    icon: FileText,
                    color: 'text-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200',
                    subtitle: lastRun ? new Date(lastRun.run_timestamp).toLocaleDateString() : 'No runs yet'
                  },
                  {
                    label: 'Entities Analyzed',
                    value: lastRun?.entities_analyzed || 0,
                    icon: Users,
                    color: 'text-purple-600 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200',
                    subtitle: `${lastRun?.new_links_found || 0} new links found`
                  },
                  {
                    label: 'Total API Cost',
                    value: `$${usageStats.reduce((acc, stat) => acc + (stat.total_cost || 0), 0).toFixed(4)}`,
                    icon: TrendingUp,
                    color: 'text-green-600 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200',
                    subtitle: `${usageStats.reduce((acc, stat) => acc + (stat.total_tokens || 0), 0).toLocaleString()} tokens used`
                  }
                ].map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div
                      key={index}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-6 rounded-xl border ${stat.color}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium opacity-80">{stat.label}</p>
                          <p className="text-2xl font-bold">{stat.value}</p>
                        </div>
                        <Icon className="h-8 w-8" />
                      </div>
                      <p className="text-xs opacity-70">{stat.subtitle}</p>
                    </motion.div>
                  );
                })}
              </div>

              {/* Pipeline Progress */}
              {pipelineStatus?.is_running && (
                <div className="bg-card-gradient rounded-xl shadow-card border border-white/50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900">Live Pipeline Progress</h3>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-green-600">Running</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600">Current Task</span>
                      <span className="text-sm font-bold text-slate-900">{pipelineStatus.current_task}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-primary-gradient h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${Math.max((pipelineStatus.progress / pipelineStatus.total) * 100 || 0, 5)}%` }}
                      >
                        <span className="text-xs text-white font-bold">
                          {Math.round((pipelineStatus.progress / pipelineStatus.total) * 100 || 0)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>{pipelineStatus.progress} / {pipelineStatus.total} completed</span>
                      <span>ETA: ~{Math.max(Math.round((pipelineStatus.total - pipelineStatus.progress) * 0.5), 1)} min</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Usage Statistics */}
              <div className="bg-card-gradient rounded-xl shadow-card border border-white/50 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900">API Usage & Cost Analytics</h3>
                  <button
                    onClick={loadUsageStats}
                    className="flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-600 rounded-lg text-sm hover:from-blue-200 hover:to-indigo-200 transition-all duration-200"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Refresh</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {usageStats.length > 0 ? usageStats.map((stat, index) => (
                    <div key={index} className="p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-slate-900 capitalize flex items-center">
                          <Brain className="h-4 w-4 mr-2 text-blue-600" />
                          {stat.provider}
                        </h4>
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-medium">
                          Active
                        </span>
                      </div>
                      <div className="space-y-2 text-sm text-slate-600">
                        <div className="flex justify-between">
                          <span>API Calls:</span>
                          <span className="font-medium text-slate-900">{stat.total_calls?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tokens Used:</span>
                          <span className="font-medium text-slate-900">{stat.total_tokens?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Cost:</span>
                          <span className="font-bold text-green-600">${stat.total_cost?.toFixed(4)}</span>
                        </div>
                        <div className="pt-2 border-t border-slate-200">
                          <div className="flex justify-between text-xs">
                            <span>Avg Cost/Call:</span>
                            <span className="font-medium">${((stat.total_cost || 0) / (stat.total_calls || 1)).toFixed(6)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-3 text-center py-8 text-slate-500">
                      <Brain className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                      <p>No usage data available yet</p>
                      <p className="text-sm">Run the pipeline to see cost analytics</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'pipeline' && (
            <motion.div
              key="pipeline"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Enhanced Pipeline Control */}
              <div className="bg-card-gradient rounded-xl shadow-card border border-white/50 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Pipeline Control & Configuration</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">AI Provider</label>
                    <select
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="openai">OpenAI (GPT Models)</option>
                      <option value="groq">Groq (Fast Inference)</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                      {provider === 'openai' ? 'Higher quality, slower processing' : 'Faster processing, good quality'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Model Name</label>
                    <input
                      type="text"
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., gpt-4o-mini, llama-3.1-70b"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Recommended: gpt-4o-mini (OpenAI) or llama-3.1-70b-versatile (Groq)
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 mb-6">
                  <div className="flex items-center space-x-3">
                    <Zap className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">Ready to Process</p>
                      <p className="text-sm text-blue-700">Pipeline will scrape news and analyze sentiment</p>
                    </div>
                  </div>
                  <button
                    onClick={triggerPipeline}
                    disabled={loading || pipelineStatus?.is_running}
                    className="flex items-center space-x-2 px-6 py-3 bg-primary-gradient text-white font-semibold rounded-xl hover:shadow-glow transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <RefreshCw className="h-5 w-5 animate-spin" />
                    ) : pipelineStatus?.is_running ? (
                      <Activity className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                    <span>
                      {pipelineStatus?.is_running ? 'Pipeline Running...' : 
                       loading ? 'Starting...' : 'Start Full Pipeline'}
                    </span>
                  </button>
                </div>

                {/* Pipeline Steps Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { step: '1', title: 'News Scraping', desc: 'Collect latest financial news from multiple sources', icon: Database },
                    { step: '2', title: 'AI Analysis', desc: 'Analyze sentiment for companies and cryptocurrencies', icon: Brain },
                    { step: '3', title: 'Data Storage', desc: 'Store results and update cost analytics', icon: Archive }
                  ].map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <div key={index} className="p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg border border-slate-200">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                            {item.step}
                          </div>
                          <Icon className="h-4 w-4 text-blue-600" />
                        </div>
                        <h4 className="font-semibold text-slate-900 mb-1">{item.title}</h4>
                        <p className="text-xs text-slate-600">{item.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Enhanced Last Run Details */}
              {lastRun && (
                <div className="bg-card-gradient rounded-xl shadow-card border border-white/50 p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Last Pipeline Execution</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{lastRun.new_links_found}</div>
                      <div className="text-sm text-slate-600">New Links Found</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{lastRun.articles_scraped}</div>
                      <div className="text-sm text-slate-600">Articles Scraped</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{lastRun.entities_analyzed}</div>
                      <div className="text-sm text-slate-600">Entities Analyzed</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg">
                      <div className={`text-2xl font-bold ${lastRun.status === 'Completed' ? 'text-green-600' : 'text-red-600'}`}>
                        {lastRun.status === 'Completed' ? '✓' : '✗'}
                      </div>
                      <div className="text-sm text-slate-600">Status</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg">
                      <div className="text-sm font-bold text-slate-900">{new Date(lastRun.run_timestamp).toLocaleDateString()}</div>
                      <div className="text-xs text-slate-600">{new Date(lastRun.run_timestamp).toLocaleTimeString()}</div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'articles' && (
            <motion.div
              key="articles"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Articles Header with Search and Filters */}
              <div className="bg-card-gradient rounded-xl shadow-card border border-white/50 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900">Scraped Articles & Metadata</h3>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={exportArticles}
                      className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-600 rounded-lg hover:from-green-200 hover:to-emerald-200 transition-all duration-200"
                    >
                      <Download className="h-4 w-4" />
                      <span>Export CSV</span>
                    </button>
                    <button
                      onClick={loadArticles}
                      disabled={articlesLoading}
                      className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-600 rounded-lg hover:from-blue-200 hover:to-indigo-200 transition-all duration-200"
                    >
                      <RefreshCw className={`h-4 w-4 ${articlesLoading ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>

                {/* Search and Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={articleSearch}
                        onChange={(e) => setArticleSearch(e.target.value)}
                        placeholder="Search articles by title, author, or content..."
                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <select
                      value={articleFilters.sentiment}
                      onChange={(e) => setArticleFilters(prev => ({ ...prev, sentiment: e.target.value }))}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Sentiments</option>
                      <option value="positive">Positive</option>
                      <option value="negative">Negative</option>
                      <option value="neutral">Neutral</option>
                    </select>
                  </div>
                  <div>
                    <select
                      value={articleFilters.entity_type}
                      onChange={(e) => setArticleFilters(prev => ({ ...prev, entity_type: e.target.value }))}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Types</option>
                      <option value="company">Companies</option>
                      <option value="cryptocurrency">Cryptocurrencies</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Articles List */}
              <div className="space-y-4">
                {articlesLoading ? (
                  <div className="grid grid-cols-1 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-card-gradient rounded-xl p-6 animate-pulse border border-white/50">
                        <div className="h-6 bg-slate-200 rounded w-3/4 mb-4"></div>
                        <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
                        <div className="h-4 bg-slate-200 rounded w-full mb-4"></div>
                        <div className="flex space-x-2">
                          <div className="h-6 bg-slate-200 rounded w-16"></div>
                          <div className="h-6 bg-slate-200 rounded w-16"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : articles.length === 0 ? (
                  <div className="bg-card-gradient rounded-xl shadow-card border border-white/50 p-12 text-center">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No Articles Found</h3>
                    <p className="text-slate-600 mb-4">No articles match your current filters or search criteria.</p>
                    <button
                      onClick={() => {
                        setArticleSearch('');
                        setArticleFilters({ sentiment: '', entity_type: '', author: '' });
                      }}
                      className="px-4 py-2 bg-primary-gradient text-white rounded-lg hover:shadow-glow transition-all duration-300"
                    >
                      Clear Filters
                    </button>
                  </div>
                ) : (
                  articles.map((article, index) => (
                    <motion.div
                      key={article.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-card-gradient rounded-xl shadow-card border border-white/50 p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2">
                            {article.title}
                          </h4>
                          <div className="flex items-center space-x-4 text-sm text-slate-600 mb-3">
                            <span className="font-medium">{article.author}</span>
                            <span>•</span>
                            <span>{new Date(article.publication_date).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>ID: {article.id}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-600 rounded-lg hover:from-blue-200 hover:to-indigo-200 transition-all duration-200"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          <button
                            onClick={() => setExpandedArticle(expandedArticle === article.id ? null : article.id)}
                            className="p-2 bg-gradient-to-r from-slate-100 to-slate-200 text-slate-600 rounded-lg hover:from-slate-200 hover:to-slate-300 transition-all duration-200"
                          >
                            {expandedArticle === article.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Sentiment Tags */}
                      {article.sentiments && article.sentiments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {article.sentiments.slice(0, 5).map((sentiment, idx) => (
                            <span
                              key={idx}
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getSentimentColor(sentiment.overall_sentiment)}`}
                            >
                              {sentiment.entity_name} • {sentiment.overall_sentiment}
                            </span>
                          ))}
                          {article.sentiments.length > 5 && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-slate-100 to-slate-200 text-slate-600 border border-slate-300">
                              +{article.sentiments.length - 5} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Article Preview */}
                      <p className="text-slate-600 text-sm line-clamp-3 mb-4">
                        {article.cleaned_text?.substring(0, 300)}...
                      </p>

                      {/* Expanded Content */}
                      <AnimatePresence>
                        {expandedArticle === article.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="border-t border-slate-200 pt-4 mt-4"
                          >
                            <div className="space-y-4">
                              <div>
                                <h5 className="font-semibold text-slate-900 mb-2">Full Article Content</h5>
                                <div className="max-h-64 overflow-y-auto p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg border border-slate-200">
                                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                    {article.cleaned_text}
                                  </p>
                                </div>
                              </div>

                              {article.sentiments && article.sentiments.length > 0 && (
                                <div>
                                  <h5 className="font-semibold text-slate-900 mb-3">Sentiment Analysis Details</h5>
                                  <div className="space-y-3">
                                    {article.sentiments.map((sentiment, idx) => (
                                      <div key={idx} className="p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg border border-slate-200">
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center space-x-3">
                                            <span className="font-semibold text-slate-900">{sentiment.entity_name}</span>
                                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-medium capitalize">
                                              {sentiment.entity_type}
                                            </span>
                                          </div>
                                          <div className="flex space-x-2">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getSentimentColor(sentiment.financial_sentiment)}`}>
                                              Financial: {sentiment.financial_sentiment}
                                            </span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getSentimentColor(sentiment.overall_sentiment)}`}>
                                              Overall: {sentiment.overall_sentiment}
                                            </span>
                                          </div>
                                        </div>
                                        <p className="text-sm text-slate-600 italic">
                                          "{sentiment.reasoning}"
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {articles.length > 0 && (
                <div className="flex items-center justify-center space-x-4">
                  <button
                    onClick={() => setArticlesPage(prev => Math.max(prev - 1, 1))}
                    disabled={articlesPage === 1}
                    className="px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-200 text-slate-600 rounded-lg hover:from-slate-200 hover:to-slate-300 transition-all duration-200 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-slate-600">
                    Page {articlesPage}
                  </span>
                  <button
                    onClick={() => setArticlesPage(prev => prev + 1)}
                    disabled={articles.length < 20}
                    className="px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-200 text-slate-600 rounded-lg hover:from-slate-200 hover:to-slate-300 transition-all duration-200 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'config' && (
            <motion.div
              key="config"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Enhanced Scheduler Configuration */}
              <div className="bg-card-gradient rounded-xl shadow-card border border-white/50 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Automated Pipeline Scheduler</h3>
                
                <div className="space-y-6">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                    <div className="flex items-center space-x-3 mb-3">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <h4 className="font-semibold text-blue-900">Current Schedule</h4>
                    </div>
                    <p className="text-blue-700">
                      Pipeline runs automatically every day at <span className="font-bold">{scheduleTime} UTC</span>
                    </p>
                    <p className="text-sm text-blue-600 mt-1">
                      Next run: {new Date(new Date().setUTCHours(parseInt(scheduleTime.split(':')[0]), parseInt(scheduleTime.split(':')[1]), 0, 0)).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Update Daily Run Time (UTC)
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={updateSchedule}
                        disabled={loading}
                        className="flex items-center space-x-2 px-6 py-3 bg-secondary-gradient text-white font-semibold rounded-xl hover:shadow-glow transition-all duration-300"
                      >
                        <Save className="h-4 w-4" />
                        <span>Update Schedule</span>
                      </button>
                    </div>
                    <p className="text-sm text-slate-500 mt-2">
                      ⚠️ Requires pipeline password for security. Changes take effect immediately.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { time: '01:00', desc: 'Early morning (recommended)', icon: '🌙' },
                      { time: '12:00', desc: 'Midday update', icon: '☀️' },
                      { time: '18:00', desc: 'Evening analysis', icon: '🌅' }
                    ].map((preset, index) => (
                      <button
                        key={index}
                        onClick={() => setScheduleTime(preset.time)}
                        className={`p-4 rounded-xl border transition-all duration-200 text-left ${
                          scheduleTime === preset.time
                            ? 'bg-primary-gradient text-white border-blue-500'
                            : 'bg-gradient-to-r from-slate-50 to-blue-50 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="text-lg mb-1">{preset.icon} {preset.time} UTC</div>
                        <div className={`text-sm ${scheduleTime === preset.time ? 'text-white/80' : 'text-slate-600'}`}>
                          {preset.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'keys' && (
            <motion.div
              key="keys"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Enhanced API Keys Management */}
              <div className="bg-card-gradient rounded-xl shadow-card border border-white/50 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6">API Keys & Authentication</h3>
                
                <div className="space-y-6">
                  {[
                    { 
                      key: 'pipeline_password', 
                      label: 'Pipeline Password', 
                      placeholder: 'Enter pipeline password',
                      description: 'Required for triggering pipeline and changing settings',
                      icon: Shield
                    },
                    { 
                      key: 'openai', 
                      label: 'OpenAI API Key', 
                      placeholder: 'sk-...',
                      description: 'For GPT models (gpt-4o-mini, gpt-4-turbo, etc.)',
                      icon: Brain
                    },
                    { 
                      key: 'groq', 
                      label: 'Groq API Key', 
                      placeholder: 'gsk_...',
                      description: 'For fast inference with Llama models',
                      icon: Zap
                    }
                  ].map((field) => {
                    const Icon = field.icon;
                    return (
                      <div key={field.key} className="p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200">
                        <div className="flex items-center space-x-3 mb-3">
                          <Icon className="h-5 w-5 text-blue-600" />
                          <label className="block text-sm font-medium text-slate-700">
                            {field.label}
                          </label>
                        </div>
                        <div className="relative mb-2">
                          <input
                            type={showKeys[field.key as keyof typeof showKeys] ? 'text' : 'password'}
                            value={apiKeys[field.key as keyof typeof apiKeys]}
                            onChange={(e) => setApiKeys(prev => ({ ...prev, [field.key]: e.target.value }))}
                            className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={field.placeholder}
                          />
                          <button
                            type="button"
                            onClick={() => setShowKeys(prev => ({ ...prev, [field.key]: !prev[field.key as keyof typeof showKeys] }))}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showKeys[field.key as keyof typeof showKeys] ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                        <p className="text-xs text-slate-600">{field.description}</p>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <p className="font-medium mb-1">🔒 Security Notice</p>
                      <ul className="space-y-1 text-xs">
                        <li>• API keys are stored temporarily in browser memory only</li>
                        <li>• Keys are never sent to our servers or persisted</li>
                        <li>• Re-enter keys each session for maximum security</li>
                        <li>• Use environment variables in production</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DeveloperMode;