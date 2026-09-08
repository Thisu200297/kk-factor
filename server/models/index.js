const { mongoose, connectDatabase, disconnectDatabase, syncIndexes } = require('../config/database');

const User = require('./User');
const Category = require('./Category');
const Article = require('./Article');
const Track = require('./Track');
const Playlist = require('./Playlist');
const RadioStream = require('./RadioStream');
const Partner = require('./Partner');
const Episode = require('./Episode');
const Setting = require('./Setting');
const MediaItem = require('./MediaItem');

/**
 * Relationships, for reference — MongoDB does not enforce these, so the rules
 * that foreign keys used to guarantee are applied in the controllers:
 *
 *   User      1—N  Article        (author_id)      delete blocked while authored
 *   Category  1—N  Article        (category_id)    delete blocked while in use
 *   User      1—N  Track          (uploaded_by)    detached on delete
 *   User      1—N  Playlist       (created_by)     detached on delete
 *   Playlist  N—N  Track          (track_ids[])    order is the array order
 *   RadioStream                   standalone
 *   Partner                       standalone — sponsors and the organisations
 *                                 panel, told apart by `kind`
 *   Episode                       standalone — the show archive; rows with a
 *                                 youtube_id are owned by the importer and are
 *                                 refreshed, not duplicated, on every run
 *   Setting                       standalone key/value (the live banner)
 *   MediaItem                     standalone - the gallery; a video is a
 *                                 YouTube id, never an uploaded file
 */

module.exports = {
  mongoose,
  connectDatabase,
  disconnectDatabase,
  syncIndexes,
  User,
  Category,
  Article,
  Track,
  Playlist,
  RadioStream,
  Partner,
  Episode,
  Setting,
  MediaItem,
};
