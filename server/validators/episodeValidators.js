const { body, param } = require('express-validator');

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

const createRules = [
  body('title').trim().isLength({ min: 2, max: 300 }).withMessage('An episode title is required'),
  body('youtubeId').optional({ values: 'falsy' }).trim().matches(YT_ID).withMessage('That is not a YouTube video id'),
  body('videoUrl').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
  body('audioUrl').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
  body('thumbnailUrl').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 5000 }),
  body('duration').optional().isInt({ min: 0, max: 86400 }).toInt(),
  body('publishedAt').optional({ values: 'falsy' }).isISO8601().withMessage('Use a real date'),
  body('status').optional().isIn(['published', 'hidden']),
  body('tier').optional().isIn(['normal', 'premium']),
  body('isFeatured').optional().isBoolean().toBoolean(),
  // An episode nobody can play is not an episode.
  body().custom((_value, { req }) => {
    if (req.body.youtubeId || req.body.videoUrl || req.body.audioUrl) return true;
    throw new Error('Give a YouTube video or an uploaded audio file');
  }),
];

const updateRules = [
  param('id').isMongoId().withMessage('Invalid episode id'),
  body('title').optional().trim().isLength({ min: 2, max: 300 }),
  body('videoUrl').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
  body('audioUrl').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
  body('thumbnailUrl').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 5000 }),
  body('duration').optional().isInt({ min: 0, max: 86400 }).toInt(),
  body('publishedAt').optional({ values: 'falsy' }).isISO8601(),
  body('status').optional().isIn(['published', 'hidden']),
  body('tier').optional().isIn(['normal', 'premium']),
  body('isFeatured').optional().isBoolean().toBoolean(),
];

const liveRules = [
  body('isLive').isBoolean().withMessage('isLive must be true or false').toBoolean(),
  body('title').optional({ values: 'falsy' }).trim().isLength({ max: 200 }),
  body('video').optional({ values: 'falsy' }).trim().isLength({ max: 300 }),
  body('siteUrl').optional({ values: 'falsy' }).trim().isLength({ max: 300 }),
];

const idRule = [param('id').isMongoId().withMessage('Invalid episode id')];

module.exports = { createRules, updateRules, liveRules, idRule };
