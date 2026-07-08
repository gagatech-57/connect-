import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore.js';
import { Loader2, MailCheck, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function VerifyEmail({ setPage, email }) {
  const { verifyOTP, resendOTP, error } = useAuthStore();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [localError, setLocalError] = useState('');
  const [message, setMessage] = useState('');

  // Countdown timer for resending OTP
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleChange = (element, index) => {
    if (isNaN(element.value)) return false;

    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);

    // Focus next input
    if (element.nextSibling && element.value !== '') {
      element.nextSibling.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && e.target.previousSibling) {
      e.target.previousSibling.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setMessage('');
    
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setLocalError('Please enter all 6 digits');
      return;
    }

    setLoading(true);

    try {
      await verifyOTP(email, otpCode);
      
      // Gorgeous confetti burst for premium feel
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#8b5cf6', '#6366f1', '#a855f7', '#10b981'],
      });
      
    } catch (err) {
      setLocalError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setLocalError('');
    setMessage('');
    try {
      await resendOTP(email);
      setMessage('OTP resent successfully. Please check your email inbox.');
      setResendTimer(60);
    } catch (err) {
      setLocalError(err.message || 'Failed to resend OTP');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg p-4 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl shadow-xl overflow-hidden p-8 relative">
        
        {/* Decorative Top Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-brand-400 opacity-20 rounded-full blur-3xl"></div>
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500 opacity-20 rounded-full blur-3xl"></div>

        <div className="flex flex-col items-center mb-8 relative">
          <div className="w-14 h-14 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-4">
            <MailCheck className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">Verify Email</h2>
          <p className="text-sm text-slate-500 dark:text-dark-muted mt-2 text-center">
            We sent a verification code to <br />
            <strong className="text-slate-700 dark:text-slate-300 font-semibold">{email}</strong>
          </p>
        </div>

        {localError && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/30 border-l-4 border-rose-500 text-rose-700 dark:text-rose-400 text-sm rounded-r-lg">
            {localError}
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/30 border-l-4 border-emerald-500 text-emerald-700 dark:text-emerald-400 text-sm rounded-r-lg">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-between gap-2">
            {otp.map((data, index) => (
              <input
                key={index}
                type="text"
                maxLength="1"
                value={data}
                onChange={(e) => handleChange(e.target, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className="w-12 h-14 text-center text-xl font-bold bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                Verify Account
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm">
          <p className="text-slate-500 dark:text-dark-muted">
            Didn't receive the email?{' '}
            {resendTimer > 0 ? (
              <span className="text-slate-400 font-semibold">Resend OTP in {resendTimer}s</span>
            ) : (
              <button
                onClick={handleResend}
                className="font-bold text-brand-600 dark:text-brand-400 hover:underline"
              >
                Resend code
              </button>
            )}
          </p>
          <button
            onClick={() => setPage('login')}
            className="mt-4 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-white hover:underline"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
