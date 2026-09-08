const express = require('express');
const ctrl = require('../controllers/uploadController');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimiter');
const { uploadImage, uploadAudio } = require('../middleware/upload');

const router = express.Router();

router.use(requireAuth, requireAdmin, writeLimiter);

router.post('/image', uploadImage.single('image'), ctrl.uploadImage);
router.post('/audio', uploadAudio.single('audio'), ctrl.uploadAudio);

module.exports = router;
