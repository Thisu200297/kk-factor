import { Link } from 'react-router-dom';
import CoverImage from '../common/CoverImage';
import { formatRelative, readingTime } from '../../utils/format';
import { mediaUrl } from '../../utils/constants';

/** The lead story: image with the headline laid over a soft scrim. */
export default function HeroFeature({ article }) {
  if (!article) return null;

  const image = mediaUrl(article.image_url);

  return (
    <article className="group relative overflow-hidden rounded-panel border border-line shadow-lift">
      <CoverImage
        src={image}
        seed={article.slug || article.id}
        eager
        className="aspect-[16/10] w-full sm:aspect-[16/9]"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 lg:p-7">
        <div className="max-w-2xl">
          <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
            {article.category && (
              <Link
                to={`/news/${article.category.slug}`}
                className="badge bg-white/15 text-white backdrop-blur-md"
              >
                {article.category.name}
              </Link>
            )}
            {article.is_breaking && (
              <span className="badge bg-live text-white">
                <span className="h-1 w-1 rounded-full bg-white animate-pulse-live" />
                Breaking
              </span>
            )}
          </div>

          <h2 className="text-headline-lg text-balance text-white">
            <Link to={`/article/${article.slug}`} className="transition-opacity hover:opacity-85">
              {article.title}
            </Link>
          </h2>

          {article.excerpt && (
            <p className="mt-2 line-clamp-2 max-w-xl text-[0.875rem] text-white/70">
              {article.excerpt}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.6875rem] text-white/55">
            <span>{article.author?.name}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={article.published_at}>{formatRelative(article.published_at)}</time>
            <span aria-hidden="true">·</span>
            <span>{readingTime(article.content || article.excerpt)} min read</span>
          </div>
        </div>
      </div>
    </article>
  );
}
