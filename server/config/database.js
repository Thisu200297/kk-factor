/**
 * MongoDB connection via Mongoose.
 *
 * The proposal (§7.2) allows either MySQL or MongoDB; this project uses
 * MongoDB. One connection string covers every environment — a local server,
 * a Docker container, or MongoDB Atlas — so moving between them is a change
 * to MONGODB_URI and nothing else.
 */
const mongoose = require('mongoose');
const config = require('./env');

// Reject writes whose fields are not in the schema, rather than silently
// storing them. Without this, a typo in a controller creates a junk field.
mongoose.set('strictQuery', true);

/** Connects, or throws so the caller can decide how to fail. */
async function connectDatabase(uri = config.db.uri) {
  await mongoose.connect(uri, {
    // Fail fast on boot rather than hanging for the 30s default.
    serverSelectionTimeoutMS: config.isTest ? 5000 : 10000,
  });
  return mongoose.connection;
}

async function disconnectDatabase() {
  await mongoose.connection.close();
}

/**
 * Builds every index declared on the schemas. Mongoose does this in the
 * background by default, which hides failures; calling it explicitly means a
 * duplicate-key clash in existing data surfaces at deploy time.
 */
async function syncIndexes() {
  const names = Object.keys(mongoose.models);
  for (const name of names) {
    // eslint-disable-next-line no-await-in-loop
    await mongoose.models[name].createIndexes();
  }
  return names;
}

module.exports = { mongoose, connectDatabase, disconnectDatabase, syncIndexes };
