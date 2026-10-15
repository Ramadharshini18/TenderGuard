import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export default function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendType = 'neutral', // 'positive' | 'negative' | 'neutral'
  badgeLabel = 'Demo',
  accentColor = 'primary', // 'primary' | 'secondary' | 'accent' | 'danger' | 'warning'
  className = '',
}) {
  const accentStyles = {
    primary: 'border-l-brand-primary text-brand-primary bg-brand-primary/10',
    secondary: 'border-l-brand-secondary text-brand-secondary bg-brand-secondary/10',
    accent: 'border-l-brand-accent-dark text-brand-charcoal bg-brand-accent/20',
    warning: 'border-l-amber-600 text-amber-700 bg-amber-50',
    danger: 'border-l-risk-high text-risk-high bg-red-50',
  };

  const trendStyles = {
    positive: 'text-emerald-700 bg-emerald-50',
    negative: 'text-risk-high bg-red-50',
    neutral: 'text-brand-muted bg-gray-50',
  };

  return (
    <div
      className={`relative bg-white rounded-xl border border-brand-border/80 border-l-4 shadow-card hover:shadow-card-hover transition-all duration-200 p-5 ${
        accentStyles[accentColor] ? accentStyles[accentColor].split(' ')[0] : 'border-l-brand-primary'
      } ${className}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
            {title}
          </span>
          <div className="mt-2 text-2xl lg:text-3xl font-bold text-brand-charcoal tracking-tight">
            {value}
          </div>
        </div>

        {Icon && (
          <div
            className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${
              accentStyles[accentColor]
                ? accentStyles[accentColor].split(' ').slice(1).join(' ')
                : 'bg-brand-primary/10 text-brand-primary'
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-brand-border/40">
        <div className="flex items-center gap-1.5 text-brand-muted truncate">
          {trend && (
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                trendStyles[trendType] || trendStyles.neutral
              }`}
            >
              {trendType === 'positive' && <ArrowUpRight className="w-3 h-3 mr-0.5" />}
              {trendType === 'negative' && <ArrowDownRight className="w-3 h-3 mr-0.5" />}
              {trendType === 'neutral' && <Minus className="w-3 h-3 mr-0.5" />}
              {trend}
            </span>
          )}
          <span className="truncate">{subtitle}</span>
        </div>

        {badgeLabel && (
          <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-brand-accent-light text-brand-charcoal/70 border border-brand-accent/40">
            {badgeLabel}
          </span>
        )}
      </div>
    </div>
  );
}
