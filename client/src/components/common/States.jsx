import Icon from './Icon';

export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-error/20 bg-error-container/10 px-6 py-10 text-center"
    >
      <Icon name="error" className="text-error" size={32} />
      <p className="text-sm text-on-surface">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary mt-1">
          <Icon name="refresh" size={18} />
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon = 'inbox', title = 'Nothing here yet', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line px-6 py-14 text-center">
      <Icon name={icon} className="text-fg-subtle" size={36} />
      <h3 className="text-base font-semibold text-on-surface">{title}</h3>
      {description && <p className="max-w-sm text-sm text-on-surface-variant">{description}</p>}
      {action}
    </div>
  );
}

export function InlineError({ message }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-center gap-1.5 text-sm text-error">
      <Icon name="error" size={16} />
      {message}
    </p>
  );
}
