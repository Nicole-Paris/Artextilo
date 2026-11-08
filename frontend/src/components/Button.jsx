import { Loader2 } from 'lucide-react';
import { cn } from '../lib/cn.js';

const variants = {
  primary:
    'bg-clay text-white hover:bg-clay-strong focus-visible:outline-clay',
  secondary:
    'border border-line bg-paper text-ink hover:bg-sand focus-visible:outline-clay',
  danger:
    'bg-danger text-white hover:bg-danger-strong focus-visible:outline-danger',
  ghost:
    'text-muted-strong hover:bg-sand hover:text-ink focus-visible:outline-clay',
};

const sizes = {
  sm: 'min-h-9 px-3 py-1.5 text-sm',
  md: 'min-h-10 px-4 py-2.5 text-sm',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  loading = false,
  disabled,
  className,
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
