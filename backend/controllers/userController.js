import User from '../models/User.js';
import { uploadToCloudinary } from '../services/cloudinaryService.js';

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateProfile = async (req, res, next) => {
  const { fullName, bio, statusMessage } = req.body;

  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (fullName) user.fullName = fullName;
    if (bio !== undefined) user.bio = bio;
    if (statusMessage !== undefined) user.statusMessage = statusMessage;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        statusMessage: user.statusMessage,
        isEmailVerified: user.isEmailVerified,
        onlineStatus: user.onlineStatus,
        lastSeen: user.lastSeen,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user avatar
// @route   PUT /api/users/avatar
// @access  Private
export const updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image file' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Upload to Cloudinary (will return demo URL if credentials aren't set)
    const result = await uploadToCloudinary(req.file.buffer, 'gaga_connect/avatars', 'image');

    user.avatar = result.secure_url;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile picture updated successfully',
      avatar: user.avatar,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search users by username or fullName
// @route   GET /api/users/search
// @access  Private
export const searchUsers = async (req, res, next) => {
  const { query } = req.query;

  try {
    if (!query) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    // Find users excluding current user, matching query by username or fullName
    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { fullName: { $regex: query, $options: 'i' } },
      ],
    })
      .select('username fullName email avatar bio statusMessage onlineStatus lastSeen')
      .limit(20);

    res.status(200).json({ success: true, users });
  } catch (error) {
    next(error);
  }
};
