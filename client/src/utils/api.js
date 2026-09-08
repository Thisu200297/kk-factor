import axios from 'axios';
import { API_URL } from './constants';

/**
 * Single axios instance for the whole app.
 *
 * Access token: kept in memory (and mirrored to localStorage so a refresh
 * does not sign the user out) and attached as a Bearer header.
 * Refresh token: an httpOnly cookie the browser sends automatically —
 * `withCredentials: true` is what makes that work.
 */
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

const TOKEN_KEY = 'kk_access_token';
/**
 * Marks that this browser has signed in at some point, so the app knows a
 * refresh cookie is worth trying. Without it, every first-time anonymous
 * visitor would fire a pointless POST /auth/refresh and log a console 401.
 */
const SESSION_HINT_KEY = 'kk_has_session';

let accessToken = (() => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null; // private browsing / storage disabled
  }
})();

/** Called by AuthContext whenever the session changes. */
export function setAccessToken(token) {
  accessToken = token || null;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable — the in-memory copy still works for this tab */
  }
}

export function getAccessToken() {
  return accessToken;
}

/** True when a refresh cookie may exist for this browser. */
export function hasSessionHint() {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

export function setSessionHint(value) {
  try {
    if (value) localStorage.setItem(SESSION_HINT_KEY, '1');
    else localStorage.removeItem(SESSION_HINT_KEY);
  } catch {
    /* storage unavailable */
  }
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  // Let the browser set the multipart boundary itself.
  if (config.data instanceof FormData) delete config.headers['Content-Type'];
  return config;
});

/* --- Silent refresh -------------------------------------------------------
 * On a 401 the interceptor calls /auth/refresh once and replays the original
 * request. Concurrent 401s share a single in-flight refresh so a page with
 * five parallel requests does not fire five refreshes.
 * ------------------------------------------------------------------------ */
let refreshPromise = null;
let onSessionExpired = () => {};

export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        const token = res.data?.data?.accessToken;
        setAccessToken(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    const isRefreshCall = original?.url?.includes('/auth/refresh');
    const isLoginCall = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/register');

    // Only attempt a silent refresh if this browser has actually signed in —
    // otherwise an anonymous 401 would trigger a guaranteed-to-fail refresh.
    if (status === 401 && original && !original._retried && !isRefreshCall && !isLoginCall && hasSessionHint()) {
      original._retried = true;
      try {
        const token = await refreshSession();
        if (token) {
          original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
          return api(original);
        }
      } catch {
        /* fall through to sign-out */
      }
      setAccessToken(null);
      setSessionHint(false);
      onSessionExpired();
    }

    // Normalise every failure into a plain Error with a readable message.
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      (error.code === 'ERR_NETWORK' ? 'Cannot reach the server. Is the API running?' : error.message) ||
      'Something went wrong';

    const normalised = new Error(message);
    normalised.status = status;
    normalised.details = error.response?.data?.error?.details;
    return Promise.reject(normalised);
  }
);

/* --- Endpoint helpers ----------------------------------------------------- */

const unwrap = (promise) => promise.then((res) => res.data.data);

export const authApi = {
  login: (payload) => unwrap(api.post('/auth/login', payload)),
  register: (payload) => unwrap(api.post('/auth/register', payload)),
  logout: () => unwrap(api.post('/auth/logout')),
  refresh: () => unwrap(api.post('/auth/refresh')),
  me: () => unwrap(api.get('/auth/me')),
  changePassword: (payload) => unwrap(api.put('/auth/password', payload)),
};

export const articlesApi = {
  list: (params) => unwrap(api.get('/articles', { params })),
  get: (idOrSlug) => unwrap(api.get(`/articles/${idOrSlug}`)),
  byCategory: (slug, params) => unwrap(api.get(`/articles/category/${slug}`, { params })),
  trending: () => unwrap(api.get('/articles/trending')),
  search: (q, params) => unwrap(api.get('/search', { params: { q, ...params } })),
  create: (payload) => unwrap(api.post('/articles', payload)),
  update: (id, payload) => unwrap(api.put(`/articles/${id}`, payload)),
  remove: (id) => unwrap(api.delete(`/articles/${id}`)),
};

export const categoriesApi = {
  list: () => unwrap(api.get('/categories')),
  create: (payload) => unwrap(api.post('/categories', payload)),
  update: (id, payload) => unwrap(api.put(`/categories/${id}`, payload)),
  remove: (id) => unwrap(api.delete(`/categories/${id}`)),
};

export const tracksApi = {
  list: (params) => unwrap(api.get('/tracks', { params })),
  create: (formData) => unwrap(api.post('/tracks', formData)),
  update: (id, payload) => unwrap(api.put(`/tracks/${id}`, payload)),
  remove: (id) => unwrap(api.delete(`/tracks/${id}`)),
  registerPlay: (id) => api.post(`/tracks/${id}/play`).catch(() => {}),
};

export const playlistsApi = {
  list: () => unwrap(api.get('/playlists')),
  get: (idOrSlug) => unwrap(api.get(`/playlists/${idOrSlug}`)),
  create: (payload) => unwrap(api.post('/playlists', payload)),
  update: (id, payload) => unwrap(api.put(`/playlists/${id}`, payload)),
  remove: (id) => unwrap(api.delete(`/playlists/${id}`)),
};

export const radioApi = {
  streams: () => unwrap(api.get('/radio/streams')),
  nowPlaying: (id) => unwrap(api.get(`/radio/streams/${id}/now-playing`)),
  create: (payload) => unwrap(api.post('/radio/streams', payload)),
  update: (id, payload) => unwrap(api.put(`/radio/streams/${id}`, payload)),
  remove: (id) => unwrap(api.delete(`/radio/streams/${id}`)),
};

export const usersApi = {
  list: (params) => unwrap(api.get('/users', { params })),
  setRole: (id, role) => unwrap(api.put(`/users/${id}/role`, { role })),
  setStatus: (id, isActive) => unwrap(api.put(`/users/${id}/status`, { isActive })),
  setTier: (id, tier) => unwrap(api.put(`/users/${id}/tier`, { tier })),
  remove: (id) => unwrap(api.delete(`/users/${id}`)),
};

export const uploadsApi = {
  image: (file) => {
    const form = new FormData();
    form.append('image', file);
    return unwrap(api.post('/uploads/image', form));
  },
  audio: (file) => {
    const form = new FormData();
    form.append('audio', file);
    return unwrap(api.post('/uploads/audio', form));
  },
};

export const statsApi = {
  overview: () => unwrap(api.get('/stats')),
};

/* --- The KK Factor site ---------------------------------------------------
 * Sponsors and the organisations panel share one endpoint (they are the same
 * shape, told apart by `kind`); the show archive and the live banner are
 * their own.
 * ------------------------------------------------------------------------ */

export const partnersApi = {
  list: (kind) => unwrap(api.get('/partners', { params: kind ? { kind } : undefined })),
  create: (payload) => unwrap(api.post('/partners', payload)),
  update: (id, payload) => unwrap(api.put(`/partners/${id}`, payload)),
  remove: (id) => unwrap(api.delete(`/partners/${id}`)),
  reorder: (ids) => unwrap(api.put('/partners/reorder', { ids })),
  /** Fire and forget: a sponsor click must never delay opening their site. */
  registerClick: (id) => api.post(`/partners/${id}/click`).catch(() => {}),
};

export const episodesApi = {
  list: (params) => unwrap(api.get('/episodes', { params })),
  latest: () => unwrap(api.get('/episodes/latest')),
  get: (idOrSlug) => unwrap(api.get(`/episodes/${idOrSlug}`)),
  create: (payload) => unwrap(api.post('/episodes', payload)),
  update: (id, payload) => unwrap(api.put(`/episodes/${id}`, payload)),
  remove: (id) => unwrap(api.delete(`/episodes/${id}`)),
  registerPlay: (id) => api.post(`/episodes/${id}/play`).catch(() => {}),
};

export const mediaApi = {
  list: (kind) => unwrap(api.get('/media', { params: kind ? { kind } : undefined })),
  create: (payload) => unwrap(api.post('/media', payload)),
  update: (id, payload) => unwrap(api.put(`/media/${id}`, payload)),
  remove: (id) => unwrap(api.delete(`/media/${id}`)),
  reorder: (ids) => unwrap(api.put('/media/reorder', { ids })),
};

export const showApi = {
  getLive: () => unwrap(api.get('/show/live')),
  setLive: (payload) => unwrap(api.put('/show/live', payload)),
};

export const importApi = {
  run: () => unwrap(api.post('/import/run')),
  status: () => unwrap(api.get('/import/status')),
};

export default api;
