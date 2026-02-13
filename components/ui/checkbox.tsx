'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  id?: string;
}

export default function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  className,
  id,
}: CheckboxProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <button
        type="button"
        role="checkbox"
        id={id}
        aria-checked={checked}
        aria-disabled={disabled}
        onClick={handleToggle}
        className={cn(
          'shrink-0 rounded-md border-2 transition-all duration-200 flex items-center justify-center',
          sizes[size],
          checked
            ? 'bg-success border-success text-white'
            : 'border-stroke bg-background hover:border-success/50',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && 'cursor-pointer',
        )}
      >
        {checked && (
          <Check size={iconSizes[size]} strokeWidth={3} />
        )}
      </button>
      {(label || description) && (
        <div
          className={cn(
            'flex flex-col gap-0.5',
            !disabled && 'cursor-pointer',
            disabled && 'opacity-50',
          )}
          onClick={handleToggle}
        >
          {label && (
            <span className="text-sm font-medium text-foreground leading-tight">
              {label}
            </span>
          )}
          {description && (
            <span className="text-xs text-secondary leading-tight">
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
