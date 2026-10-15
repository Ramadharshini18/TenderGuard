import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';

export default function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while communicating with the server.',
  onRetry,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white rounded-xl border border-red-200 shadow-sm ${className}`}>
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-risk-high mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-brand-charcoal mb-1">
        {title}
      </h3>
      <p className="text-sm text-brand-muted max-w-md mb-5">
        {message}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" iconLeft={RefreshCw} onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}
