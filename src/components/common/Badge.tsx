import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'gray', 
  size = 'md',
  className = ''
}) => {
  const variantStyles = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    red: 'bg-rose-50 text-rose-700 border-rose-200/80',
    yellow: 'bg-amber-50 text-amber-700 border-amber-200/80',
    blue: 'bg-blue-50 text-blue-700 border-blue-200/80',
    purple: 'bg-purple-50 text-purple-700 border-purple-200/80',
    gray: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 rounded-md font-medium border',
    md: 'text-xs px-2.5 py-1 rounded-full font-medium border',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 leading-none transition-colors ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        variant === 'green' ? 'bg-emerald-500' :
        variant === 'red' ? 'bg-rose-500' :
        variant === 'yellow' ? 'bg-amber-500' :
        variant === 'blue' ? 'bg-blue-500' :
        variant === 'purple' ? 'bg-purple-500' : 'bg-slate-400'
      }`} />
      {children}
    </span>
  );
};
