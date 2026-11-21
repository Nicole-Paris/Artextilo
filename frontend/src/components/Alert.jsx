import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/cn.js';

export default function Alert({ type = 'error', variant, children, className }) {
  const resolvedType = variant || type;
  const isSuccess = resolvedType === 'success';
  const Icon = isSuccess ? CheckCircle2 : AlertCircle;

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-6',
        isSuccess
          ? 'border-emerald-300/80 bg-emerald-50 text-emerald-950 shadow-xs'
          : 'border-danger/20 bg-danger/10 text-danger-strong',
        className,
      )}
      role="alert"
    >
      <Icon
        className={cn(
          'mt-0.5 h-4 w-4 shrink-0',
          isSuccess ? 'text-emerald-600' : 'text-danger-strong',
        )}
        aria-hidden="true"
      />
      <div className="flex-1 font-medium">{children}</div>
    </div>
  );
}
