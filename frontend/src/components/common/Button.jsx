import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  iconLeft: IconLeft,
  iconRight: IconRight,
  className = '',
  onClick,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors duration-150 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-brand-primary text-white hover:bg-brand-primary-light focus:ring-brand-primary shadow-sm',
    secondary:
      'bg-brand-secondary text-white hover:bg-brand-secondary-light focus:ring-brand-secondary shadow-sm',
    outline:
      'border border-brand-border bg-white text-brand-charcoal hover:bg-brand-accent-light/50 focus:ring-brand-primary',
    ghost:
      'text-brand-charcoal hover:bg-brand-accent-light/60 hover:text-brand-primary focus:ring-brand-primary',
    accent:
      'bg-brand-accent text-brand-charcoal hover:bg-brand-accent-dark/80 focus:ring-brand-primary font-semibold shadow-sm',
    danger:
      'bg-risk-high text-white hover:bg-red-800 focus:ring-risk-high shadow-sm',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.primary} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : IconLeft ? (
        <IconLeft className="w-4 h-4 flex-shrink-0" />
      ) : null}
      <span>{children}</span>
      {!isLoading && IconRight && (
        <IconRight className="w-4 h-4 flex-shrink-0" />
      )}
    </button>
  );
}
