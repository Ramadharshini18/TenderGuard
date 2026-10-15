import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingState({
  message = 'Loading...',
  description,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border border-brand-border/60 ${className}`}>
      <div className="w-12 h-12 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary mb-3">
        <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
      </div>
      <h3 className="text-sm font-semibold text-brand-charcoal">
        {message}
      </h3>
      {description && (
        <p className="text-xs text-brand-muted mt-1 max-w-xs">
          {description}
        </p>
      )}
    </div>
  );
}
