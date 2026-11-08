import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/cn.js';

export default function Alert({ type = 'error', children, className }) {
  const isError = type === 'error';
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-6',
        isError
          ? 'border-danger/20 bg-danger/10 text-danger-strong'
          : 'border-forest/20 bg-forest/10 text-forest',
        className,
      )}
      role="alert"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
