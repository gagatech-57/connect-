import mongoose from 'mongoose';

const otpVerificationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    otp: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    requestsCount: {
      type: Number,
      default: 1,
    },
    lastRequestedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// Create a TTL index that automatically deletes expired OTP records
otpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OTPVerification = mongoose.model('OTPVerification', otpVerificationSchema);
export default OTPVerification;
