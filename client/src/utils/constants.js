export const SITE_NAME = import.meta.env.VITE_SITE_NAME || 'The KK Factor';
export const API_URL = import.meta.env.VITE_API_URL || '/api';

/** Where uploaded media lives. Same origin in dev thanks to the Vite proxy. */
export const MEDIA_BASE = API_URL.replace(/\/api\/?$/, '');

/** Resolves a stored /uploads/... path into a fetchable URL. */
export function mediaUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${MEDIA_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

export const REPEAT_MODES = {
  OFF: 'off',
  ALL: 'all',
  ONE: 'one',
};

export const PLAYER_SOURCE = {
  NONE: 'none',
  RADIO: 'radio',
  MUSIC: 'music',
};

export const STREAM_STATE = {
  IDLE: 'idle',
  LOADING: 'loading',
  PLAYING: 'playing',
  PAUSED: 'paused',
  ERROR: 'error',
};

/** Fallback artwork so a missing cover never renders a broken image. */
export const PLACEHOLDER_COVER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><rect width="300" height="300" fill="#201f1f"/><g fill="#434655"><rect x="96" y="150" width="14" height="34" rx="7"/><rect x="120" y="128" width="14" height="78" rx="7"/><rect x="144" y="108" width="14" height="118" rx="7"/><rect x="168" y="134" width="14" height="66" rx="7"/><rect x="192" y="152" width="14" height="30" rx="7"/></g></svg>`
  );
