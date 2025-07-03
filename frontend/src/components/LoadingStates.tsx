import React from 'react';
import { motion } from 'framer-motion';
import { Loader } from 'lucide-react';

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`bg-card-gradient rounded-xl shadow-card p-6 animate-pulse border border-white/50 ${className}`}>
    <div className="h-6 bg-slate-200 rounded w-3/4 mb-4"></div>
    <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
    <div className="h-4 bg-slate-200 rounded w-full mb-4"></div>
    <div className="flex space-x-2">
      <div className="h-8 bg-slate-200 rounded w-16"></div>
      <div className="h-8 bg-slate-200 rounded w-16"></div>
    </div>
  </div>
);

export const SkeletonGrid: React.FC<{ count?: number; className?: string }> = ({ 
  count = 6, 
  className = "" 
}) => (
  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
    {Array.from({ length: count }, (_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export const LoadingSpinner: React.FC<{ 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}> = ({ size = 'md', className = "", text }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center space-y-2">
        <Loader className={`${sizeClasses[size]} animate-spin text-blue-600`} />
        {text && (
          <p className="text-sm text-slate-600 font-medium">{text}</p>
        )}
      </div>
    </div>
  );
};

export const InlineLoader: React.FC<{ text?: string }> = ({ text = "Loading..." }) => (
  <div className="flex items-center space-x-2">
    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
    <span className="text-sm text-slate-600">{text}</span>
  </div>
);

export const EmptyState: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ icon: Icon, title, description, action, className = "" }) => (
  <div className={`text-center py-12 ${className}`}>
    <div className="text-slate-400 mb-4">
      <Icon className="h-12 w-12 mx-auto" />
    </div>
    <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
    <p className="text-slate-600 mb-6 max-w-md mx-auto">{description}</p>
    {action}
  </div>
);