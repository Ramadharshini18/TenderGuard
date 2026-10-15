import React from 'react';

export default function PageHeader({
  title,
  subtitle,
  category,
  actions,
  className = '',
}) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-brand-border/60 ${className}`}>
      <div>
        {category && (
          <div className="text-xs font-semibold uppercase tracking-wider text-brand-secondary mb-1">
            {category}
          </div>
        )}
        <h1 className="text-2xl lg:text-3xl font-bold text-brand-charcoal tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-brand-muted max-w-3xl">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
