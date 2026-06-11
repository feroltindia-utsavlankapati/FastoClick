import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, id, ...props }, ref) => {
    const inputId = id || Math.random().toString(36).substring(2, 9);
    
    return (
      <div className={`flex flex-col w-full ${className}`}>
        {label && (
          <label htmlFor={inputId} className="mb-1 text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-ring disabled:cursor-not-allowed disabled:opacity-50 ${
            error ? 'border-danger focus:ring-danger' : ''
          }`}
          {...props}
        />
        {error && <span className="mt-1 text-xs text-danger">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
