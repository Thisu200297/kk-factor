/**
 * Fills in the sponsors and the "Organisations I support" panel.
 *
 *   npm run db:partners
 *
 * Idempotent — matched on name, so running it again updates rather than
 * duplicating, and never overwrites a logo an editor has since replaced from
 * the dashboard.
 *
 * The logo files are copied into server/uploads/images by hand from the
 * client's own folder. Three organisations have no logo file yet; they are
 * seeded without one and the site shows their initials in a dashed circle
 * until the file arrives.
 */
const { connectDatabase, disconnectDatabase, Partner } = require('../models');

const SPONSORS = [
  {
    name: 'Gavos Freight Solutions',
    website_url: 'https://gfs.net.au/',
    logo_url: '/uploads/images/partner-gavos.png',
  },
  {
    name: 'Poultry N More',
    website_url: 'https://poultrynmore.com.au/',
    logo_url: '/uploads/images/partner-poultry.png',
  },
  {
    name: 'Meat Me Souvlakeri',
    website_url: 'https://www.meatmesouvlakeri.com.au/',
    logo_url: '/uploads/images/partner-meatme.jpg',
  },
  {
    name: 'Moray & Agnew Lawyers',
    website_url: 'https://www.moray.com.au/',
    logo_url: '/uploads/images/partner-moray.jpg',
  },
  {
    // No website. Clicking the logo opens a contact card instead — the phone
    // number and email go in from the dashboard once Roula sends them.
    name: 'PRM Painting',
    website_url: null,
    logo_url: '/uploads/images/partner-prm.png',
    description: 'Contact details to come.',
  },
];

const ORGANISATIONS = [
  {
    name: 'The Greek Centre',
    website_url: 'https://www.greekcommunity.com.au/greek-centre',
    logo_url: '/uploads/images/partner-greekcentre.png',
  },
  {
    name: 'The Greek Community of Melbourne',
    website_url: 'https://www.greekcommunity.com.au/',
    logo_url: '/uploads/images/partner-gcm.png',
  },
  { name: 'Hellenic Medical Society of Australia', website_url: 'https://hmsa.org.au/', logo_url: null },
  { name: 'Greek Australian Society', website_url: 'https://gas.org.au/', logo_url: null },
  { name: 'RPP FM 98.7', website_url: 'https://www.rppfm.com.au/', logo_url: null },
];

async function upsert(list, kind) {
  let created = 0;
  let updated = 0;

  for (const [index, spec] of list.entries()) {
    const existing = await Partner.findOne({ name: spec.name, kind });

    if (!existing) {
      await Partner.create({ ...spec, kind, display_order: index, is_active: true });
      created += 1;
    } else {
      existing.website_url = spec.website_url;
      existing.display_order = index;
      // Only fill a logo in — never replace one somebody uploaded since.
      if (spec.logo_url && !existing.logo_url) existing.logo_url = spec.logo_url;
      if (spec.description && !existing.description) existing.description = spec.description;
      await existing.save();
      updated += 1;
    }
  }

  return { created, updated };
}

(async () => {
  try {
    await connectDatabase();

    const s = await upsert(SPONSORS, 'sponsor');
    const o = await upsert(ORGANISATIONS, 'organisation');

    // eslint-disable-next-line no-console
    console.log(`\n[partners] Sponsors: ${s.created} added, ${s.updated} updated`);
    // eslint-disable-next-line no-console
    console.log(`[partners] Organisations: ${o.created} added, ${o.updated} updated`);

    const missing = await Partner.find({ logo_url: null }).select('name');
    if (missing.length) {
      // eslint-disable-next-line no-console
      console.log(`[partners] Still waiting on logos: ${missing.map((m) => m.name).join(', ')}\n`);
    }

    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[partners] Failed:', error.message);
    process.exit(1);
  }
})();
