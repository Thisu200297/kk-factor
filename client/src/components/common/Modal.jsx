import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { classNames } from '../../utils/format';

/** Accessible dialog: Escape closes, focus moves in, background scroll locks. */
export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const panelRef = useRef(null);
  // Callers usually pass an inline arrow for onClose, which changes identity on
  // every parent render. Holding it in a ref keeps the effects below keyed on
  // `open` alone — otherwise the focus effect re-fires mid-typing and steals
  // the caret out of any field inside the dialog.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeRef.current?.();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Move focus into the dialog once, when it opens.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const widths = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl' };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-black/70 p-0 backdrop-blur-sm md:items-center md:p-6">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={classNames(
          'relative z-10 flex max-h-[92vh] w-full flex-col rounded-t-3xl border border-line bg-surface-container-low shadow-2xl md:rounded-3xl',
          widths[size]
        )}
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold text-on-surface">{title}</h2>
          <button type="button" onClick={onClose} className="btn-icon" aria-label="Close dialog">
            <Icon name="close" size={20} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {footer && (
          <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-line px-5 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}

export function ConfirmDialog({ open, onCancel, onConfirm, title, message, confirmLabel = 'Delete', busy = false }) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-on-surface-variant">{message}</p>
    </Modal>
  );
}
