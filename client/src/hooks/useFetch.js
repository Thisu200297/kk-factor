import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs an async function and tracks { data, loading, error }.
 *
 * `fetcher` must be stable (wrap it in useCallback) — it is the dependency
 * that decides when to refetch. Results from a superseded call are discarded
 * so a slow response cannot overwrite a newer one.
 */
export function useFetch(fetcher, { immediate = true, initialData = null } = {}) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const requestId = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    const id = requestId.current + 1;
    requestId.current = id;

    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (mounted.current && requestId.current === id) setData(result);
      return result;
    } catch (err) {
      if (mounted.current && requestId.current === id) setError(err.message || 'Request failed');
      return null;
    } finally {
      if (mounted.current && requestId.current === id) setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    if (immediate) run();
  }, [run, immediate]);

  return { data, loading, error, refetch: run, setData };
}
