import { cn } from '@/lib/utils';

interface RadioButtonProps {
  id: string;
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function RadioButton({
  id,
  name,
  value,
  label,
  checked,
  onChange,
  disabled = false,
  className,
}: RadioButtonProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'inline-flex items-center gap-2 text-sm select-none',
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'cursor-pointer hover:text-primary',
        className,
      )}
    >
      {/* Hidden native radio */}
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="sr-only peer"
      />

      {/* Custom radio */}
      <div
        className={cn(
          'w-4 h-4 flex items-center justify-center rounded-full border transition-all',
          'border-stroke',
          'peer-focus:ring-2 peer-focus:ring-primary/30',
          checked && 'border-primary',
        )}
      >
        <div
          className={cn(
            'w-2 h-2 rounded-full bg-primary scale-0 transition-transform',
            checked && 'scale-100',
          )}
        />
      </div>

      <span className="text-foreground">{label}</span>
    </label>
  );
}
