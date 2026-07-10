import User from '../models/User.js';
import OTPVerification from '../models/OTPVerification.js';
import { sendOTPEmail } from '../services/emailService.js';
import {
  generateAccessToken,
  generateRefreshToken,
  sendRefreshTokenCookie,
  clearRefreshTokenCookie,
} from '../utils/token.js';
import jwt from 'jsonwebtoken';

// Helper to generate a random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  const { username, fullName, email, password } = req.body;

  try {
    // Check if user already exists
    const existingUserByEmail = await User.findOne({ email });
    const existingUserByUsername = await User.findOne({ username });

    if (existingUserByEmail) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    if (existingUserByUsername) {
      return res.status(400).json({ success: false, message: 'Username is already taken' });
    }

    // Create the verified user (bypassing OTP)
    const newUser = new User({
      username,
      fullName,
      email,
      password,
      isEmailVerified: true, // Auto-verified!
    });

    await newUser.save();

    // Generate tokens & log user in immediately
    const accessToken = generateAccessToken(newUser._id);
    const refreshToken = generateRefreshToken(newUser._id);

    sendRefreshTokenCookie(res, refreshToken);

    return res.status(201).json({
      success: true,
      message: 'User registered and logged in successfully',
      token: accessToken,
      user: {
        _id: newUser._id,
        username: newUser.username,
        fullName: newUser.fullName,
        email: newUser.email,
        avatar: newUser.avatar,
        bio: newUser.bio,
        statusMessage: newUser.statusMessage,
        isEmailVerified: newUser.isEmailVerified,
        onlineStatus: newUser.onlineStatus,
        lastSeen: newUser.lastSeen,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Helper for OTP generation, rate limiting, and sending
const handleOTPSending = async (email, res) => {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 60 * 1000); // 60 seconds expiration

  let otpRecord = await OTPVerification.findOne({ email });

  if (otpRecord) {
    otpRecord.otp = otp;
    otpRecord.attempts = 0;
    otpRecord.expiresAt = expiresAt;
    otpRecord.lastRequestedAt = Date.now();
    await otpRecord.save();
  } else {
    otpRecord = new OTPVerification({
      email,
      otp,
      expiresAt,
      requestsCount: 1,
      lastRequestedAt: Date.now(),
    });
    await otpRecord.save();
  }

  // Send Email
  await sendOTPEmail(email, otp);

  return res.status(200).json({
    success: true,
    message: 'OTP sent to email. Please verify your account.',
    email,
  });
};

// @desc    Verify OTP code
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOTP = async (req, res, next) => {
  const { email, otp } = req.body;

  try {
    const otpRecord = await OTPVerification.findOne({ email });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired',
      });
    }

    // Check expiration
    if (otpRecord.expiresAt < Date.now()) {
      await OTPVerification.deleteOne({ email });
      return res.status(400).json({
        success: false,
        message: 'OTP has expired',
      });
    }



    // Check code match
    if (otpRecord.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
      });
    }

    // OTP is valid!
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isEmailVerified = true;
    await user.save();

    // Delete OTP record (clearing OTP and expiry)
    await OTPVerification.deleteOne({ email });

    // Generate tokens & log user in
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    sendRefreshTokenCookie(res, refreshToken);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      token: accessToken,
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

// @desc    Resend OTP code
// @route   POST /api/auth/resend-otp
// @access  Public
export const resendOTP = async (req, res, next) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User with this email does not exist.' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: 'Email is already verified.' });
    }

    await handleOTPSending(email, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }



    // Set online presence
    user.onlineStatus = true;
    user.lastSeen = Date.now();
    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    sendRefreshTokenCookie(res, refreshToken);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token: accessToken,
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

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res, next) => {
  try {
    if (req.user) {
      const user = await User.findById(req.user._id);
      if (user) {
        user.onlineStatus = false;
        user.lastSeen = Date.now();
        await user.save();
      }
    }

    clearRefreshTokenCookie(res);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
export const refresh = async (req, res, next) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'Refresh token missing' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Rotate tokens
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    sendRefreshTokenCookie(res, newRefreshToken);

    res.status(200).json({
      success: true,
      token: newAccessToken,
    });
  } catch (error) {
    console.error('Refresh token verification failed:', error.message);
    clearRefreshTokenCookie(res);
    return res.status(401).json({ success: false, message: 'Invalid refresh token, logged out' });
  }
};

// @desc    Forgot Password - request OTP
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User with this email does not exist.' });
    }

    // Send OTP for verification
    await handleOTPSending(email, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password using OTP
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res, next) => {
  const { email, otp, newPassword } = req.body;

  try {
    const otpRecord = await OTPVerification.findOne({ email });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired or not requested.',
      });
    }

    if (otpRecord.expiresAt < Date.now()) {
      await OTPVerification.deleteOne({ email });
      return res.status(400).json({
        success: false,
        message: 'OTP expired.',
      });
    }

    otpRecord.attempts += 1;
    await otpRecord.save();

    if (otpRecord.attempts > 5) {
      await OTPVerification.deleteOne({ email });
      return res.status(400).json({
        success: false,
        message: 'Maximum attempts exceeded. Please request a new OTP.',
      });
    }

    if (otpRecord.otp !== otp) {
      const remaining = 5 - otpRecord.attempts;
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. Attempts remaining: ${remaining}`,
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.password = newPassword; // pre-save hashes this
    await user.save();

    // Delete OTP
    await OTPVerification.deleteOne({ email });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now login.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.user._id);

    if (!(await user.comparePassword(oldPassword))) {
      return res.status(400).json({ success: false, message: 'Incorrect old password' });
    }

    user.password = newPassword; // pre-save hashes this
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};
