import { useCallback, useState } from 'react';
import Icon from '../components/common/Icon';
import Modal from '../components/common/Modal';
import { GridSkeleton } from '../components/common/Loader';
import { ErrorState } from '../components/common/States';
import { useFetch } from '../hooks/useFetch';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { partnersApi } from '../utils/api';
import { mediaUrl } from '../utils/constants';

/**
 * Sponsors & partners — the page the strip at the top links into.
 *
 * The strip is a row of small marks with no room to say who anybody is. This
 * page gives each one a card, and gives the three open slots somewhere to
 * point: a business that clicks "become a partner" arrives at a page that
 * shows the company it would be keeping, which is the actual sales pitch.
 */
export default function SponsorsPartners() {
  useDocumentTitle('Sponsors & partners');

  const fetchSponsors = useCallback(() => partnersApi.list('sponsor'), []);
  const fetchOrgs = useCallback(() => partnersApi.list('organisation'), []);

  const sponsors = useFetch(fetchSponsors);
  const orgs = useFetch(fetchOrgs);

  const [contact, setContact] = useState(null);

  return (
    <div className="container-page py-9 md:py-12">
      <header className="mx-auto max-w-prose text-center">
        <p className="text-label-md uppercase text-primary">Proudly supported by</p>
        <h1 className="mt-3 text-headline-lg">Sponsors &amp; partners</h1>
        <p className="mt-4 text-body-lg text-fg-muted">
          The businesses and organisations behind The KK Factor. Please support the people who
          support the show.
        </p>
      </header>

      <section className="mt-11" aria-labelledby="sponsors-heading">
        <h2 id="sponsors-heading" className="mb-5 text-headline-md">
          Our sponsors
        </h2>

        {sponsors.loading ? (
          <GridSkeleton count={4} columns={3} />
        ) : sponsors.error ? (
          <ErrorState message={sponsors.error} onRetry={sponsors.refetch} />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(sponsors.data?.items || []).map((sponsor) => (
              <li key={sponsor.id}>
                <PartnerCard partner={sponsor} onContact={setContact} />
              </li>
            ))}

            <li>
              <a
                href="/contact#partner"
                className="flex h-full min-h-[190px] flex-col items-center justify-center gap-2 rounded-panel border border-dashed border-line-strong bg-primary-soft/40 p-6 text-center transition-colors hover:border-primary"
              >
                <Icon name="add" size={26} className="text-primary" />
                <span className="text-headline-sm text-fg">Become a KK Factor partner</span>
                <span className="text-[0.8125rem] text-fg-muted">
                  Three spots are open across the top of every page.
                </span>
              </a>
            </li>
          </ul>
        )}
      </section>

      <section className="mt-14" aria-labelledby="orgs-heading">
        <h2 id="orgs-heading" className="mb-2 text-headline-md">
          Organisations I support
        </h2>
        <p className="mb-5 max-w-prose text-sm text-fg-muted">
          Not sponsors — these are the community organisations Roula stands behind.
        </p>

        {orgs.loading ? (
          <GridSkeleton count={3} columns={3} />
        ) : orgs.error ? (
          <ErrorState message={orgs.error} onRetry={orgs.refetch} />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(orgs.data?.items || []).map((org) => (
              <li key={org.id}>
                <PartnerCard partner={org} onContact={setContact} muted />
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={Boolean(contact)}
        onClose={() => setContact(null)}
        title={contact?.name || ''}
        size="sm"
      >
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
          {!contact?.phone && !contact?.email && (
            <p className="text-sm text-fg-muted">Contact details coming soon.</p>
          )}
        </div>
      </Modal>
    </div>
  );
}

function PartnerCard({ partner, onContact, muted = false }) {
  const inner = (
    <>
      <span className="flex h-24 items-center justify-center rounded-xl border border-line bg-white p-4">
        {partner.logo_url ? (
          <img
            src={mediaUrl(partner.logo_url)}
            alt={partner.name}
            loading="lazy"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-center text-sm font-semibold text-fg-muted">{partner.name}</span>
        )}
      </span>

      <span className="mt-4 block text-headline-sm text-fg">{partner.name}</span>
      {partner.description && (
        <span className="mt-1.5 block text-[0.8125rem] text-fg-muted">{partner.description}</span>
      )}

      <span className="mt-auto flex items-center gap-1.5 pt-4 text-[0.8125rem] font-medium text-primary">
        {partner.website_url ? 'Visit their site' : 'Contact details'}
        <Icon name={partner.website_url ? 'open_in_new' : 'chevron_right'} size={14} />
      </span>
    </>
  );

  const className = `card-interactive sheen group flex h-full flex-col p-5 ${muted ? '' : ''}`;

  if (partner.website_url) {
    return (
      <a
        href={partner.website_url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => partnersApi.registerClick(partner.id)}
        className={className}
      >
        {inner}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        partnersApi.registerClick(partner.id);
        onContact(partner);
      }}
      className={`${className} text-left`}
    >
      {inner}
    </button>
  );
}
