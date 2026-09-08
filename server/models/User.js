const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const config = require('../config/env');
const serialize = require('./plugins/serialize');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [120, 'Name cannot exceed 120 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'A valid email address is required'],
    },
    password_hash: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },

    /**
     * Membership level, separate from `role` on purpose.
     *
     * `role` is about the dashboard — who may publish. `tier` is about the
     * front of the site — who may play an episode marked premium. Keeping them
     * apart means a paying listener never becomes an editor, and an editor
     * never has to be given a membership to do their job.
     *
     * There is no payment system behind this yet: an admin sets it by hand from
     * the Users screen. When one is added, it sets this field and nothing else
     * has to change.
     */
    tier: { type: String, enum: ['normal', 'premium'], default: 'normal', index: true },

    avatar_url: { type: String, default: null },
    /** Bumped on logout-all / role change to invalidate live refresh tokens. */
    token_version: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

userSchema.plugin(serialize);

/** Hashes a plaintext password with bcrypt (saltRounds: 12). */
userSchema.statics.hashPassword = (plain) => bcrypt.hash(plain, config.bcryptSaltRounds);

userSchema.methods.verifyPassword = function verifyPassword(plain) {
  if (!this.password_hash) return Promise.resolve(false);
  return bcrypt.compare(plain, this.password_hash);
};

/** Safe projection for API responses — never leaks the hash. */
userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: String(this._id),
    name: this.name,
    email: this.email,
    role: this.role,
    tier: this.tier,
    avatarUrl: this.avatar_url,
    isActive: this.is_active,
    createdAt: this.created_at,
  };
};

module.exports = mongoose.model('User', userSchema);
