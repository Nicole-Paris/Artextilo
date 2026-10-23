import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusable(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (element) => element.getClientRects().length > 0,
  );
}

export function useDialogFocus({
  active,
  containerRef,
  onClose,
  inertSelector,
  lockScroll = true,
  restoreFocus = true,
}) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!active) return undefined;

    const container = containerRef.current;
    const previousFocus = document.activeElement;
    const inertElement = inertSelector ? document.querySelector(inertSelector) : null;
    const previousOverflow = document.body.style.overflow;

    if (inertElement) {
      inertElement.setAttribute('inert', '');
      inertElement.setAttribute('aria-hidden', 'true');
    }

    if (lockScroll) {
      document.body.style.overflow = 'hidden';
    }

    const focusables = () => getFocusable(container);
    const initialFocus =
      container?.querySelector('[data-autofocus]') ?? focusables()[0] ?? container;
    const focusTimer = window.setTimeout(() => initialFocus?.focus(), 0);

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== 'Tab') return;

      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        container?.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const focusIsInside = container?.contains(document.activeElement);

      if (event.shiftKey && (!focusIsInside || document.activeElement === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!focusIsInside || document.activeElement === last)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);

      if (lockScroll) {
        document.body.style.overflow = previousOverflow;
      }

      if (inertElement) {
        inertElement.removeAttribute('inert');
        inertElement.removeAttribute('aria-hidden');
      }

      if (
        restoreFocus &&
        previousFocus instanceof HTMLElement &&
        document.contains(previousFocus)
      ) {
        window.requestAnimationFrame(() => previousFocus.focus());
      }
    };
  }, [active, containerRef, inertSelector, lockScroll, restoreFocus]);
}
