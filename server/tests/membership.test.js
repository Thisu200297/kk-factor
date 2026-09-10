/**
 * The membership cards.
 *
 * The interesting part is not the happy path — it is what happens when the
 * dashboard sends a field it happens not to have. sanitizePlain returns
 * whatever it was given when that is not a string, so `sanitizePlain(x).slice()`
 * on a missing optional field is a 500 rather than a default, and that is
 * exactly how this endpoint first fell over.
 */
const { cleanPlan, DEFAULTS } = require('../controllers/membershipController');

const FREE = DEFAULTS.plans[0];

describe('cleanPlan', () => {
  it('keeps what it was given', () => {
    const plan = cleanPlan(
      {
        key: 'premium',
        name: 'Premium',
        price: 'Coming soon',
        priceNote: 'Not open yet',
        tagline: 'More of it.',
        features: ['Member-only episodes', 'Early access'],
        cta: 'Register your interest',
        badge: 'Soon',
        highlighted: true,
      },
      FREE
    );
    expect(plan.name).toBe('Premium');
    expect(plan.features).toEqual(['Member-only episodes', 'Early access']);
    expect(plan.highlighted).toBe(true);
    expect(plan.badge).toBe('Soon');
  });

  it('survives every optional field being absent', () => {
    const plan = cleanPlan({ name: 'Free' }, FREE);
    expect(plan.name).toBe('Free');
    expect(plan.priceNote).toBe('');
    expect(plan.tagline).toBe('');
    expect(plan.badge).toBeNull();
    expect(plan.price).toBe(FREE.price); // falls back rather than blank
  });

  it('survives being handed nothing at all', () => {
    const plan = cleanPlan(undefined, FREE);
    expect(plan.name).toBe(FREE.name);
    expect(Array.isArray(plan.features)).toBe(true);
  });

  it('survives fields of the wrong type', () => {
    const plan = cleanPlan({ name: 42, features: 'not a list', badge: null }, FREE);
    expect(typeof plan.name).toBe('string');
    expect(Array.isArray(plan.features)).toBe(true);
    expect(plan.badge).toBeNull();
  });

  it('caps the lengths so one long paste cannot break the layout', () => {
    const plan = cleanPlan(
      {
        name: 'x'.repeat(500),
        tagline: 'y'.repeat(500),
        features: Array.from({ length: 40 }, (_, i) => `line ${i} ${'z'.repeat(400)}`),
      },
      FREE
    );
    expect(plan.name.length).toBeLessThanOrEqual(60);
    expect(plan.tagline.length).toBeLessThanOrEqual(160);
    expect(plan.features.length).toBeLessThanOrEqual(10);
    expect(plan.features.every((f) => f.length <= 120)).toBe(true);
  });

  it('drops blank feature lines rather than rendering empty bullets', () => {
    const plan = cleanPlan({ features: ['Real', '', '   ', 'Also real'] }, FREE);
    expect(plan.features).toEqual(['Real', 'Also real']);
  });

  it('strips markup out of what is meant to be plain text', () => {
    const plan = cleanPlan(
      { name: '<script>alert(1)</script>Premium', features: ['<b>Bold</b> claim'] },
      FREE
    );
    expect(plan.name).not.toMatch(/<script/i);
    expect(plan.features[0]).not.toMatch(/<b>/i);
  });
});

describe('the defaults', () => {
  it('never suggests a payment is possible', () => {
    const wording = JSON.stringify(DEFAULTS).toLowerCase();
    for (const word of ['checkout', 'card number', 'pay now', 'subscribe now', '$']) {
      expect(wording).not.toContain(word);
    }
  });

  it('says out loud that Premium is not open', () => {
    expect(DEFAULTS.footnote.toLowerCase()).toContain('not open');
    expect(DEFAULTS.plans.find((p) => p.key === 'premium').price.toLowerCase())
      .toContain('coming soon');
  });
});
