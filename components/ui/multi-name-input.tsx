'use client';

import { useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import Input from '@/components/ui/input';
import { Tooltip } from '@/components/ui/tooltip';

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

  const commitSingleDraftIfNeeded = () => {
    const trimmed = draft.trim();
    if (!trimmed || names.length > 0) return;
    onChange(trimmed);
    setDraft('');
  };

  const addLabel = isRTL ? 'أضف اسمًا' : 'Add name';
  const anotherLabel = isRTL ? 'أضف اسماً آخر' : 'Add another name';

  return (
    <div className="space-y-2.5">
      {/* the names written so far, above the field, each with its own remove key */}
      {names.length > 0 && (
        <div className="flex flex-wrap gap-2" dir={isRTL ? 'rtl' : 'ltr'}>
          {names.map((name, idx) => (
            <span
              key={`${idx}-${name}`}
              className="mni-chip inline-flex max-w-full items-center gap-2 rounded-2xl bg-foreground/[0.06] py-2 ps-2 pe-4 text-base font-semibold text-foreground ring-1 ring-foreground/10"
            >
              <button
                type="button"
                onClick={() => removeName(idx)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-secondary transition-colors hover:bg-error/15 hover:text-error"
                aria-label={isRTL ? `حذف ${name}` : `Remove ${name}`}
              >
                <X size={16} />
              </button>
              <span className="min-w-0 break-words">{name}</span>
            </span>
          ))}
        </div>
      )}

      {/* the field, with the add key beside it */}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Input
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
            onBlur={commitSingleDraftIfNeeded}
            maxLength={maxLength}
            placeholder={names.length > 0 ? anotherLabel : placeholder}
            dir={isRTL ? 'rtl' : 'ltr'}
            error={error}
            className="h-12 rounded-2xl text-base"
          />
        </div>
        <Tooltip content={names.length > 0 ? anotherLabel : addLabel} position="top">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={addName}
            disabled={!draft.trim()}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-success text-white shadow-md transition-all hover:bg-success/90 active:scale-95 disabled:bg-success/25 disabled:text-white/70 disabled:shadow-none"
            aria-label={names.length > 0 ? anotherLabel : addLabel}
          >
            <Plus size={22} />
          </button>
        </Tooltip>
      </div>
      <style>{`.mni-chip{animation:mni-in .28s cubic-bezier(.32,.72,0,1) both}@keyframes mni-in{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){.mni-chip{animation:none}}`}</style>
    </div>
  );
}
