import { Children, cloneElement, useId } from 'react';
import { cn } from '../lib/cn.js';

export default function Field({
  label,
  error,
  hint,
  className,
  children,
  htmlFor,
}) {
  const generatedId = useId();
  const fieldId = htmlFor ?? generatedId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const describedBy = [error ? errorId : null, hint && !error ? hintId : null]
    .filter(Boolean)
    .join(' ');

  const child = Children.only(children);
  const control = cloneElement(child, {
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': describedBy || undefined,
  });

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={fieldId} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {control}
      {hint && !error && (
        <p id={hintId} className="text-xs leading-5 text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-semibold leading-5 text-danger" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}

export function inputClass(error) {
  return cn(
    'block w-full rounded-xl border bg-paper px-3.5 py-2.5 text-sm text-ink shadow-sm outline-none transition placeholder:text-muted focus:ring-4 disabled:cursor-not-allowed disabled:bg-sand',
    error
      ? 'border-danger/40 focus:border-danger focus:ring-danger/10'
      : 'border-line focus:border-clay focus:ring-clay/10',
  );
}
