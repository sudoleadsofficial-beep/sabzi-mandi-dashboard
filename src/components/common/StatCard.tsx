import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  badgeText?: string;
  badgeVariant?: 'green' | 'red' | 'blue' | 'yellow' | 'gray';
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  badgeText,
  badgeVariant = 'green',
  trend,
  onClick,
}) => {
  const badgeColors = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red: 'bg-rose-50 text-rose-700 border-rose-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    yellow: 'bg-amber-50 text-amber-700 border-amber-200',
    gray: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-150 flex flex-col justify-between ${
        onClick ? 'cursor-pointer hover:border-emerald-400' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase truncate">
            {title}
          </p>
          <h4 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            {value}
          </h4>
        </div>
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
          {icon}
        </div>
      </div>

      {(subtitle || badgeText || trend) && (
        <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1 text-[11px]">
          {subtitle && <span className="text-slate-500 font-medium">{subtitle}</span>}
          {badgeText && (
            <span className={`px-2 py-0.5 rounded-full font-semibold border ${badgeColors[badgeVariant]}`}>
              {badgeText}
            </span>
          )}
          {trend && (
            <span
              className={`font-bold flex items-center gap-0.5 ${
                trend.isPositive ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{trend.value}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
