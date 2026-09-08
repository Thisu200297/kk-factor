import { Link } from 'react-router-dom';
import Icon from '../components/common/Icon';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

/**
 * About Roula.
 *
 * The copy here is hers, from the brief; the biography paragraph itself has
 * not arrived yet, so that block is marked as waiting rather than filled with
 * invented life story.
 */

const ROLES = ['Radio host', 'Interviewer', 'MC', 'Community advocate', 'Media personality'];

export default function About() {
  useDocumentTitle('About Roula');

  return (
    <div className="container-page py-9 md:py-12">
      <header className="mx-auto max-w-prose text-center">
        <p className="text-label-md uppercase text-primary">Welcome to my world</p>
        <h1 className="mt-3 text-headline-lg">The voice behind The KK Factor</h1>
        <p className="mt-5 text-body-lg text-fg-muted">
          I&rsquo;m Roula Krikellis, creator and host of THE KK FACTOR — The Greek Eurobeat Show.
          A little Greek. A little Australian. A lot of music, conversation, community and
          connection.
        </p>
        <p className="mt-4 text-body-lg text-fg-muted">
          From radio and live interviews to festivals, MC work and community stories, THE KK FACTOR
          is about giving people a voice, celebrating culture and keeping the conversation going.
        </p>
      </header>

      <div className="mt-11 grid gap-9 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="relative flex min-h-[380px] items-center justify-center overflow-hidden rounded-panel border border-line bg-surface">
          <span
            className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-primary/15 blur-3xl"
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

        <div className="flex flex-col gap-7">
          <div>
            <h2 className="text-headline-md">From the studio to the stage</h2>
            <p className="mt-2 text-fg-muted">
              From community stories to conversations that matter.
            </p>
          </div>

          <ul className="flex flex-wrap gap-2">
            {ROLES.map((role) => (
              <li
                key={role}
                className="rounded-full border border-line bg-surface px-4 py-2 text-[0.8125rem] font-medium text-fg"
              >
                {role}
              </li>
            ))}
          </ul>

          <div className="rounded-panel border border-dashed border-line-strong bg-surface-2 p-6">
            <p className="text-sm font-semibold text-fg">Biography</p>
            <p className="mt-2 text-sm text-fg-muted">
              Roula&rsquo;s own words go here — a few paragraphs on how the show started, the
              community work, and what she is doing now. Waiting on her copy.
            </p>
          </div>

          <div className="rounded-panel border border-line bg-surface p-6">
            <h3 className="text-headline-sm">On air</h3>
            <p className="mt-2 text-sm text-fg-muted">
              THE KK FACTOR — The Greek Eurobeat Show broadcasts on RPP FM 98.7 and 98.3, and
              streams live on YouTube. Every episode is kept on this site afterwards.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <Link to="/show" className="btn-primary">
                <Icon name="play_arrow" size={18} filled />
                Listen to the show
              </Link>
              <Link to="/contact" className="btn-secondary">
                <Icon name="email" size={17} />
                Get in touch
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
