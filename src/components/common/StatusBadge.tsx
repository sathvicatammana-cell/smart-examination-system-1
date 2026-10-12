import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const norm = status?.toLowerCase() || '';

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let label = status;

  if (norm === 'present') {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium';
    label = 'Present';
  } else if (norm === 'absent') {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200 font-medium';
    label = 'Absent';
  } else if (norm === 'unmarked') {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200 font-medium';
    label = 'Unmarked';
  } else if (norm === 'published') {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    label = 'Published';
  } else if (norm === 'allocated') {
    colorClasses = 'bg-sky-50 text-sky-700 border-sky-200';
    label = 'Allocated';
  } else if (norm === 'draft') {
    colorClasses = 'bg-slate-100 text-slate-600 border-slate-200';
    label = 'Draft';
  } else if (norm === 'completed') {
    colorClasses = 'bg-purple-50 text-purple-700 border-purple-200';
    label = 'Completed';
  } else if (norm === 'admin') {
    colorClasses = 'bg-indigo-50 text-indigo-700 border-indigo-200';
    label = 'Admin';
  } else if (norm === 'incharge') {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    label = 'In-Charge';
  } else if (norm === 'student') {
    colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
    label = 'Student';
  }

  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${padding} ${colorClasses}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
      {label}
    </span>
  );
};
