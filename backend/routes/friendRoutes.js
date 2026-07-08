import express from 'express';
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  getPendingRequests,
  blockUser,
  unblockUser,
  getBlockedUsers,
  reportUser,
} from '../controllers/friendController.js';
import { protect, requireEmailVerified } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(requireEmailVerified);

router.get('/', getFriends);
router.post('/request', sendFriendRequest);
router.put('/request/:id/accept', acceptFriendRequest);
router.delete('/request/:id', rejectFriendRequest);
router.get('/pending', getPendingRequests);
router.post('/block', blockUser);
router.post('/unblock', unblockUser);
router.get('/blocked', getBlockedUsers);
router.post('/report', reportUser);

export default router;
