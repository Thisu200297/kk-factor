import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  authApi,
  setAccessToken,
  setSessionExpiredHandler,
  getAccessToken,
  hasSessionHint,
  setSessionHint,
} from '../utils/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // `initialising` gates the router so a protected route does not flash the
  // login page while the session is still being restored.
  const [initialising, setInitialising] = useState(true);
  const [error, setError] = useState(null);
  const expiredRef = useRef(false);

  /** Restores the session on first paint: try the stored token, then refresh. */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // A visitor who has never signed in has no cookie to restore — skip
      // the round trip entirely rather than provoking a 401.
      if (!getAccessToken() && !hasSessionHint()) {
        if (!cancelled) setInitialising(false);
        return;
      }

      try {
        if (getAccessToken()) {
          const { user: me } = await authApi.me();
          if (!cancelled) setUser(me);
        } else {
          // No access token, but an httpOnly refresh cookie may still be valid.
          const { user: me } = await authApi.refresh();
          if (!cancelled) setUser(me);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setAccessToken(null);
          setSessionHint(false);
        }
      } finally {
        if (!cancelled) setInitialising(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /** The axios interceptor calls this when a refresh finally fails. */
  useEffect(() => {
    setSessionExpiredHandler(() => {
      expiredRef.current = true;
      setUser(null);
    });
  }, []);

  const login = useCallback(async (credentials) => {
    setError(null);
    const { user: me, accessToken } = await authApi.login(credentials);
    setAccessToken(accessToken);
    setSessionHint(true);
    setUser(me);
    expiredRef.current = false;
    return me;
  }, []);

  const register = useCallback(async (payload) => {
    setError(null);
    const { user: me, accessToken } = await authApi.register(payload);
    setAccessToken(accessToken);
    setSessionHint(true);
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* the local session is cleared regardless of what the server says */
    }
    setAccessToken(null);
    setSessionHint(false);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
      initialising,
      sessionExpired: expiredRef.current,
      error,
      setError,
      login,
      register,
      logout,
    }),
    [user, initialising, error, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
