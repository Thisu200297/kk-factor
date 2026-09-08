import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../common/Icon';
import { Spinner } from '../common/Loader';
import { useDebounce } from '../../hooks/useDebounce';
import { articlesApi } from '../../utils/api';
import { formatRelative, classNames } from '../../utils/format';

/**
 * Debounced live search. Results drop down after 350ms of quiet; Enter opens
 * the full results page. Queries under two characters are never sent — the
 * API rejects them anyway.
 */
export default function SearchBar({ className = '', onNavigate, autoFocus = false, compact = false }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const debounced = useDebounce(query, 350);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const term = debounced.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    articlesApi
      .search(term, { limit: 6 })
      .then((data) => {
        if (cancelled) return;
        setResults(data.items);
        setOpen(true);
        setHighlight(-1);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debounced]);

  useEffect(() => {
    const onClickAway = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, []);

  const goToResults = () => {
    const term = query.trim();
    if (term.length < 2) return;
    setOpen(false);
    onNavigate?.();
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (highlight >= 0 && results[highlight]) {
        setOpen(false);
        onNavigate?.();
        navigate(`/article/${results[highlight].slug}`);
      } else {
        goToResults();
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((h) => Math.max(h - 1, -1));
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={classNames('relative', className)}>
      <div className="relative">
        <Icon
          name="search"
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          placeholder="Search"
          aria-label="Search articles"
          role="combobox"
          aria-expanded={open}
          aria-controls="search-results"
          className={classNames(
            'input pl-9 pr-9',
            compact && 'rounded-full bg-surface-2 py-1.5 text-[0.8125rem] shadow-none'
          )}
        />
        {loading && <Spinner size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary" />}
      </div>

      {open && query.trim().length >= 2 && (
        <div
          id="search-results"
          role="listbox"
          className="glass absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] min-w-[280px] overflow-y-auto rounded-panel border p-1.5 shadow-pop"
        >
          {results.length === 0 && !loading && (
            <p className="px-3 py-5 text-center text-[0.8125rem] text-fg-muted">
              No stories match “{query.trim()}”.
            </p>
          )}

          {results.map((article, index) => (
            <Link
              key={article.id}
              to={`/article/${article.slug}`}
              role="option"
              aria-selected={index === highlight}
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
              className={classNames(
                'block rounded-xl px-2.5 py-2 transition-colors',
                index === highlight ? 'bg-fill/[0.07]' : 'hover:bg-fill/[0.05]'
              )}
            >
              <p className="line-clamp-2 text-[0.8125rem] font-medium text-fg">{article.title}</p>
              <p className="mt-0.5 text-[0.6875rem] text-fg-subtle">
                {article.category?.name} · {formatRelative(article.published_at)}
              </p>
            </Link>
          ))}

          {results.length > 0 && (
            <button
              type="button"
              onClick={goToResults}
              className="mt-0.5 w-full rounded-xl px-2.5 py-2 text-left text-[0.8125rem] font-semibold text-primary hover:bg-fill/[0.05]"
            >
              See all results
            </button>
          )}
        </div>
      )}
    </div>
  );
}
