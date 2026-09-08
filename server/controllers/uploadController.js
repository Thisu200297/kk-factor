const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { publicUrl } = require('../middleware/upload');

/** POST /api/uploads/image (admin) — used by the article cover picker. */
const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No image file received (field name: "image")');
  return res.status(201).json({
    success: true,
    data: {
      url: await publicUrl(req.file),
      filename: req.file.filename || req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    },
  });
});

/** POST /api/uploads/audio (admin) — standalone audio upload. */
const uploadAudio = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No audio file received (field name: "audio")');
  return res.status(201).json({
    success: true,
    data: {
      url: await publicUrl(req.file),
      filename: req.file.filename || req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    },
  });
});

module.exports = { uploadImage, uploadAudio };
