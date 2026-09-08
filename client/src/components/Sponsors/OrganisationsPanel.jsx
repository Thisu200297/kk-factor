import { useCallback } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { partnersApi } from '../../utils/api';
import { mediaUrl } from '../../utils/constants';

/**
 * "Organisations I support" — the sidebar list.
 *
 * Same data as the sponsor strip, filtered to `kind: organisation`. These are
 * bodies she stands behind rather than businesses paying for a placement, so
 * they are listed by name with a small mark, never greyed out, and never
 * shown as an advertisement.
 *
 * An organisation whose logo file has not arrived yet gets its initials in a
 * dashed circle: obviously a gap, and obviously deliberate.
 */
export default function OrganisationsPanel() {
  const fetcher = useCallback(() => partnersApi.list('organisation'), []);
  const { data, loading } = useFetch(fetcher);

  const items = data?.items || [];

  if (!loading && items.length === 0) return null;

  return (
    <section aria-labelledby="orgs-heading">
      <div className="mb-3.5 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <h2 id="orgs-heading" className="text-label-md uppercase text-fg-muted">
          Organisations I support
        </h2>
        <span className="h-px flex-1 bg-line" />
      </div>

      {loading ? (
        <div className="space-y-3 py-1">
          {[0, 1, 2, 3, 4].map((key) => (
            <div key={key} className="flex items-center gap-3.5">
              <div className="skeleton h-10 w-10 rounded-full" />
              <div className="skeleton h-3 flex-1" />
            </div>
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((org) => (
            <li key={org.id}>
              <OrgRow org={org} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function OrgRow({ org }) {
  const inner = (
    <>
      {org.logo_url ? (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-white p-1">
          <img
            src={mediaUrl(org.logo_url)}
            alt=""
            loading="lazy"
            className="max-h-full max-w-full object-contain"
          />
        </span>
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-dashed border-line-strong bg-primary-soft/40 text-[0.625rem] font-bold text-fg-subtle">
          {initials(org.name)}
        </span>
      )}
      <span className="min-w-0 text-[0.8125rem] font-medium leading-snug text-fg">{org.name}</span>
    </>
  );

  const className =
    'group -mx-1.5 flex items-center gap-3.5 rounded-lg px-1.5 py-2.5 transition-colors hover:bg-fill/[0.04]';

  if (!org.website_url) {
    return <div className={className}>{inner}</div>;
  }

  return (
    <a
      href={org.website_url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => partnersApi.registerClick(org.id)}
      className={className}
    >
      {inner}
    </a>
  );
}

/** "Greek Australian Society" -> "GAS", "RPP FM 98.7" -> "RF". */
function initials(name) {
  const words = String(name)
    .replace(/[^A-Za-z\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1 && !/^(the|of|and|for)$/i.test(word));
  return words.slice(0, 4).map((word) => word[0].toUpperCase()).join('') || '?';
}
