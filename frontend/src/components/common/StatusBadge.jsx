import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Lock,
  Search,
  Award,
  XCircle,
} from 'lucide-react';

export default function StatusBadge({ status, className = '' }) {
  const norm = (status || '').toLowerCase().trim();

  let badgeStyle = 'bg-gray-100 text-gray-700 border-gray-200';
  let Icon = AlertCircle;

  if (norm === 'draft') {
    badgeStyle = 'bg-slate-100 text-slate-700 border-slate-300';
    Icon = FileText;
  } else if (norm === 'published') {
    badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold';
    Icon = CheckCircle2;
  } else if (norm === 'closed') {
    badgeStyle = 'bg-stone-100 text-stone-700 border-stone-300';
    Icon = Lock;
  } else if (norm === 'under evaluation' || norm.includes('evaluation') || norm.includes('review')) {
    badgeStyle = 'bg-amber-50 text-amber-800 border-amber-300 font-medium';
    Icon = Search;
  } else if (norm === 'awarded') {
    badgeStyle = 'bg-blue-50 text-blue-800 border-blue-300 font-semibold';
    Icon = Award;
  } else if (norm === 'cancelled' || norm.includes('cancel')) {
    badgeStyle = 'bg-red-50 text-red-800 border-red-300';
    Icon = XCircle;
  } else if (norm.includes('analyzed')) {
    badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    Icon = CheckCircle2;
  } else if (norm.includes('pending')) {
    badgeStyle = 'bg-amber-50 text-amber-800 border-amber-200';
    Icon = Clock;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeStyle} ${className}`}
    >
      <Icon className="w-3 h-3 flex-shrink-0" />
      <span>{status || 'Unknown'}</span>
    </span>
  );
}
