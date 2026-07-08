import express from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearNotifications,
} from '../controllers/notificationController.js';
import { protect, requireEmailVerified } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(requireEmailVerified);

router.get('/', getNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);
router.delete('/', clearNotifications);
router.delete('/:id', deleteNotification);

export default router;
