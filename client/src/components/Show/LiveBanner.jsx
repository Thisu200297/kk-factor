import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { showApi } from '../../utils/api';

/**
 * The "we are live" bar.
 *
 * Renders nothing at all when she is off air, which is most of the time — so
 * the whole page shifts up and nobody sees an empty slot waiting for a show.
 *
 * The state comes from one small setting she flips from the dashboard rather
 * than from asking YouTube. Polling YouTube would need an API key and would
 * spend its daily quota answering a question the presenter already knows the
 * answer to, and she is pressing "go live" on YouTube at that moment anyway.
 */
export default function LiveBanner() {
  const fetcher = useCallback(() => showApi.getLive(), []);
  const { data } = useFetch(fetcher);

  const live = data?.live;
  if (!live?.isLive) return null;

  return (
    <div className="bg-live text-white">
      <div className="container-page flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5">
        <span className="flex items-center gap-2.5">
          <span className="h-2 w-2 animate-pulse-live rounded-full bg-white" aria-hidden="true" />
          <span className="text-[0.6875rem] font-bold uppercase tracking-[0.18em]">Live now</span>
        </span>

        <span className="hidden h-5 w-px bg-white/35 sm:block" aria-hidden="true" />

        <span className="min-w-0 flex-1 truncate text-[0.9375rem]">
          {live.title || 'The Greek Eurobeat Show'}
        </span>

        <Link
          to="/show"
          className="shrink-0 rounded-full bg-white px-5 py-2 text-[0.8125rem] font-semibold text-live transition-transform hover:scale-[1.03] active:scale-95"
        >
          Watch now
        </Link>
      </div>
    </div>
  );
}
