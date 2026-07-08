import FriendRequest from '../models/FriendRequest.js';
import BlockedUser from '../models/BlockedUser.js';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Report from '../models/Report.js';
import { emitToUser } from '../sockets/socketManager.js';

// @desc    Send a friend request
// @route   POST /api/friends/request
// @access  Private
export const sendFriendRequest = async (req, res, next) => {
  const { recipientId } = req.body;

  try {
    if (req.user._id.toString() === recipientId) {
      return res.status(400).json({ success: false, message: 'You cannot add yourself' });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const blockedCheck = await BlockedUser.findOne({
      $or: [
        { blocker: req.user._id, blocked: recipientId },
        { blocker: recipientId, blocked: req.user._id },
      ],
    });

    if (blockedCheck) {
      return res.status(400).json({ success: false, message: 'Unable to send friend request' });
    }

    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: req.user._id, recipient: recipientId },
        { sender: recipientId, recipient: req.user._id },
      ],
    });

    if (existingRequest) {
      if (existingRequest.status === 'accepted') {
        return res.status(400).json({ success: false, message: 'You are already friends' });
      }
      return res.status(400).json({ success: false, message: 'Friend request already pending' });
    }

    const newRequest = new FriendRequest({
      sender: req.user._id,
      recipient: recipientId,
      status: 'pending',
    });

    await newRequest.save();

    const populatedRequest = await FriendRequest.findById(newRequest._id).populate(
      'sender',
      'username fullName avatar bio statusMessage onlineStatus'
    );

    // Emit real-time notification to the receiver
    emitToUser(recipientId, 'friendRequestReceived', populatedRequest);

    res.status(201).json({
      success: true,
      message: 'Friend request sent successfully',
      request: populatedRequest,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Accept a friend request
// @route   PUT /api/friends/request/:id/accept
// @access  Private
export const acceptFriendRequest = async (req, res, next) => {
  const { id } = req.params;

  try {
    const friendRequest = await FriendRequest.findById(id);

    if (!friendRequest) {
      return res.status(404).json({ success: false, message: 'Friend request not found' });
    }

    if (friendRequest.recipient.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Unauthorized action' });
    }

    friendRequest.status = 'accepted';
    await friendRequest.save();

    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [friendRequest.sender, friendRequest.recipient] },
    });

    if (!conversation) {
      conversation = new Conversation({
        isGroup: false,
        participants: [friendRequest.sender, friendRequest.recipient],
      });
      await conversation.save();
    }

    // Populate conversation for real-time display on both sides
    const populatedConversation = await Conversation.findById(conversation._id)
      .populate('participants', 'username fullName avatar bio statusMessage onlineStatus lastSeen')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username fullName' },
      });

    // Notify the request sender that request has been accepted
    emitToUser(friendRequest.sender, 'friendRequestAccepted', {
      requestId: id,
      conversation: populatedConversation,
    });

    res.status(200).json({
      success: true,
      message: 'Friend request accepted',
      conversation: populatedConversation,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject/Cancel a friend request
// @route   DELETE /api/friends/request/:id
// @access  Private
export const rejectFriendRequest = async (req, res, next) => {
  const { id } = req.params;

  try {
    const friendRequest = await FriendRequest.findById(id);

    if (!friendRequest) {
      return res.status(404).json({ success: false, message: 'Friend request not found' });
    }

    if (
      friendRequest.sender.toString() !== req.user._id.toString() &&
      friendRequest.recipient.toString() !== req.user._id.toString()
    ) {
      return res.status(401).json({ success: false, message: 'Unauthorized action' });
    }

    const senderId = friendRequest.sender.toString();
    const recipientId = friendRequest.recipient.toString();

    await FriendRequest.findByIdAndDelete(id);

    // Notify other side of request deletion/rejection
    const targetNotify = req.user._id.toString() === senderId ? recipientId : senderId;
    emitToUser(targetNotify, 'friendRequestCancelled', { requestId: id });

    res.status(200).json({
      success: true,
      message: 'Friend request removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all friends (accepted friend requests)
// @route   GET /api/friends
// @access  Private
export const getFriends = async (req, res, next) => {
  try {
    const friendRequests = await FriendRequest.find({
      status: 'accepted',
      $or: [{ sender: req.user._id }, { recipient: req.user._id }],
    }).populate('sender recipient', 'username fullName avatar bio statusMessage onlineStatus lastSeen');

    const friends = friendRequests.map((reqItem) => {
      const isSender = reqItem.sender._id.toString() === req.user._id.toString();
      return isSender ? reqItem.recipient : reqItem.sender;
    });

    res.status(200).json({ success: true, friends });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending friend requests
// @route   GET /api/friends/pending
// @access  Private
export const getPendingRequests = async (req, res, next) => {
  try {
    const received = await FriendRequest.find({
      recipient: req.user._id,
      status: 'pending',
    }).populate('sender', 'username fullName avatar bio statusMessage onlineStatus lastSeen');

    const sent = await FriendRequest.find({
      sender: req.user._id,
      status: 'pending',
    }).populate('recipient', 'username fullName avatar bio statusMessage onlineStatus lastSeen');

    res.status(200).json({ success: true, pending: { received, sent } });
  } catch (error) {
    next(error);
  }
};

// @desc    Block a user
// @route   POST /api/friends/block
// @access  Private
export const blockUser = async (req, res, next) => {
  const { userIdToBlock } = req.body;

  try {
    if (req.user._id.toString() === userIdToBlock) {
      return res.status(400).json({ success: false, message: 'You cannot block yourself' });
    }

    const checkUser = await User.findById(userIdToBlock);
    if (!checkUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await BlockedUser.findOneAndUpdate(
      { blocker: req.user._id, blocked: userIdToBlock },
      { blocker: req.user._id, blocked: userIdToBlock },
      { upsert: true, new: true }
    );

    await FriendRequest.findOneAndDelete({
      $or: [
        { sender: req.user._id, recipient: userIdToBlock },
        { sender: userIdToBlock, recipient: req.user._id },
      ],
    });

    // Notify blocked user to clean up friend state or active chat with the blocker
    emitToUser(userIdToBlock, 'userBlockedBy', { blockerId: req.user._id });

    res.status(200).json({ success: true, message: 'User blocked successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Unblock a user
// @route   POST /api/friends/unblock
// @access  Private
export const unblockUser = async (req, res, next) => {
  const { userIdToUnblock } = req.body;

  try {
    const blockRecord = await BlockedUser.findOneAndDelete({
      blocker: req.user._id,
      blocked: userIdToUnblock,
    });

    if (!blockRecord) {
      return res.status(400).json({ success: false, message: 'User is not blocked' });
    }

    // Notify user they are unblocked
    emitToUser(userIdToUnblock, 'userUnblockedBy', { blockerId: req.user._id });

    res.status(200).json({ success: true, message: 'User unblocked successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get blocked users list
// @route   GET /api/friends/blocked
// @access  Private
export const getBlockedUsers = async (req, res, next) => {
  try {
    const list = await BlockedUser.find({ blocker: req.user._id }).populate(
      'blocked',
      'username fullName avatar bio statusMessage'
    );
    const blocked = list.map((item) => item.blocked);
    res.status(200).json({ success: true, blocked });
  } catch (error) {
    next(error);
  }
};

// @desc    Report a user
// @route   POST /api/friends/report
// @access  Private
export const reportUser = async (req, res, next) => {
  const { reportedUserId, reason, messageReference } = req.body;

  try {
    const reportedUser = await User.findById(reportedUserId);
    if (!reportedUser) {
      return res.status(404).json({ success: false, message: 'User to report not found' });
    }

    const report = new Report({
      reporter: req.user._id,
      reportedUser: reportedUserId,
      reason,
      messageReference: messageReference || null,
    });

    await report.save();

    res.status(201).json({ success: true, message: 'User reported successfully' });
  } catch (error) {
    next(error);
  }
};
