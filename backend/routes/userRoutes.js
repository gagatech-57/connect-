import express from 'express';
import { getProfile, updateProfile, updateAvatar, searchUsers } from '../controllers/userController.js';
import { protect, requireEmailVerified } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Apply authorization check to all user routes
router.use(protect);
router.use(requireEmailVerified);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/avatar', upload.single('avatar'), updateAvatar);
router.get('/search', searchUsers);

export default router;
