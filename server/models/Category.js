const mongoose = require('mongoose');
const serialize = require('./plugins/serialize');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
      maxlength: 80,
    },
    slug: { type: String, required: true, unique: true, trim: true, maxlength: 100 },
    description: { type: String, default: null, maxlength: 400 },
    /** Controls left-to-right order of the category tabs in the client. */
    display_order: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

categorySchema.plugin(serialize);

module.exports = mongoose.model('Category', categorySchema);
