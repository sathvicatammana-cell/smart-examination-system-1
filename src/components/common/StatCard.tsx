import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: 'default' | 'emerald' | 'amber' | 'rose' | 'sky';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
}) => {
  let accentBg = 'bg-slate-50 text-slate-600';
  let borderClass = 'border-slate-200/80';

  if (variant === 'emerald') {
    accentBg = 'bg-emerald-50 text-emerald-600';
    borderClass = 'border-emerald-100';
  } else if (variant === 'amber') {
    accentBg = 'bg-amber-50 text-amber-600';
    borderClass = 'border-amber-100';
  } else if (variant === 'rose') {
    accentBg = 'bg-rose-50 text-rose-600';
    borderClass = 'border-rose-100';
  } else if (variant === 'sky') {
    accentBg = 'bg-sky-50 text-sky-600';
    borderClass = 'border-sky-100';
  }

  return (
    <div className={`bg-white rounded-xl p-5 border ${borderClass} shadow-xs transition-all hover:shadow-md`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl ${accentBg}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};
