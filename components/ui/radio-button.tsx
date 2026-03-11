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
        'inline-flex items-center gap-2 text-sm text-foreground',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        className,
      )}
    >
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="w-4 h-4 border-stroke text-success focus:ring-success/30"
      />
      <span>{label}</span>
    </label>
  );
}
