import React from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert, Shield, MinusCircle } from 'lucide-react';

export default function RiskBadge({ level, className = '' }) {
  const norm = (level || '').toLowerCase().trim();

  let badgeStyle = 'bg-gray-100 text-gray-700 border-gray-200';
  let Icon = Shield;
  let label = level || 'Not Analyzed';

  if (norm === 'low' || norm === 'low risk') {
    badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300';
    Icon = ShieldCheck;
    label = 'Low Risk';
  } else if (norm === 'medium' || norm === 'med' || norm === 'medium risk') {
    badgeStyle = 'bg-amber-50 text-amber-800 border-amber-300';
    Icon = AlertTriangle;
    label = 'Medium Risk';
  } else if (norm === 'high' || norm === 'high risk') {
    badgeStyle = 'bg-red-50 text-red-800 border-red-300 font-semibold';
    Icon = ShieldAlert;
    label = 'High Risk';
  } else if (norm.includes('not analyzed') || norm === '' || norm === 'not rated') {
    badgeStyle = 'bg-stone-50 text-stone-600 border-stone-200';
    Icon = MinusCircle;
    label = 'Not Analyzed';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border ${badgeStyle} ${className}`}
      title={label === 'Not Analyzed' ? 'Run AI Risk Analysis to compute a suspicion score for this tender' : undefined}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span>{label}</span>
    </span>
  );
}
