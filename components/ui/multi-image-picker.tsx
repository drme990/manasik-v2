'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ImagePlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiImagePickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  className?: string;
  maxImages?: number;
}

function parseImages(value: string): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === 'string' && v.length > 0);
    }
  } catch {
    // Backward compat: single data URL or URL string
    if (typeof value === 'string' && value.length > 0) return [value];
  }
  return [];
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function MultiImagePicker({
  label,
  value,
  onChange,
  placeholder,
  error,
  className,
  maxImages = 4,
}: MultiImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const images = parseImages(value);
  const canAddMore = images.length < maxImages;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remaining = maxImages - images.length;
    const toAdd = Array.from(files).slice(0, remaining);

    if (toAdd.length === 0) return;

    setIsLoading(true);
    try {
      const dataUrls = await Promise.all(toAdd.map(fileToDataUrl));
      const updated = [...images, ...dataUrls];
      onChange(JSON.stringify(updated));
    } finally {
      setIsLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onChange(updated.length > 0 ? JSON.stringify(updated) : '');
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((src, i) => (
            <div key={i} className="relative inline-block">
              <Image
                src={src}
                alt={`${label || 'image'} ${i + 1}`}
                className="w-24 h-24 object-cover rounded-site border border-stroke"
                width={96}
                height={96}
              />
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="absolute -top-2 -right-2 w-5 h-5 bg-error text-white rounded-full flex items-center justify-center hover:bg-error/80 transition-colors"
                aria-label="Remove image"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {canAddMore && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isLoading}
          className={cn(
            'w-full flex flex-col items-center justify-center gap-2 px-4 py-6',
            'rounded-lg border-2 border-dashed transition-colors',
            'text-secondary hover:text-foreground',
            'disabled:opacity-50 disabled:cursor-not-allowed',
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
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
