import { useState } from 'react';
import { classNames } from '../../utils/format';

/**
 * Six muted duotones. Which one an item gets is derived from its seed, so a
 * given article always renders the same colour — the grid looks intentional
 * rather than random, and it stays stable across reloads.
 */
const PALETTES = [
  ['#5C7CBF', '#7E6FC4'],
  ['#C2726B', '#B96A88'],
  ['#4E9A8C', '#4C7FAE'],
  ['#C2905A', '#B87160'],
  ['#7E6FC4', '#9C6BAE'],
  ['#5A93B5', '#4E75A8'],
];

function seedIndex(seed) {
  const text = String(seed ?? '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash % PALETTES.length;
}

/**
 * Image with a graceful fallback.
 *
 * Articles frequently have no cover art, and an uploaded file can go missing.
 * Either case would leave a large empty rectangle, so both fall back to a
 * generated duotone with the KK mark — the layout keeps its rhythm and the
 * page never shows a broken-image glyph.
 */
export default function CoverImage({
  src,
  alt = '',
  seed,
  className = '',
  imgClassName = '',
  rounded = '',
  zoomOnHover = true,
  eager = false,
  label,
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  const [from, to] = PALETTES[seedIndex(seed ?? alt ?? src)];

  return (
    <div className={classNames('relative overflow-hidden bg-surface-2', rounded, className)}>
      {showImage ? (
        <img
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : undefined}
          onError={() => setFailed(true)}
          className={classNames(
            'h-full w-full object-cover',
            zoomOnHover && 'transition-transform duration-500 ease-apple group-hover:scale-[1.04]',
            imgClassName
          )}
        />
      ) : (
        <div
          aria-hidden="true"
          className="relative flex h-full w-full items-center justify-center"
          style={{
            backgroundImage:
              `linear-gradient(160deg, ${from} 0%, ${to} 100%)`,
          }}
        >
          {/* Mid-tone duotones read as too bright against a dark page, so the
              same swatch is deepened rather than kept at two palettes. */}
          <span className="absolute inset-0 hidden bg-black/30 dark:block" />
          {/* Faint wordmark so the tile reads as branded, not broken. */}
          <span className="flex items-end gap-[3px] opacity-20" style={{ height: '20%' }}>
            <span className="w-[7%] min-w-[3px] rounded-full bg-white" style={{ height: '45%' }} />
            <span className="w-[7%] min-w-[3px] rounded-full bg-white" style={{ height: '100%' }} />
            <span className="w-[7%] min-w-[3px] rounded-full bg-white" style={{ height: '70%' }} />
            <span className="w-[7%] min-w-[3px] rounded-full bg-white" style={{ height: '35%' }} />
          </span>

          {label && (
            <span className="absolute bottom-2 left-2.5 text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-white/70">
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
