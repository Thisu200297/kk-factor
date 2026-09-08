import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import { articlesApi } from '../../utils/api';

/**
 * Single-line breaking-news marquee.
 *
 * The headline list is rendered twice inside one flex track and the track is
 * translated by exactly -50%, so the second copy takes over the instant the
 * first scrolls out — a seamless loop with no visible seam. `w-max` on the
 * track is what keeps both copies on one line; without it they wrap and the
 * duplicate shows up as a second row.
 */
export default function BreakingTicker() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    articlesApi
      .list({ breaking: 'true', limit: 8 })
      .then((data) => {
        if (!cancelled) setItems(data.items);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!items.length) return null;

  const Strip = ({ ariaHidden }) => (
    <ul
      className="flex shrink-0 items-center"
      aria-hidden={ariaHidden || undefined}
    >
      {items.map((article) => (
        <li key={article.id} className="flex items-center">
          <span className="mx-3 h-1 w-1 shrink-0 rounded-full bg-live/70" aria-hidden="true" />
          <Link
            to={`/article/${article.slug}`}
            tabIndex={ariaHidden ? -1 : undefined}
            className="whitespace-nowrap text-[0.8125rem] text-fg-muted transition-colors hover:text-fg"
          >
            {article.title}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="border-b border-line bg-surface">
      <div className="container-page flex h-9 items-center gap-0">
        <span className="flex shrink-0 items-center gap-1.5 pr-3 text-live">
          <Icon name="bolt" size={13} filled />
          <span className="text-[0.6875rem] font-bold uppercase tracking-[0.08em]">Breaking</span>
        </span>

        <div className="group relative flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]">
          <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
            <Strip />
            <Strip ariaHidden />
          </div>
        </div>
      </div>
    </div>
  );
}
