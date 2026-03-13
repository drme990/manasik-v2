'use client';

import { useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiNameInputProps {
  /** The current value as a newline-joined list of names */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  isRTL?: boolean;
  error?: string;
}

export default function MultiNameInput({
  value,
  onChange,
  placeholder,
  maxLength,
  isRTL,
  error,
}: MultiNameInputProps) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const names = value
    .split('\n')
    .map((n) => n.trim())
    .filter(Boolean);

  const addName = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...names, trimmed].join('\n'));
    setDraft('');
    inputRef.current?.focus();
  };

  const removeName = (idx: number) => {
    onChange(names.filter((_, i) => i !== idx).join('\n'));
  };

  return (
    <div className="space-y-2">
      {/* Single input with inline + button */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addName();
            }
          }}
          maxLength={maxLength}
          placeholder={placeholder}
          dir={isRTL ? 'rtl' : 'ltr'}
          className={cn(
            'w-full px-4 py-2 pe-10 rounded-lg border bg-background text-foreground',
            'focus:outline-none focus:ring-2 transition-colors',
            'placeholder:text-secondary/50',
            error
              ? 'border-error focus:ring-error/20 focus:border-error'
              : 'border-stroke focus:ring-primary focus:border-success',
          )}
        />
        <button
          type="button"
          onClick={addName}
          disabled={!draft.trim()}
          className="absolute end-2 flex items-center justify-center w-6 h-6 rounded bg-primary text-background hover:bg-primary/80 disabled:opacity-30 transition-colors"
          aria-label={isRTL ? 'أضف اسمًا' : 'Add name'}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Name chips */}
      {names.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {names.map((name, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-foreground rounded-full text-sm border border-primary/20"
            >
              {name}
              <button
                type="button"
                onClick={() => removeName(idx)}
                className="text-secondary hover:text-error transition-colors"
                aria-label={`Remove ${name}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
