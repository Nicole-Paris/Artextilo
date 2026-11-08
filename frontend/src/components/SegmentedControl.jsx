import { cn } from '../lib/cn.js';

export default function SegmentedControl({ value, onChange, options, label }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex rounded-xl border border-line bg-sand/70 p-1"
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={selected}
            className={cn(
              'min-h-9 rounded-lg px-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay',
              selected
                ? 'bg-forest text-cream shadow-sm'
                : 'text-muted-strong hover:bg-paper hover:text-ink',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
