import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { classNames } from '../../utils/format';

const ToastContext = createContext(null);

/** Minimal toast system — enough for save/delete confirmations in the CMS. */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, tone = 'info') => {
      const id = Date.now() + Math.random();
      setToasts((list) => [...list, { id, message, tone }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      toast: push,
      success: (message) => push(message, 'success'),
      error: (message) => push(message, 'error'),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed bottom-24 right-4 z-[200] flex flex-col gap-2 md:bottom-28">
          {toasts.map((item) => (
            <div
              key={item.id}
              role="status"
              className={classNames(
                'pointer-events-auto flex items-center gap-2 rounded-xl px-4 py-3 text-sm shadow-lg animate-fade-up glass',
                item.tone === 'success' && 'text-success',
                item.tone === 'error' && 'text-error',
                item.tone === 'info' && 'text-on-surface'
              )}
            >
              <Icon
                name={item.tone === 'success' ? 'check_circle' : item.tone === 'error' ? 'error' : 'info'}
                size={18}
              />
              <span className="max-w-xs">{item.message}</span>
              <button type="button" onClick={() => dismiss(item.id)} aria-label="Dismiss">
                <Icon name="close" size={16} className="text-on-surface-variant" />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside a <ToastProvider>');
  return context;
}
