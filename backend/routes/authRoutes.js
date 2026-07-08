import express from 'express';
import {
  register,
  verifyOTP,
  resendOTP,
  login,
  logout,
  refresh,
  forgotPassword,
  resetPassword,
  changePassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validateRequest } from '../middleware/validate.js';
import {
  registerValidator,
  loginValidator,
  otpVerifyValidator,
  emailOnlyValidator,
  resetPasswordValidator,
  changePasswordValidator,
} from '../validators/authValidator.js';

const router = express.Router();

// Apply auth rate limiting on sensitive, publicly exposed endpoints
router.post('/register', authLimiter, registerValidator, validateRequest, register);
router.post('/verify-otp', authLimiter, otpVerifyValidator, validateRequest, verifyOTP);
router.post('/resend-otp', authLimiter, emailOnlyValidator, validateRequest, resendOTP);
router.post('/login', authLimiter, loginValidator, validateRequest, login);
router.post('/forgot-password', authLimiter, emailOnlyValidator, validateRequest, forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordValidator, validateRequest, resetPassword);

// Token refresh endpoint (does not require standard authorization header)
router.post('/refresh', refresh);

// Protected routes (require authorization header)
router.post('/logout', protect, logout);
router.put('/change-password', protect, changePasswordValidator, validateRequest, changePassword);

export default router;
