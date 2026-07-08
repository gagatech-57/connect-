import express from 'express';
import {
  getConversations,
  sendMessage,
  getMessages,
  editMessage,
  deleteMessage,
  toggleStarMessage,
  togglePinMessage,
  addReaction,
  removeReaction,
  toggleMuteConversation,
  toggleArchiveConversation,
  togglePinConversation,
  markConversationAsSeen,
} from '../controllers/messageController.js';
import { protect, requireEmailVerified } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.use(protect);
router.use(requireEmailVerified);

router.get('/conversations', getConversations);
router.post('/', upload.single('media'), sendMessage);
router.get('/:conversationId', getMessages);
router.put('/:id', editMessage);
router.delete('/:id', deleteMessage);
router.put('/:id/star', toggleStarMessage);
router.put('/:id/pin', togglePinMessage);
router.post('/:id/reaction', addReaction);
router.delete('/:id/reaction', removeReaction);

// Conversation management
router.put('/conversations/:id/mute', toggleMuteConversation);
router.put('/conversations/:id/archive', toggleArchiveConversation);
router.put('/conversations/:id/pin', togglePinConversation);
router.put('/conversations/:id/read', markConversationAsSeen);

export default router;
