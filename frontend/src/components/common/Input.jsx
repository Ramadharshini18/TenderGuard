import React from 'react';

export default function Input({
  label,
  id,
  type = 'text',
  placeholder = '',
  value,
  onChange,
  error,
  helperText,
  icon: Icon,
  disabled = false,
  required = false,
  className = '',
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-brand-charcoal uppercase tracking-wider mb-1.5"
        >
          {label}
          {required && <span className="text-risk-high ml-1">*</span>}
        </label>
      )}
      <div className="relative rounded-lg shadow-sm">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-muted">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <input
          id={inputId}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`block w-full rounded-lg border text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 ${
            Icon ? 'pl-9' : 'pl-3.5'
          } pr-3.5 py-2.5 ${
            error
              ? 'border-risk-high text-risk-high focus:border-risk-high focus:ring-risk-high/20 bg-red-50/30'
              : 'border-brand-border bg-white text-brand-charcoal placeholder-brand-muted/70 focus:border-brand-primary'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-400' : ''}`}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-risk-high font-medium">{error}</p>
      )}
      {!error && helperText && (
        <p className="mt-1 text-xs text-brand-muted">{helperText}</p>
      )}
    </div>
  );
}
