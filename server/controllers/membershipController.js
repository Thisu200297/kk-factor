const { Setting } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sanitizePlain } = require('../utils/sanitize');

/**
 * The membership levels, as two cards on the site.
 *
 * NOTHING HERE TAKES MONEY, and that is deliberate rather than unfinished.
 * The client asked for the levels to be visible before there is anything to
 * sell, so the Premium card says plainly that it is not open yet and the
 * button opens an email rather than a checkout. A page that looks like it
 * takes payment and does not is worse than no page.
 *
 * The wording lives in a setting rather than in this file because the client
 * has not finished deciding what Premium includes. Putting it in the database
 * means she can change her mind from the dashboard on a Sunday night instead
 * of asking for a deploy.
 *
 * The lock itself is real and already enforced: an episode marked for members
 * has its video id stripped from the API response for anyone who is not one.
 * It is the *selling* of it that is not built.
 */

const KEY = 'membership';

const DEFAULTS = {
  enabled: true,
  heading: 'Listen your way',
  intro: 'Everything on this site is free. Premium is for the extras, and it is not open yet.',
  footnote: 'Premium is not open yet and no payment is taken. Register your interest and I will let you know when it opens.',
  contactEmail: 'Roulakk@thekkfactor.com.au',
  plans: [
    {
      key: 'free',
      name: 'Free',
      price: 'Free',
      priceNote: 'No account needed for most of it',
      tagline: 'The show, the news and the music.',
      features: [
        'Every episode of the show',
        'Greek City Times news, updated through the day',
        'The music player and the radio',
        'Photos and video from events',
      ],
      cta: 'Create an account',
      badge: null,
      highlighted: false,
    },
    {
      key: 'premium',
      name: 'Premium',
      price: 'Coming soon',
      priceNote: 'Not open yet',
      tagline: 'For the listeners who want more of it.',
      features: [
        'Everything in Free',
        'Member-only episodes',
        'Extended interviews',
        'Early access to new episodes',
      ],
      cta: 'Register your interest',
      badge: 'Coming soon',
      highlighted: true,
    },
  ],
};

/**
 * Sanitised text of at most `max` characters.
 *
 * sanitizePlain hands back whatever it was given when that is not a string —
 * undefined for a missing field — so calling .slice on its result directly is
 * a 500 waiting for the first request that omits an optional field.
 */
const text = (value, max) => String(sanitizePlain(value == null ? '' : String(value)) || '').slice(0, max);

/** Keeps a client-supplied plan to the shape and the lengths we render. */
function cleanPlan(plan, fallback) {
  const source = plan && typeof plan === 'object' ? plan : {};
  const features = Array.isArray(source.features) ? source.features : fallback.features;

  return {
    key: text(source.key, 40) || fallback.key,
    name: text(source.name, 60) || fallback.name,
    price: text(source.price, 40) || fallback.price,
    priceNote: text(source.priceNote, 80),
    tagline: text(source.tagline, 160),
    features: features
      .slice(0, 10)
      .map((line) => text(line, 120))
      .filter(Boolean),
    cta: text(source.cta, 40) || fallback.cta,
    badge: text(source.badge, 30) || null,
    highlighted: Boolean(source.highlighted),
  };
}

/** GET /api/membership — public. */
const getMembership = asyncHandler(async (_req, res) => {
  const stored = await Setting.read(KEY);
  return res.json({ success: true, data: { membership: { ...DEFAULTS, ...(stored || {}) } } });
});

/** PUT /api/membership (admin). */
const setMembership = asyncHandler(async (req, res) => {
  const body = req.body || {};

  const plans = Array.isArray(body.plans) ? body.plans : DEFAULTS.plans;
  if (plans.length < 1 || plans.length > 4) {
    throw ApiError.badRequest('There must be between one and four levels.');
  }

  const membership = {
    enabled: body.enabled === undefined ? true : Boolean(body.enabled),
    heading: text(body.heading, 120) || DEFAULTS.heading,
    intro: text(body.intro, 300) || DEFAULTS.intro,
    footnote: text(body.footnote, 300) || DEFAULTS.footnote,
    contactEmail: text(body.contactEmail, 160) || DEFAULTS.contactEmail,
    plans: plans.map((plan, index) => cleanPlan(plan, DEFAULTS.plans[index] || DEFAULTS.plans[0])),
  };

  await Setting.write(KEY, membership, { isPublic: true });
  return res.json({ success: true, data: { membership } });
});

module.exports = { getMembership, setMembership, cleanPlan, DEFAULTS, KEY };
