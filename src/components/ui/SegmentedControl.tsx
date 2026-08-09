import './segmented-control.css';

interface SegmentedOption {
  label: string;
  value: string;
}

interface SegmentedControlProps {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SegmentedControl({ options, value, onChange, className = '' }: SegmentedControlProps) {
  return (
    <div className={`segmented ${className}`} role="radiogroup">
      {options.map((opt) => (
        <button
          key={opt.value}
          className={`segmented__option ${value === opt.value ? 'segmented__option--active' : ''}`}
          onClick={() => onChange(opt.value)}
          role="radio"
          aria-checked={value === opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
