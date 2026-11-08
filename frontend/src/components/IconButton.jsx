import { Loader2 } from 'lucide-react';
import { cn } from '../lib/cn.js';

const variants = {
  neutral: 'text-muted hover:bg-sand hover:text-ink',
  edit: 'text-muted hover:bg-sage hover:text-forest',
  archive: 'text-muted hover:bg-danger/10 hover:text-danger',
  restore: 'text-muted hover:bg-forest/10 hover:text-forest',
};

export default function IconButton({
  label,
  icon: Icon,
  variant = 'neutral',
  loading = false,
  className,
  disabled,
  ...props
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled || loading}
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Icon className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}
