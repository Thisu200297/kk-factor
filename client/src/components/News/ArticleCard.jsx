import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import CoverImage from '../common/CoverImage';
import { formatRelative } from '../../utils/format';
import { mediaUrl } from '../../utils/constants';

/**
 * @param {'default'|'compact'|'wide'} variant
 *  default — small tile for the dense grid
 *  compact — single row with a thumbnail, for rails and secondary lists
 *  wide    — image beside the text, for feature rows
 */
export default function ArticleCard({ article, variant = 'default' }) {
  if (!article) return null;

  const image = mediaUrl(article.image_url);
  const seed = article.slug || article.id;
  const external = isExternal(article);

  if (variant === 'compact') {
    return (
      <Open
        article={article}
        className="group flex items-center gap-3 rounded-xl p-1.5 transition-colors duration-200 hover:bg-fill/[0.04]"
      >
        <CoverImage src={image} seed={seed} rounded="rounded-lg" className="h-14 w-14 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 block text-[0.8125rem] font-medium leading-snug text-fg transition-colors group-hover:text-primary">
            {article.title}
          </span>
          <span className="mt-1 flex items-center gap-1 text-[0.6875rem] text-fg-subtle">
            {article.category?.name} · {formatRelative(article.published_at)}
            {external && <Icon name="open_in_new" size={11} className="opacity-70" />}
          </span>
        </span>
      </Open>
    );
  }

  if (variant === 'wide') {
    return (
      <article className="card-interactive sheen group flex overflow-hidden">
        <Open article={article} className="w-2/5 shrink-0">
          <CoverImage src={image} seed={seed} className="h-full min-h-[128px]" />
        </Open>
        <div className="flex min-w-0 flex-1 flex-col p-3.5">
          {article.category && <span className="badge-category mb-1.5 w-fit">{article.category.name}</span>}
          <h3 className="line-clamp-2 text-headline-sm text-fg transition-colors group-hover:text-primary">
            <Open article={article}>{article.title}</Open>
          </h3>
          <p className="mt-auto flex items-center gap-1.5 pt-2 text-[0.6875rem] text-fg-subtle">
            {formatRelative(article.published_at)}
            {external && <Source article={article} />}
          </p>
        </div>
      </article>
    );
  }

  return (
    <article className="card-interactive sheen group flex flex-col overflow-hidden">
      <Open article={article} className="relative block" ariaLabel={article.title}>
        <CoverImage src={image} seed={seed} className="aspect-[16/10] w-full" />
        {article.is_breaking && (
          <span className="badge absolute left-2 top-2 bg-live text-white shadow-soft">
            <span className="h-1 w-1 rounded-full bg-white animate-pulse-live" />
            Live
          </span>
        )}
      </Open>

      <div className="flex flex-1 flex-col p-3">
        {article.category && (
          <Link
            to={`/news/${article.category.slug}`}
            className="mb-1.5 w-fit text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-primary"
          >
            {article.category.name}
          </Link>
        )}

        <h3 className="text-[0.9375rem] font-semibold leading-[1.3] tracking-[-0.012em] text-fg">
          <Open article={article} className="line-clamp-2 transition-colors group-hover:text-primary">
            {article.title}
          </Open>
        </h3>

        <div className="mt-auto flex items-center gap-2 pt-2.5 text-[0.6875rem] text-fg-subtle">
          <time dateTime={article.published_at}>{formatRelative(article.published_at)}</time>
          {external ? (
            <span className="ml-auto"><Source article={article} /></span>
          ) : (
            Number(article.views) > 0 && (
              <span className="ml-auto flex items-center gap-1">
                <Icon name="visibility" size={12} />
                {article.views}
              </span>
            )
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * A story we imported and hold only a teaser of.
 *
 * Not the same question as "did we import it". Once the publisher has given
 * permission and the whole article is stored, an imported story opens here
 * like any other — with their credit and a link to the original on it. It is
 * only the teaser that has to send the reader away, because a page here would
 * show them two paragraphs and a dead end.
 */
function isExternal(article) {
  return Boolean(article.is_external && article.source_url && !article.is_full_text);
}

/**
 * Opens the story wherever it actually lives.
 *
 * An imported headline goes to the publisher who wrote it — we hold their
 * excerpt, not their article, so sending a reader to a page here would show
 * them two paragraphs and a dead end. Anything written for this site opens
 * here. The decision comes from the record itself, so both can sit in the same
 * grid and each behaves correctly.
 */
function Open({ article, className, children, ariaLabel }) {
  if (isExternal(article)) {
    return (
      <a
        href={article.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        aria-label={ariaLabel}
      >
        {children}
      </a>
    );
  }

  return (
    <Link to={`/article/${article.slug}`} className={className} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}

/** Credits the publisher on the card, so the link out is never a surprise. */
function Source({ article }) {
  return (
    <span className="flex items-center gap-1 truncate">
      <Icon name="open_in_new" size={11} className="opacity-70" />
      {article.source_name}
    </span>
  );
}
