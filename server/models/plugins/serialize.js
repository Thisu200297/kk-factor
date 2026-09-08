/**
 * Mongoose plugin that keeps the JSON shape identical to what the API
 * returned under the previous SQL implementation: a string `id` field, no
 * `_id`, no `__v`. The React client, the tests and API.md therefore did not
 * have to change when the database did.
 */
module.exports = function serialize(schema) {
  const transform = (_doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    delete ret.password_hash;
    return ret;
  };

  schema.set('toJSON', { virtuals: true, versionKey: false, transform });
  schema.set('toObject', { virtuals: true, versionKey: false, transform });
};
