import { useCallback, useState } from 'react';
import Icon from '../common/Icon';
import Modal from '../common/Modal';
import { useFetch } from '../../hooks/useFetch';
import { partnersApi } from '../../utils/api';
import { mediaUrl } from '../../utils/constants';

/**
 * "Proudly supported by" — the strip across the top of the site.
 *
 * The brief is that every sponsor is visible on the main page at all times,
 * and that there may be ten to twenty of them. Those two together rule out a
 * carousel (only some are showing at any moment), so this is a wrapping grid
 * of small tiles: on a wide screen twenty fit in two rows without scrolling.
 *
 * On a phone twenty tiles would be seven stacked rows and would push the
 * whole site below the fold, so there it becomes one swipeable row instead —
 * the same content, reachable with a thumb.
 */

const EMPTY_SLOTS = 3;

/** Grey by default, full colour on hover: a supporter wall, not an ad break. */
const TILE =
  'flex h-[74px] w-[148px] shrink-0 items-center justify-center rounded-lg border ' +
  'border-line bg-white p-2.5 transition duration-300 ease-apple ' +
  'grayscale hover:grayscale-0 hover:border-primary/40 hover:shadow-soft ' +
  'focus-visible:grayscale-0';

export default function SponsorStrip() {
  const fetcher = useCallback(() => partnersApi.list('sponsor'), []);
  const { data, loading } = useFetch(fetcher);

  /** A sponsor with no website shows its phone and email instead. */
  const [contact, setContact] = useState(null);

  const sponsors = data?.items || [];

  const open = (sponsor) => {
    partnersApi.registerClick(sponsor.id);
    if (sponsor.website_url) {
      window.open(sponsor.website_url, '_blank', 'noopener,noreferrer');
    } else {
      setContact(sponsor);
    }
  };

  return (
    <section className="border-b border-line bg-surface" aria-label="Our sponsors">
      <div className="container-page py-5">
        <div className="mb-4 flex items-center gap-4">
          <span className="h-px flex-1 bg-line" />
          <h2 className="text-label-md uppercase text-fg-muted">Proudly supported by</h2>
          <span className="h-px flex-1 bg-line" />
        </div>

        {loading ? (
          <div className="flex justify-center gap-3.5">
            {[0, 1, 2, 3, 4].map((key) => (
              <div key={key} className="skeleton h-[74px] w-[148px] rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            {/* Wide screens: everything visible, wrapping into rows. */}
            <div className="hidden flex-wrap justify-center gap-3.5 sm:flex">
              {sponsors.map((sponsor) => (
                <button
                  key={sponsor.id}
                  type="button"
                  onClick={() => open(sponsor)}
                  className={TILE}
                  title={sponsor.name}
                  aria-label={
                    sponsor.website_url ? `Visit ${sponsor.name}` : `Contact details for ${sponsor.name}`
                  }
                >
                  <SponsorMark sponsor={sponsor} />
                </button>
              ))}
              {Array.from({ length: EMPTY_SLOTS }).map((_, index) => (
                // eslint-disable-next-line react/no-array-index-key
                <EmptySlot key={index} />
              ))}
            </div>

            {/* Phones: one swipeable row rather than seven stacked ones. */}
            <div className="no-scrollbar -mx-gutter flex gap-2.5 overflow-x-auto px-gutter sm:hidden">
              {sponsors.map((sponsor) => (
                <button
                  key={sponsor.id}
                  type="button"
                  onClick={() => open(sponsor)}
                  className={`${TILE} !h-[62px] !w-[122px] !p-2 grayscale-0`}
                  aria-label={sponsor.name}
                >
                  <SponsorMark sponsor={sponsor} />
                </button>
              ))}
              {Array.from({ length: EMPTY_SLOTS }).map((_, index) => (
                // eslint-disable-next-line react/no-array-index-key
                <EmptySlot key={index} compact />
              ))}
            </div>
          </>
        )}

        <p className="mt-3.5 text-center text-xs text-fg-muted">
          Room for more —{' '}
          <a href="/contact" className="font-medium text-primary hover:underline">
            become a KK Factor partner
          </a>
        </p>
      </div>

      <Modal
        open={Boolean(contact)}
        onClose={() => setContact(null)}
        title={contact?.name || ''}
        size="sm"
      >
        <div className="space-y-4">
          {contact?.logo_url && (
            <div className="flex h-24 items-center justify-center rounded-xl border border-line bg-white p-4">
              <img
                src={mediaUrl(contact.logo_url)}
                alt=""
                className="max-h-full max-w-full object-contain"
              />
            </div>
          )}
          {contact?.description && <p className="text-sm text-fg-muted">{contact.description}</p>}

          <div className="flex flex-col gap-2">
            {contact?.phone && (
              <a href={`tel:${contact.phone.replace(/\s+/g, '')}`} className="btn-secondary justify-start">
                <Icon name="headphones" size={18} />
                {contact.phone}
              </a>
            )}
            {contact?.email && (
              <a href={`mailto:${contact.email}`} className="btn-secondary justify-start">
                <Icon name="email" size={18} />
                {contact.email}
              </a>
            )}
          </div>
        </div>
      </Modal>
    </section>
  );
}

/** The logo, or the sponsor's name set in type when no file has arrived yet. */
function SponsorMark({ sponsor }) {
  if (sponsor.logo_url) {
    return (
      <img
        src={mediaUrl(sponsor.logo_url)}
        alt={sponsor.name}
        loading="lazy"
        className="max-h-full max-w-full object-contain"
      />
    );
  }
  return (
    <span className="px-1 text-center text-[0.6875rem] font-semibold leading-tight text-fg">
      {sponsor.name}
    </span>
  );
}

function EmptySlot({ compact = false }) {
  return (
    <a
      href="/contact"
      className={
        'flex shrink-0 items-center justify-center rounded-lg border border-dashed border-line-strong ' +
        'bg-primary-soft/50 text-center text-[0.625rem] font-semibold uppercase tracking-[0.14em] ' +
        'text-fg-subtle transition-colors hover:border-primary hover:text-primary ' +
        (compact ? 'h-[62px] w-[122px]' : 'h-[74px] w-[148px]')
      }
    >
      Your logo
      <br />
      here
    </a>
  );
}
