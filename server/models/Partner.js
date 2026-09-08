const mongoose = require('mongoose');
const serialize = require('./plugins/serialize');

/**
 * Sponsors and the "Organisations I support" panel are the same shape — a name,
 * a logo, somewhere to click through to, and an order the editor controls — so
 * they share one collection and are told apart by `kind`. Two models would have
 * meant two identical controllers and two identical admin screens.
 */
const partnerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 150,
    },
    kind: {
      type: String,
      enum: ['sponsor', 'organisation'],
      default: 'sponsor',
      index: true,
    },
    logo_url: { type: String, default: null },

    /**
     * Optional on purpose. PRM Painting has no website, and the brief is that
     * clicking its logo should surface a phone number and an email instead —
     * so a partner may carry a link, or contact details, or both.
     */
    website_url: { type: String, default: null },
    phone: { type: String, default: null, trim: true, maxlength: 40 },
    email: { type: String, default: null, trim: true, lowercase: true, maxlength: 160 },

    description: { type: String, default: null, maxlength: 300 },

    /** Left-to-right order in the strip, and top-to-bottom in the sidebar. */
    display_order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true, index: true },

    /**
     * Sponsors pay for the placement, so they will eventually ask what they got
     * for it. Counting here costs one indexed increment and means the answer
     * exists whenever they ask.
     */
    clicks: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Drives every listing: the active sponsors, in order.
partnerSchema.index({ kind: 1, is_active: 1, display_order: 1 });

/** True when the logo should open a contact card rather than a link. */
partnerSchema.virtual('is_contact_only').get(function isContactOnly() {
  return !this.website_url && Boolean(this.phone || this.email);
});

partnerSchema.plugin(serialize);

module.exports = mongoose.model('Partner', partnerSchema);
