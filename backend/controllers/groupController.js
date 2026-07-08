import Group from '../models/Group.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { uploadToCloudinary } from '../services/cloudinaryService.js';

// @desc    Create a new group chat
// @route   POST /api/groups
// @access  Private
export const createGroup = async (req, res, next) => {
  const { name, description, memberIds } = req.body;

  try {
    if (!name) {
      return res.status(400).json({ success: false, message: 'Group name is required' });
    }

    const creatorId = req.user._id;
    // Group members must include the creator
    const members = Array.from(new Set([creatorId.toString(), ...(memberIds || [])]));

    // 1. Create the Conversation first (group reference will be set next)
    const conversation = new Conversation({
      isGroup: true,
      participants: members,
    });
    await conversation.save();

    // 2. Create the Group
    const group = new Group({
      name,
      description: description || '',
      creator: creatorId,
      admins: [creatorId],
      members: members,
      conversation: conversation._id,
    });

    // Handle group avatar if uploaded
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, 'gaga_connect/groups', 'image');
      group.avatar = uploadResult.secure_url;
    }

    await group.save();

    // 3. Link Group back to Conversation
    conversation.group = group._id;
    await conversation.save();

    // 4. Create system message announcing group creation
    const sysMsg = new Message({
      conversation: conversation._id,
      sender: creatorId,
      text: `${req.user.fullName} created the group "${name}"`,
      seenBy: [creatorId],
      deliveredTo: [creatorId],
    });
    await sysMsg.save();

    conversation.lastMessage = sysMsg._id;
    await conversation.save();

    // Return populated conversation
    const populatedConv = await Conversation.findById(conversation._id)
      .populate('participants', 'username fullName avatar bio onlineStatus')
      .populate({
        path: 'group',
        populate: { path: 'members admins creator', select: 'username fullName avatar bio' },
      })
      .populate('lastMessage');

    res.status(201).json({ success: true, conversation: populatedConv });
  } catch (error) {
    next(error);
  }
};

// @desc    Update group metadata (name, description, avatar)
// @route   PUT /api/groups/:id
// @access  Private
export const updateGroupDetails = async (req, res, next) => {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Check permissions: only admins if onlyAdminsCanEditGroup is enabled
    const isAdmin = group.admins.includes(req.user._id);
    if (group.permissions.onlyAdminsCanEditGroup && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only admins can modify group details' });
    }

    // Check if user is a member
    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group' });
    }

    if (name) group.name = name;
    if (description !== undefined) group.description = description;

    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, 'gaga_connect/groups', 'image');
      group.avatar = uploadResult.secure_url;
    }

    await group.save();

    // Create system message
    const sysMsg = new Message({
      conversation: group.conversation,
      sender: req.user._id,
      text: `${req.user.fullName} updated group settings`,
      seenBy: [req.user._id],
    });
    await sysMsg.save();

    await Conversation.findByIdAndUpdate(group.conversation, { lastMessage: sysMsg._id });

    const populatedGroup = await Group.findById(group._id)
      .populate('members admins creator', 'username fullName avatar bio onlineStatus');

    res.status(200).json({ success: true, group: populatedGroup });
  } catch (error) {
    next(error);
  }
};

// @desc    Add members to group
// @route   POST /api/groups/:id/members
// @access  Private
export const addMembers = async (req, res, next) => {
  const { id } = req.params;
  const { memberIds } = req.body; // array of User IDs

  try {
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const isAdmin = group.admins.includes(req.user._id);
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Only admins can add members' });
    }

    // Filter out existing members
    const newMembers = memberIds.filter((userId) => !group.members.includes(userId));
    if (newMembers.length === 0) {
      return res.status(400).json({ success: false, message: 'All users are already group members' });
    }

    // Add to group list
    group.members.push(...newMembers);
    await group.save();

    // Add to conversation participants
    await Conversation.findByIdAndUpdate(group.conversation, {
      $addToSet: { participants: { $each: newMembers } },
    });

    // Create system message
    const users = await User.find({ _id: { $in: newMembers } });
    const userNames = users.map((u) => u.fullName).join(', ');
    const sysMsg = new Message({
      conversation: group.conversation,
      sender: req.user._id,
      text: `${req.user.fullName} added ${userNames} to the group`,
      seenBy: [req.user._id],
    });
    await sysMsg.save();

    await Conversation.findByIdAndUpdate(group.conversation, { lastMessage: sysMsg._id });

    const populatedGroup = await Group.findById(group._id)
      .populate('members admins creator', 'username fullName avatar bio onlineStatus');

    res.status(200).json({ success: true, group: populatedGroup });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove members from group
// @route   DELETE /api/groups/:id/members
// @access  Private
export const removeMember = async (req, res, next) => {
  const { id } = req.params;
  const { userIdToRemove } = req.body;

  try {
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const isAdmin = group.admins.includes(req.user._id);
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Only admins can remove members' });
    }

    if (group.creator.toString() === userIdToRemove) {
      return res.status(400).json({ success: false, message: 'Creator cannot be removed' });
    }

    // Remove from member and admin arrays
    group.members = group.members.filter((m) => m.toString() !== userIdToRemove);
    group.admins = group.admins.filter((a) => a.toString() !== userIdToRemove);
    await group.save();

    // Remove from Conversation participants
    await Conversation.findByIdAndUpdate(group.conversation, {
      $pull: { participants: userIdToRemove },
    });

    // Create system message
    const removedUser = await User.findById(userIdToRemove);
    const sysMsg = new Message({
      conversation: group.conversation,
      sender: req.user._id,
      text: `${req.user.fullName} removed ${removedUser ? removedUser.fullName : 'a user'} from the group`,
      seenBy: [req.user._id],
    });
    await sysMsg.save();

    await Conversation.findByIdAndUpdate(group.conversation, { lastMessage: sysMsg._id });

    const populatedGroup = await Group.findById(group._id)
      .populate('members admins creator', 'username fullName avatar bio onlineStatus');

    res.status(200).json({ success: true, group: populatedGroup });
  } catch (error) {
    next(error);
  }
};

// @desc    Promote member to admin role
// @route   PUT /api/groups/:id/admin/promote
// @access  Private
export const promoteToAdmin = async (req, res, next) => {
  const { id } = req.params;
  const { userId } = req.body;

  try {
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const isAdmin = group.admins.includes(req.user._id);
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Only admins can assign admin roles' });
    }

    if (!group.members.includes(userId)) {
      return res.status(400).json({ success: false, message: 'User is not a group member' });
    }

    if (group.admins.includes(userId)) {
      return res.status(400).json({ success: false, message: 'User is already an admin' });
    }

    group.admins.push(userId);
    await group.save();

    const promoted = await User.findById(userId);
    const sysMsg = new Message({
      conversation: group.conversation,
      sender: req.user._id,
      text: `${req.user.fullName} promoted ${promoted ? promoted.fullName : 'a member'} to admin`,
      seenBy: [req.user._id],
    });
    await sysMsg.save();

    await Conversation.findByIdAndUpdate(group.conversation, { lastMessage: sysMsg._id });

    const populatedGroup = await Group.findById(group._id)
      .populate('members admins creator', 'username fullName avatar bio onlineStatus');

    res.status(200).json({ success: true, group: populatedGroup });
  } catch (error) {
    next(error);
  }
};

// @desc    Demote admin to regular member
// @route   PUT /api/groups/:id/admin/demote
// @access  Private
export const demoteAdmin = async (req, res, next) => {
  const { id } = req.params;
  const { userId } = req.body;

  try {
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const isAdmin = group.admins.includes(req.user._id);
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Only admins can demote other admins' });
    }

    if (group.creator.toString() === userId) {
      return res.status(400).json({ success: false, message: 'Creator cannot be demoted' });
    }

    if (!group.admins.includes(userId)) {
      return res.status(400).json({ success: false, message: 'User is not an admin' });
    }

    group.admins = group.admins.filter((a) => a.toString() !== userId);
    await group.save();

    const demoted = await User.findById(userId);
    const sysMsg = new Message({
      conversation: group.conversation,
      sender: req.user._id,
      text: `${req.user.fullName} demoted ${demoted ? demoted.fullName : 'an admin'} to member`,
      seenBy: [req.user._id],
    });
    await sysMsg.save();

    await Conversation.findByIdAndUpdate(group.conversation, { lastMessage: sysMsg._id });

    const populatedGroup = await Group.findById(group._id)
      .populate('members admins creator', 'username fullName avatar bio onlineStatus');

    res.status(200).json({ success: true, group: populatedGroup });
  } catch (error) {
    next(error);
  }
};

// @desc    Leave group
// @route   DELETE /api/groups/:id/leave
// @access  Private
export const leaveGroup = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;

  try {
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (!group.members.includes(userId)) {
      return res.status(400).json({ success: false, message: 'You are not a member of this group' });
    }

    const isCreator = group.creator.toString() === userId.toString();

    // Remove user
    group.members = group.members.filter((m) => m.toString() !== userId.toString());
    group.admins = group.admins.filter((a) => a.toString() !== userId.toString());

    if (group.members.length === 0) {
      // Last member left, delete group completely
      await Conversation.findByIdAndDelete(group.conversation);
      await Message.deleteMany({ conversation: group.conversation });
      await Group.findByIdAndDelete(group._id);
      return res.status(200).json({ success: true, message: 'Group deleted since all members left' });
    }

    if (isCreator) {
      // Re-assign creator to first remaining admin or member
      if (group.admins.length > 0) {
        group.creator = group.admins[0];
      } else {
        group.creator = group.members[0];
        group.admins.push(group.members[0]); // Make them admin
      }
    } else if (group.admins.length === 0) {
      // Assign admin role to first member
      group.admins.push(group.members[0]);
    }

    await group.save();

    // Pull from conversation participants
    await Conversation.findByIdAndUpdate(group.conversation, {
      $pull: { participants: userId },
    });

    // Create system message
    const sysMsg = new Message({
      conversation: group.conversation,
      sender: userId,
      text: `${req.user.fullName} left the group`,
      seenBy: [],
    });
    await sysMsg.save();

    await Conversation.findByIdAndUpdate(group.conversation, { lastMessage: sysMsg._id });

    res.status(200).json({ success: true, message: 'Left the group successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Update group permissions
// @route   PUT /api/groups/:id/permissions
// @access  Private
export const updateGroupPermissions = async (req, res, next) => {
  const { id } = req.params;
  const { onlyAdminsCanMessage, onlyAdminsCanEditGroup } = req.body;

  try {
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Only creator or admin can update permissions
    const isAdmin = group.admins.includes(req.user._id);
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Only admins can modify group permissions' });
    }

    if (onlyAdminsCanMessage !== undefined) group.permissions.onlyAdminsCanMessage = onlyAdminsCanMessage;
    if (onlyAdminsCanEditGroup !== undefined) group.permissions.onlyAdminsCanEditGroup = onlyAdminsCanEditGroup;

    await group.save();

    res.status(200).json({ success: true, message: 'Permissions updated successfully', group });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete group chat (Only creator can delete)
// @route   DELETE /api/groups/:id
// @access  Private
export const deleteGroup = async (req, res, next) => {
  const { id } = req.params;

  try {
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (group.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the group creator can delete this group' });
    }

    // Delete associated conversation, messages, and the group itself
    await Conversation.findByIdAndDelete(group.conversation);
    await Message.deleteMany({ conversation: group.conversation });
    await Group.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: 'Group deleted successfully' });
  } catch (error) {
    next(error);
  }
};
