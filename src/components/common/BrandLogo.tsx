import React from 'react';
import { Sprout } from 'lucide-react';

interface BrandLogoProps {
  collapsed?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ 
  collapsed = false, 
  className = '',
  size = 'md' 
}) => {
  const iconSizes = {
    sm: 'w-7 h-7 text-emerald-600',
    md: 'w-8 h-8 text-emerald-600',
    lg: 'w-10 h-10 text-emerald-600',
  };

  const containerSizes = {
    sm: 'w-9 h-9',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Logo Icon with leafy vegetable aesthetic */}
      <div className={`${containerSizes[size]} rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-white shadow-md shadow-emerald-900/10 shrink-0 border border-emerald-500/30`}>
        <Sprout className={size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'} />
      </div>

      {!collapsed && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-900 tracking-tight leading-tight text-base sm:text-lg">
              Vegetable<span className="text-emerald-700 ml-1">POS</span>
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium leading-none mt-0.5">
            <span>by</span>
            <span className="text-slate-600 font-semibold hover:text-emerald-700 transition-colors">
              SudoLeads
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
