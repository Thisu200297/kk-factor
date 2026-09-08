/** 214 -> "3:34". Used by the track list and the progress bar. */
export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

/** "18 Aug 2026" */
export function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "4 hours ago" — falls back to an absolute date beyond a week. */
export function formatRelative(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';

  const units = [
    ['minute', 60],
    ['hour', 3600],
    ['day', 86400],
  ];

  for (let i = units.length - 1; i >= 0; i -= 1) {
    const [label, size] = units[i];
    if (seconds >= size) {
      const count = Math.floor(seconds / size);
      if (label === 'day' && count > 7) return formatDate(value);
      return `${count} ${label}${count === 1 ? '' : 's'} ago`;
    }
  }
  return 'just now';
}

/** Strips HTML down to plain text — for excerpts and meta descriptions. */
export function stripHtml(html = '') {
  return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function readingTime(html) {
  const words = stripHtml(html).split(' ').filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function truncate(text = '', length = 140) {
  const clean = String(text);
  return clean.length > length ? `${clean.slice(0, length).trimEnd()}…` : clean;
}

export function classNames(...values) {
  return values.filter(Boolean).join(' ');
}
