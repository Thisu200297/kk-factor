const { body, param } = require('express-validator');

const trackRules = [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Track title is required'),
  body('artist').optional().trim().isLength({ max: 200 }),
  body('album').optional({ values: 'falsy' }).trim().isLength({ max: 200 }),
  body('genre').optional({ values: 'falsy' }).trim().isLength({ max: 80 }),
  body('duration').optional().isInt({ min: 0, max: 86400 }).toInt(),
];

const playlistRules = [
  body('name').trim().isLength({ min: 1, max: 150 }).withMessage('Playlist name is required'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 400 }),
  body('isPublic').optional().isBoolean().toBoolean(),
  body('trackIds').optional().isArray().withMessage('trackIds must be an array'),
  body('trackIds.*').optional().isMongoId().withMessage('Each track id must be valid'),
];

const streamRules = [
  body('name').trim().isLength({ min: 1, max: 150 }).withMessage('Station name is required'),
  body('streamUrl').trim().isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Stream URL must be a valid http(s) URL'),
  body('genre').optional({ values: 'falsy' }).trim().isLength({ max: 80 }),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 400 }),
  body('logoUrl').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
  body('metadataUrl').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
  body('isLive').optional().isBoolean().toBoolean(),
];

const idRule = [param('id').isMongoId().withMessage('Invalid id')];

module.exports = { trackRules, playlistRules, streamRules, idRule };
