import React from 'react';
import { Inbox, FolderSearch } from 'lucide-react';
import Button from './Button';

export default function EmptyState({
  title = 'No data available',
  description = 'There are currently no items to display.',
  icon: Icon = FolderSearch,
  actionText,
  onAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white rounded-xl border border-dashed border-brand-border/80 ${className}`}>
      <div className="w-14 h-14 rounded-full bg-brand-accent-light flex items-center justify-center text-brand-primary mb-4 shadow-sm">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-semibold text-brand-charcoal mb-1">
        {title}
      </h3>
      <p className="text-sm text-brand-muted max-w-sm mb-6">
        {description}
      </p>
      {actionText && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
}
