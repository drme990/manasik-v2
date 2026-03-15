import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = true,
      className,
      startIcon,
      endIcon,
      id,
      type = 'text',
      ...props
    },
    ref,
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className={cn('space-y-2', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {startIcon && (
            <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-secondary">
              {startIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            className={cn(
              'w-full px-4 py-2 rounded-lg border bg-background text-foreground',
              'focus:outline-none focus:ring-2 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'placeholder:text-secondary/50',
              startIcon && 'ps-10',
              endIcon && 'pe-10',
              error
                ? 'border-error focus:ring-error/20 focus:border-error'
                : 'border-stroke focus:ring-primary focus:border-success',
              className,
            )}
            {...props}
          />
          {endIcon && (
            <div className="absolute inset-y-0 end-0 flex items-center pe-3 text-secondary">
              {endIcon}
            </div>
          )}
        </div>
        {(error || helperText) && (
          <p className={cn('text-sm', error ? 'text-error' : 'text-secondary')}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
