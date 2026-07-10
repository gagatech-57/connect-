import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import BlockedUser from '../models/BlockedUser.js';
import User from '../models/User.js';
import { uploadToCloudinary } from '../services/cloudinaryService.js';
import { emitToRoom } from '../sockets/socketManager.js';

// Helper to check if users have blocked each other
const checkBlockedStatus = async (senderId, conversationId) => {
  const conv = await Conversation.findById(conversationId);
  if (!conv || conv.isGroup) return false;

  const recipientId = conv.participants.find((p) => p.toString() !== senderId.toString());
  if (!recipientId) return false;

  const blockRecord = await BlockedUser.findOne({
    $or: [
      { blocker: senderId, blocked: recipientId },
      { blocker: recipientId, blocked: senderId },
    ],
  });

  return !!blockRecord;
};

// @desc    Get all conversations for the logged in user
// @route   GET /api/messages/conversations
// @access  Private
export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate('participants', 'username fullName avatar bio statusMessage onlineStatus lastSeen')
      .populate({
        path: 'group',
        populate: {
          path: 'members admins creator',
          select: 'username fullName avatar bio onlineStatus',
        },
      })
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username fullName' },
      })
      .sort({ updatedAt: -1 });

    const conversationList = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          sender: { $ne: userId },
          seenBy: { $ne: userId },
          deletedForEveryone: false,
          deletedFor: { $ne: userId },
        });

        const convObj = conv.toObject();
        convObj.unreadCount = unreadCount;
        convObj.isMuted = conv.mutedBy.some((id) => id.toString() === userId.toString());
        convObj.isArchived = conv.archivedBy.some((id) => id.toString() === userId.toString());
        convObj.isPinned = conv.pinnedBy.some((id) => id.toString() === userId.toString());

        return convObj;
      })
    );

    res.status(200).json({ success: true, conversations: conversationList });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
export const sendMessage = async (req, res, next) => {
  const { conversationId, text, replyToId } = req.body;

  try {
    const senderId = req.user._id;

    const isBlocked = await checkBlockedStatus(senderId, conversationId);
    if (isBlocked) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send message. You have blocked this user or they have blocked you.',
      });
    }

    let mediaData = null;

    if (req.file) {
      let fileType = 'document';
      if (req.file.mimetype.startsWith('image/')) fileType = 'image';
      else if (req.file.mimetype.startsWith('video/')) fileType = 'video';
      else if (req.file.mimetype.startsWith('audio/')) fileType = 'audio';

      const result = await uploadToCloudinary(req.file.buffer, 'gaga_connect/chats', fileType);
      
      mediaData = {
        url: result.secure_url,
        type: fileType,
        name: req.file.originalname,
        size: req.file.size,
      };
    }

    if (!text && !mediaData) {
      return res.status(400).json({ success: false, message: 'Message content cannot be empty' });
    }

    const message = new Message({
      conversation: conversationId,
      sender: senderId,
      text: text || '',
      media: mediaData || { url: '', type: '', name: '', size: 0 },
      replyTo: replyToId || null,
      seenBy: [senderId],
      deliveredTo: [senderId],
    });

    await message.save();

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      updatedAt: Date.now(),
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username fullName avatar')
      .populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'username fullName' },
      });

    // Real-Time Socket Event Emit
    emitToRoom(conversationId, 'receiveMessage', populatedMessage);

    res.status(201).json({ success: true, message: populatedMessage });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all messages sent by current user (for test verification)
// @route   GET /api/messages
// @access  Private
export const getAllMessages = async (req, res, next) => {
  try {
    const messages = await Message.find({ sender: req.user._id })
      .populate('sender', 'username fullName avatar')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, messages });
  } catch (error) {
    next(error);
  }
};

// @desc    Get messages in a conversation
// @route   GET /api/messages/:conversationId
// @access  Private
export const getMessages = async (req, res, next) => {
  const { conversationId } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  const skip = parseInt(req.query.skip) || 0;

  try {
    const userId = req.user._id;

    const messages = await Message.find({
      conversation: conversationId,
      deletedFor: { $ne: userId },
    })
      .populate('sender', 'username fullName avatar bio statusMessage onlineStatus')
      .populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'username fullName' },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({
      conversation: conversationId,
      deletedFor: { $ne: userId },
    });

    res.status(200).json({
      success: true,
      messages: messages.reverse(),
      hasMore: skip + limit < total,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Edit a message
// @route   PUT /api/messages/:id
// @access  Private
export const editMessage = async (req, res, next) => {
  const { id } = req.params;
  const { text } = req.body;

  try {
    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Unauthorized edit action' });
    }

    if (message.deletedForEveryone) {
      return res.status(400).json({ success: false, message: 'Cannot edit deleted messages' });
    }

    message.text = text;
    message.isEdited = true;
    await message.save();

    const populated = await Message.findById(message._id)
      .populate('sender', 'username fullName avatar')
      .populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'username fullName' },
      });

    // Broadcast edit in real time
    emitToRoom(message.conversation, 'editMessage', populated);

    res.status(200).json({ success: true, message: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete message (for me or everyone)
// @route   DELETE /api/messages/:id
// @access  Private
export const deleteMessage = async (req, res, next) => {
  const { id } = req.params;
  const { deleteType } = req.query; // 'me' or 'everyone'

  try {
    const userId = req.user._id;
    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (deleteType === 'everyone') {
      if (message.sender.toString() !== userId.toString()) {
        return res.status(401).json({ success: false, message: 'Only sender can delete for everyone' });
      }
      message.deletedForEveryone = true;
      message.text = 'This message was deleted';
      message.media = { url: '', type: '', name: '', size: 0 };
      await message.save();

      // Broadcast delete to room
      emitToRoom(message.conversation, 'deleteMessage', {
        messageId: id,
        deleteType: 'everyone',
        text: message.text,
        media: message.media,
      });
    } else {
      // Delete for me (no socket broadcast needed, just update caller)
      if (!message.deletedFor.includes(userId)) {
        message.deletedFor.push(userId);
        await message.save();
      }
    }

    res.status(200).json({ success: true, messageId: id, deleteType });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle star status on a message
// @route   PUT /api/messages/:id/star
// @access  Private
export const toggleStarMessage = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;

  try {
    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const starredIndex = message.starredBy.indexOf(userId);

    if (starredIndex > -1) {
      message.starredBy.splice(starredIndex, 1);
    } else {
      message.starredBy.push(userId);
    }

    await message.save();

    res.status(200).json({
      success: true,
      messageId: id,
      starred: starredIndex === -1,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle pin status on a message
// @route   PUT /api/messages/:id/pin
// @access  Private
export const togglePinMessage = async (req, res, next) => {
  const { id } = req.params;

  try {
    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    message.pinned = !message.pinned;
    await message.save();

    // Broadcast pin change
    emitToRoom(message.conversation, 'pinMessage', {
      messageId: id,
      pinned: message.pinned,
    });

    res.status(200).json({
      success: true,
      messageId: id,
      pinned: message.pinned,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a reaction to a message
// @route   POST /api/messages/:id/reaction
// @access  Private
export const addReaction = async (req, res, next) => {
  const { id } = req.params;
  const { emoji } = req.body;
  const userId = req.user._id;

  try {
    if (!emoji) {
      return res.status(400).json({ success: false, message: 'Emoji is required' });
    }

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    message.reactions = message.reactions.filter((r) => r.user.toString() !== userId.toString());
    message.reactions.push({ user: userId, emoji });
    await message.save();

    // Broadcast reaction addition
    emitToRoom(message.conversation, 'reactionAdded', {
      messageId: id,
      userId,
      emoji,
      reactions: message.reactions,
    });

    res.status(200).json({
      success: true,
      messageId: id,
      reactions: message.reactions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove a reaction from a message
// @route   DELETE /api/messages/:id/reaction
// @access  Private
export const removeReaction = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;

  try {
    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    message.reactions = message.reactions.filter((r) => r.user.toString() !== userId.toString());
    await message.save();

    // Broadcast reaction removal
    emitToRoom(message.conversation, 'reactionRemoved', {
      messageId: id,
      userId,
      reactions: message.reactions,
    });

    res.status(200).json({
      success: true,
      messageId: id,
      reactions: message.reactions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle mute on a conversation
// @route   PUT /api/messages/conversations/:id/mute
// @access  Private
export const toggleMuteConversation = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;

  try {
    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const mutedIndex = conversation.mutedBy.indexOf(userId);
    if (mutedIndex > -1) {
      conversation.mutedBy.splice(mutedIndex, 1);
    } else {
      conversation.mutedBy.push(userId);
    }
    await conversation.save();

    res.status(200).json({
      success: true,
      conversationId: id,
      isMuted: mutedIndex === -1,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle archive status on a conversation
// @route   PUT /api/messages/conversations/:id/archive
// @access  Private
export const toggleArchiveConversation = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;

  try {
    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const archivedIndex = conversation.archivedBy.indexOf(userId);
    if (archivedIndex > -1) {
      conversation.archivedBy.splice(archivedIndex, 1);
    } else {
      conversation.archivedBy.push(userId);
    }
    await conversation.save();

    res.status(200).json({
      success: true,
      conversationId: id,
      isArchived: archivedIndex === -1,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle pin status on a conversation
// @route   PUT /api/messages/conversations/:id/pin
// @access  Private
export const togglePinConversation = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;

  try {
    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const pinnedIndex = conversation.pinnedBy.indexOf(userId);
    if (pinnedIndex > -1) {
      conversation.pinnedBy.splice(pinnedIndex, 1);
    } else {
      conversation.pinnedBy.push(userId);
    }
    await conversation.save();

    res.status(200).json({
      success: true,
      conversationId: id,
      isPinned: pinnedIndex === -1,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a conversation as read (seen)
// @route   PUT /api/messages/conversations/:id/read
// @access  Private
export const markConversationAsSeen = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;

  try {
    await Message.updateMany(
      {
        conversation: id,
        sender: { $ne: userId },
        seenBy: { $ne: userId },
      },
      {
        $addToSet: { seenBy: userId, deliveredTo: userId },
      }
    );

    // Broadcast read event to room
    emitToRoom(id, 'messageSeen', {
      conversationId: id,
      readerId: userId,
    });

    res.status(200).json({ success: true, conversationId: id });
  } catch (error) {
    next(error);
  }
};
