import Icon from '../components/common/Icon';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

/**
 * Contact, and the sponsorship enquiry the sponsor strip points at.
 *
 * There is no form here on purpose. A form needs somewhere to send the mail
 * from, which means an email service and a monthly bill, and an enquiry from a
 * business wanting to sponsor should land in her inbox where she can reply
 * from her own address. A mailto with the subject already filled in does that
 * for nothing.
 */

const EMAIL = 'Roulakk@thekkfactor.com.au';

export default function Contact() {
  useDocumentTitle('Contact');

  return (
    <div className="container-page py-9 md:py-12">
      <header className="mx-auto max-w-prose text-center">
        <h1 className="text-headline-lg">Get in touch</h1>
        <p className="mt-3 text-body-lg text-fg-muted">
          For interviews, MC work, events, or to talk about sponsoring the show.
        </p>
      </header>

      <div className="mx-auto mt-9 grid max-w-4xl gap-5 sm:grid-cols-2">
        <Card
          icon="email"
          title="Email Roula"
          body="The quickest way to reach me. I read everything myself."
          action={{ href: `mailto:${EMAIL}`, label: EMAIL }}
        />

        <Card
          id="partner"
          icon="label"
          title="Become a KK Factor partner"
          body="Three sponsor spots are open across the top of every page. Tell me about your business and I will send you the details."
          action={{
            href: `mailto:${EMAIL}?subject=${encodeURIComponent('KK Factor sponsorship enquiry')}`,
            label: 'Enquire about sponsorship',
          }}
          accent
        />

        <Card
          icon="radio"
          title="On air"
          body="THE KK FACTOR — The Greek Eurobeat Show, on RPP FM 98.7 and 98.3."
          action={{ href: 'https://www.rppfm.com.au/', label: 'RPP FM', external: true }}
        />

        <Card
          icon="open_in_new"
          title="Follow along"
          body="Facebook, Instagram, TikTok, LinkedIn and YouTube — all linked from the home page."
          action={{ href: 'https://www.youtube.com/@RoulaKrikellis', label: 'YouTube channel', external: true }}
        />
      </div>
    </div>
  );
}

function Card({ id, icon, title, body, action, accent = false }) {
  return (
    <section
      id={id}
      className={
        'card flex flex-col gap-3 p-6 ' + (accent ? 'border-primary/30 bg-primary-soft/40' : '')
      }
    >
      <span
        className={
          'flex h-11 w-11 items-center justify-center rounded-xl ' +
          (accent ? 'bg-primary text-primary-fg' : 'bg-surface-3 text-primary')
        }
      >
        <Icon name={icon} size={21} />
      </span>

      <h2 className="text-headline-sm">{title}</h2>
      <p className="text-sm text-fg-muted">{body}</p>

      <a
        href={action.href}
        {...(action.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className={'mt-auto pt-2 ' + (accent ? 'btn-primary w-fit' : 'font-medium text-primary hover:underline')}
      >
        {action.label}
      </a>
    </section>
  );
}
