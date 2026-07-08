import express from 'express';
import {
  createGroup,
  updateGroupDetails,
  addMembers,
  removeMember,
  promoteToAdmin,
  demoteAdmin,
  leaveGroup,
  updateGroupPermissions,
  deleteGroup,
} from '../controllers/groupController.js';
import { protect, requireEmailVerified } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.use(protect);
router.use(requireEmailVerified);

router.post('/', upload.single('avatar'), createGroup);
router.put('/:id', upload.single('avatar'), updateGroupDetails);
router.post('/:id/members', addMembers);
router.delete('/:id/members', removeMember);
router.put('/:id/admin/promote', promoteToAdmin);
router.put('/:id/admin/demote', demoteAdmin);
router.delete('/:id/leave', leaveGroup);
router.put('/:id/permissions', updateGroupPermissions);
router.delete('/:id', deleteGroup);

export default router;
