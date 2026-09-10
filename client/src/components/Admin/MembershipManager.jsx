import { useCallback, useEffect, useState } from 'react';
import Icon from '../common/Icon';
import { ListSkeleton, Spinner } from '../common/Loader';
import { ErrorState, InlineError } from '../common/States';
import { useToast } from '../common/Toast';
import { useFetch } from '../../hooks/useFetch';
import { membershipApi } from '../../utils/api';

/**
 * The wording on the two membership cards.
 *
 * This is a text editor rather than a pricing tool, because there is nothing
 * to price yet. What Premium includes is still being decided, and the reason
 * it lives in the database is so that deciding it does not need a developer.
 *
 * The Premium button opens an email. It cannot be made to take a payment from
 * here, and nothing in this form pretends otherwise.
 */
export default function MembershipManager() {
  const toast = useToast();

  const fetcher = useCallback(() => membershipApi.get(), []);
  const query = useFetch(fetcher);

  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (query.data?.membership) setForm(structuredClone(query.data.membership));
  }, [query.data]);

  if (query.loading || !form) {
    return <div className="card p-5"><ListSkeleton rows={6} /></div>;
  }
  if (query.error) return <ErrorState message={query.error} onRetry={query.refetch} />;

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const setPlan = (index, patch) =>
    setForm((f) => ({
      ...f,
      plans: f.plans.map((plan, i) => (i === index ? { ...plan, ...patch } : plan)),
    }));

  const setFeature = (planIndex, featureIndex, value) =>
    setPlan(planIndex, {
      features: form.plans[planIndex].features.map((feature, i) =>
        i === featureIndex ? value : feature
      ),
    });

  const addFeature = (planIndex) =>
    setPlan(planIndex, { features: [...form.plans[planIndex].features, ''] });

  const removeFeature = (planIndex, featureIndex) =>
    setPlan(planIndex, {
      features: form.plans[planIndex].features.filter((_, i) => i !== featureIndex),
    });

  const onSave = async () => {
    setError(null);
    setBusy(true);
    try {
      await membershipApi.save({
        ...form,
        plans: form.plans.map((plan) => ({
          ...plan,
          features: plan.features.map((f) => f.trim()).filter(Boolean),
        })),
      });
      toast.success('Saved');
      query.refetch();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="text-headline-md font-bold">Membership</h2>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-fg-muted">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(event) => set({ enabled: event.target.checked })}
          />
          Show the levels on the site
        </label>
      </header>

      <div className="card border-primary/25 bg-primary-soft/30 p-4">
        <p className="flex items-start gap-2.5 text-sm text-fg">
          <Icon name="info" size={18} className="mt-0.5 shrink-0 text-primary" />
          <span>
            No payment is taken anywhere on the site. The Premium button opens an email to you, so
            you have a list of who is interested for when it does open. The member-only lock on
            episodes is real and already working — it is the paying that is not built.
          </span>
        </p>
      </div>

      <div className="card space-y-4 p-5">
        <div>
          <label className="label" htmlFor="mem-heading">Heading</label>
          <input
            id="mem-heading" className="input" value={form.heading}
            onChange={(event) => set({ heading: event.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor="mem-intro">Line underneath</label>
          <textarea
            id="mem-intro" rows={2} className="input resize-y" value={form.intro}
            onChange={(event) => set({ intro: event.target.value })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="mem-email">Where enquiries go</label>
            <input
              id="mem-email" type="email" className="input" value={form.contactEmail}
              onChange={(event) => set({ contactEmail: event.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="mem-foot">Small print</label>
            <input
              id="mem-foot" className="input" value={form.footnote}
              onChange={(event) => set({ footnote: event.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {form.plans.map((plan, planIndex) => (
          <div key={plan.key} className="card space-y-4 p-5">
            <header className="flex items-center gap-3">
              <h3 className="text-headline-sm">{plan.name || 'Level'}</h3>
              <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-fg-muted">
                <input
                  type="checkbox"
                  checked={Boolean(plan.highlighted)}
                  onChange={(event) => setPlan(planIndex, { highlighted: event.target.checked })}
                />
                Highlight
              </label>
            </header>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Name</label>
                <input
                  className="input" value={plan.name}
                  onChange={(event) => setPlan(planIndex, { name: event.target.value })}
                />
              </div>
              <div>
                <label className="label">Price</label>
                <input
                  className="input" value={plan.price}
                  onChange={(event) => setPlan(planIndex, { price: event.target.value })}
                  placeholder="Free / Coming soon"
                />
              </div>
              <div>
                <label className="label">Under the price</label>
                <input
                  className="input" value={plan.priceNote || ''}
                  onChange={(event) => setPlan(planIndex, { priceNote: event.target.value })}
                />
              </div>
              <div>
                <label className="label">Corner badge</label>
                <input
                  className="input" value={plan.badge || ''}
                  onChange={(event) => setPlan(planIndex, { badge: event.target.value })}
                  placeholder="Coming soon"
                />
              </div>
            </div>

            <div>
              <label className="label">One line about it</label>
              <input
                className="input" value={plan.tagline || ''}
                onChange={(event) => setPlan(planIndex, { tagline: event.target.value })}
              />
            </div>

            <div>
              <label className="label">Button</label>
              <input
                className="input" value={plan.cta}
                onChange={(event) => setPlan(planIndex, { cta: event.target.value })}
              />
            </div>

            <div>
              <span className="label">What is included</span>
              <ul className="flex flex-col gap-2">
                {plan.features.map((feature, featureIndex) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <li key={featureIndex} className="flex items-center gap-2">
                    <input
                      className="input flex-1" value={feature}
                      onChange={(event) => setFeature(planIndex, featureIndex, event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeFeature(planIndex, featureIndex)}
                      className="btn-icon hover:text-danger"
                      aria-label="Remove this line"
                    >
                      <Icon name="close" size={17} />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => addFeature(planIndex)}
                className="btn-ghost mt-2 text-sm"
                disabled={plan.features.length >= 10}
              >
                <Icon name="add" size={16} />
                Add a line
              </button>
            </div>
          </div>
        ))}
      </div>

      <InlineError message={error} />

      <button type="button" className="btn-primary" onClick={onSave} disabled={busy}>
        {busy ? <Spinner size={16} /> : <Icon name="save" size={17} />}
        {busy ? 'Saving…' : 'Save'}
      </button>
    </section>
  );
}
