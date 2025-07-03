import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface ResponsiveLayoutProps {
  children: ReactNode;
  className?: string;
}

export const ResponsiveContainer: React.FC<ResponsiveLayoutProps> = ({ 
  children, 
  className = "" 
}) => (
  <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
    {children}
  </div>
);

export const ResponsiveGrid: React.FC<{
  children: ReactNode;
  cols?: { sm?: number; md?: number; lg?: number; xl?: number };
  gap?: number;
  className?: string;
}> = ({ 
  children, 
  cols = { sm: 1, md: 2, lg: 3 }, 
  gap = 6,
  className = "" 
}) => {
  const gridClasses = [
    'grid',
    `gap-${gap}`,
    cols.sm && `grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={gridClasses}>
      {children}
    </div>
  );
};

export const MobileDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}> = ({ isOpen, onClose, children, title }) => (
  <>
    {/* Backdrop */}
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
      />
    )}
    
    {/* Drawer */}
    <motion.div
      initial={{ x: '-100%' }}
      animate={{ x: isOpen ? 0 : '-100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed left-0 top-0 h-full w-80 bg-white shadow-xl z-50 lg:hidden overflow-y-auto"
    >
      {title && (
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        </div>
      )}
      <div className="p-4">
        {children}
      </div>
    </motion.div>
  </>
);

export const ResponsiveCard: React.FC<ResponsiveLayoutProps> = ({ 
  children, 
  className = "" 
}) => (
  <motion.div
    whileHover={{ y: -2 }}
    transition={{ duration: 0.2 }}
    className={`bg-card-gradient rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 border border-white/50 overflow-hidden ${className}`}
  >
    {children}
  </motion.div>
);