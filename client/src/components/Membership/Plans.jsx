import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import { useFetch } from '../../hooks/useFetch';
import { useAuth } from '../../hooks/useAuth';
import { membershipApi } from '../../utils/api';

/**
 * The two levels, side by side.
 *
 * NOTHING HERE TAKES MONEY. Premium is not open, and the card says so in three
 * places rather than hiding it in small print: the price reads "Coming soon",
 * there is a badge, and the note underneath spells it out. The button opens an
 * email to Roula. A card that looks like a checkout and is not one is worse
 * than no card, and the client asked for the levels to be *shown* — not sold.
 *
 * The lock behind Premium is real and already enforced on the server: an
 * episode marked for members comes back from the API without its video id for
 * anyone who is not one. What is missing is a way to pay, not a way to check.
 *
 * The wording comes from a setting, so the client can change what Premium
 * includes from the dashboard without any of this being redeployed.
 */
export default function Plans({ className = '' }) {
  const fetcher = useCallback(() => membershipApi.get(), []);
  const { data } = useFetch(fetcher);
  const { user } = useAuth();

  const membership = data?.membership;
  if (!membership?.enabled || !membership.plans?.length) return null;

  return (
    <section className={className} aria-labelledby="membership-heading">
      <header className="mx-auto max-w-prose text-center">
        <p className="text-label-md uppercase text-primary">Membership</p>
        <h2 id="membership-heading" className="mt-2 text-headline-md">
          {membership.heading}
        </h2>
        {membership.intro && (
          <p className="mt-3 text-body-md text-fg-muted">{membership.intro}</p>
        )}
      </header>

      <div className="mx-auto mt-8 grid max-w-3xl gap-5 sm:grid-cols-2">
        {membership.plans.map((plan) => (
          <PlanCard
            key={plan.key}
            plan={plan}
            email={membership.contactEmail}
            currentTier={user?.tier}
            signedIn={Boolean(user)}
          />
        ))}
      </div>

      {membership.footnote && (
        <p className="mx-auto mt-6 max-w-prose text-center text-sm text-fg-subtle">
          {membership.footnote}
        </p>
      )}
    </section>
  );
}

function PlanCard({ plan, email, currentTier, signedIn }) {
  const isCurrent = signedIn && currentTier === plan.key;

  return (
    <article
      className={
        'card relative flex h-full flex-col p-6 ' +
        (plan.highlighted ? 'border-primary/40 bg-primary-soft/30' : '')
      }
    >
      {plan.badge && (
        <span className="absolute right-5 top-5 rounded-full bg-primary px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-wider text-primary-fg">
          {plan.badge}
        </span>
      )}

      <h3 className="text-headline-sm text-fg">{plan.name}</h3>

      {/*
        A level called Free whose price is "Free" would otherwise print the
        word twice, one line under the other, and read as a bug.
      */}
      {plan.price.trim().toLowerCase() !== plan.name.trim().toLowerCase() && (
        <p className="mt-3 text-headline-md text-fg">{plan.price}</p>
      )}
      {plan.priceNote && <p className="mt-1 text-sm text-fg-subtle">{plan.priceNote}</p>}

      {plan.tagline && <p className="mt-3 text-body-md text-fg-muted">{plan.tagline}</p>}

      <ul className="mt-5 flex flex-col gap-2.5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-fg">
            <Icon name="check" size={17} className="mt-0.5 shrink-0 text-primary" />
            {feature}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-6">
        <Action plan={plan} email={email} isCurrent={isCurrent} signedIn={signedIn} />
      </div>
    </article>
  );
}

/**
 * What the button does, which depends on who is reading and on whether the
 * level is open. Never a checkout, because there is nothing to check out.
 */
function Action({ plan, email, isCurrent, signedIn }) {
  if (isCurrent) {
    return (
      <p className="flex items-center justify-center gap-2 rounded-full border border-line py-2.5 text-sm font-medium text-fg-muted">
        <Icon name="check_circle" size={17} className="text-primary" />
        Your current level
      </p>
    );
  }

  if (plan.key === 'free') {
    return signedIn ? (
      <Link to="/account" className="btn-secondary w-full justify-center">
        Your account
      </Link>
    ) : (
      <Link to="/register" className="btn-secondary w-full justify-center">
        {plan.cta}
      </Link>
    );
  }

  const subject = encodeURIComponent(`KK Factor ${plan.name} — register my interest`);
  const body = encodeURIComponent(
    `Hi Roula,\n\nI'd like to know when ${plan.name} opens.\n\nThanks,\n`
  );

  return (
    <a href={`mailto:${email}?subject=${subject}&body=${body}`} className="btn-primary w-full justify-center">
      <Icon name="email" size={17} />
      {plan.cta}
    </a>
  );
}
