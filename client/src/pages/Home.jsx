import { Link } from 'react-router-dom';
import SponsorStrip from '../components/Sponsors/SponsorStrip';
import OrganisationsPanel from '../components/Sponsors/OrganisationsPanel';
import LiveBanner from '../components/Show/LiveBanner';
import ShowSection from '../components/Show/ShowSection';
import CommunityNews from '../components/News/CommunityNews';
import Icon from '../components/common/Icon';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

/**
 * The KK Factor home page.
 *
 * Built to Roula's own layout — sponsors across the top, her wordmark and
 * portrait, the organisations she supports and the news feed down the right,
 * her socials, then the heritage band — with one thing added that her mockup
 * had no room for: the show. That band is the only dark part of the page, so
 * the studio reads as a different room without needing a separate site.
 */

const SOCIALS = [
  { label: 'Facebook', handle: 'Roula Krikellis', href: 'https://www.facebook.com/roula.krikelliskkrockchic', icon: 'facebook' },
  { label: 'Facebook page', handle: 'The KK Factor', href: 'https://www.facebook.com/TheKkFactor/', icon: 'facebook' },
  { label: 'Instagram', handle: '@kkrockchic', href: 'https://www.instagram.com/kkrockchic/?hl=en', icon: 'instagram' },
  { label: 'TikTok', handle: '@thekkfactor', href: 'https://www.tiktok.com/@thekkfactor', icon: 'tiktok' },
  { label: 'LinkedIn', handle: 'Roula Krikellis', href: 'https://www.linkedin.com/in/roula-krikellis-26961945/', icon: 'linkedin' },
  { label: 'YouTube', handle: '@RoulaKrikellis', href: 'https://www.youtube.com/@RoulaKrikellis', icon: 'youtube', accent: true },
];

const CREED = [
  'Proud of my heritage.',
  'Passionate about my people.',
  'Committed to making a difference.',
];

export default function Home() {
  useDocumentTitle();

  return (
    <>
      <SponsorStrip />
      <LiveBanner />

      {/* Hero */}
      <div className="container-page grid gap-10 py-10 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)_minmax(0,340px)] lg:py-12">
        <div className="flex flex-col gap-5">
          <Wordmark />

          <span className="h-px bg-line" />

          <div>
            <p className="text-headline-md">Entertainer. MC. Presenter.</p>
            <p className="text-headline-md text-primary">Voice of our community.</p>
          </div>

          <p className="max-w-[300px] font-display text-lg italic leading-relaxed text-fg-muted">
            Connecting communities through culture, media, events and advocacy.
          </p>

          <div className="flex flex-wrap gap-2.5">
            <Link to="/show" className="btn-primary">
              <Icon name="play_arrow" size={18} filled />
              Listen to the show
            </Link>
            <Link to="/about" className="btn-secondary">
              About Roula
            </Link>
          </div>
        </div>

        <Portrait />

        <aside className="flex flex-col gap-8">
          <OrganisationsPanel />
          <CommunityNews limit={3} />
        </aside>
      </div>

      {/* Socials */}
      <div className="container-page pb-9">
        <div className="mb-5 flex items-center gap-4">
          <span className="h-px flex-1 bg-line" />
          <h2 className="text-label-md uppercase text-fg-muted">Follow the KK Factor</h2>
          <span className="h-px flex-1 bg-line" />
        </div>

        <ul className="flex flex-wrap justify-center gap-x-8 gap-y-6 sm:gap-x-12">
          {SOCIALS.map((social) => (
            <li key={social.label}>
              <a
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex w-[120px] flex-col items-center gap-2.5 text-center"
              >
                <span
                  className={
                    'flex h-13 w-13 items-center justify-center rounded-full border p-3.5 transition-colors duration-200 ' +
                    (social.accent
                      ? 'border-primary text-primary'
                      : 'border-line-strong text-fg group-hover:border-primary group-hover:text-primary')
                  }
                >
                  <SocialGlyph name={social.icon} />
                </span>
                <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-fg-muted">
                  {social.label}
                </span>
                <span className="-mt-1.5 text-xs text-fg">{social.handle}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* Heritage band */}
      <div className="bg-primary text-primary-fg">
        <div className="container-page flex flex-wrap items-center justify-center gap-x-8 gap-y-1.5 py-3.5 text-center">
          {CREED.map((line, index) => (
            <span key={line} className="flex items-center gap-8">
              {index > 0 && <span className="hidden opacity-50 sm:inline" aria-hidden="true">&bull;</span>}
              <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em]">{line}</span>
            </span>
          ))}
        </div>
      </div>

      <ShowSection limit={4} />
    </>
  );
}

/**
 * The wordmark, set in type.
 *
 * A placeholder for her real KK artwork, which has not arrived yet — it is
 * deliberately close to the proportions of the logo in her own mockup so that
 * dropping the real file in later does not move anything around it.
 */
function Wordmark() {
  return (
    <div>
      <p className="font-display text-[7rem] font-extrabold leading-[0.82] tracking-[-0.06em] text-fg">
        K<span className="text-primary">K</span>
      </p>
      <p className="-mt-4 ml-[5.5rem] font-display text-4xl italic text-primary">Rock Chic</p>
      <p className="mt-2 text-sm font-bold tracking-[0.06em] text-accent">The KK Factor</p>
    </div>
  );
}

/**
 * The portrait slot.
 *
 * She has not sent a photograph yet, so this renders the brush-stroke field
 * from her own artwork with the mark centred — a composed placeholder rather
 * than a grey box, and one <img> away from being the real thing.
 */
function Portrait() {
  return (
    <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-panel border border-line bg-surface">
      <span
        className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-primary/15 blur-3xl"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute -bottom-20 -left-16 h-72 w-72 rounded-full bg-accent/12 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative flex flex-col items-center gap-3 px-8 text-center">
        <span className="equaliser text-primary" aria-hidden="true">
          <span /><span /><span /><span />
        </span>
        <p className="font-display text-2xl italic text-fg-muted">Roula Krikellis</p>
        <p className="text-label-md uppercase text-fg-subtle">Photograph to come</p>
      </div>
    </div>
  );
}

/**
 * Simple outline marks rather than the platforms' own logos — they scale, they
 * take the page's colours, and they are ours to change.
 */
function SocialGlyph({ name }) {
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, 'aria-hidden': true };

  if (name === 'instagram') {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="16" height="16" rx="4.6" />
        <circle cx="12" cy="12" r="3.6" />
        <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (name === 'tiktok') {
    return (
      <svg {...common}>
        <circle cx="9" cy="17" r="3.4" />
        <path d="M12.4 17V4.4c.9 2.4 2.6 3.7 5.2 3.9" />
      </svg>
    );
  }
  if (name === 'linkedin') {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="16" height="16" rx="2.4" />
        <path d="M8 10.6V16" />
        <circle cx="8" cy="8" r="0.9" fill="currentColor" stroke="none" />
        <path d="M12 16v-3.2c0-1.3.9-2.2 2-2.2s2 .9 2 2.2V16M12 10.6V16" />
      </svg>
    );
  }
  if (name === 'youtube') {
    return (
      <svg {...common}>
        <rect x="3" y="6" width="18" height="12" rx="3.4" />
        <path d="M10.6 9.6l4.4 2.4-4.4 2.4z" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M14 8h2.5V4.6h-2.9C11 4.6 9.8 6 9.8 8.3V10H7.4v3.4h2.4V21h3.5v-7.6h2.6l.5-3.4h-3.1V8.6c0-.4.3-.6.7-.6z" />
    </svg>
  );
}
