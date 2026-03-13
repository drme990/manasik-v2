'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { ImagePlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImagePickerProps {
  label?: string;
  value: string;
  onChange: (file: File | null) => void;
  placeholder?: string;
  error?: string;
  className?: string;
}

export default function ImagePicker({
  label,
  value,
  onChange,
  placeholder,
  error,
  className,
}: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.files?.[0] || null);
  };

  const handleRemove = () => {
    if (inputRef.current) inputRef.current.value = '';
    onChange(null);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}

      {value ? (
        <div className="relative inline-block">
          <Image
            src={value}
            alt={label || 'selected image'}
            className="w-28 h-28 object-cover rounded-site border border-stroke"
            width={112}
            height={112}
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 w-5 h-5 bg-error text-white rounded-full flex items-center justify-center hover:bg-error/80 transition-colors"
            aria-label="Remove image"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            'w-full flex flex-col items-center justify-center gap-2 px-4 py-6',
            'rounded-lg border-2 border-dashed transition-colors',
            'text-secondary hover:text-foreground',
            error
              ? 'border-error hover:border-error/70'
              : 'border-stroke hover:border-primary',
          )}
        >
          <ImagePlus size={28} />
          {placeholder && <span className="text-sm">{placeholder}</span>}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
