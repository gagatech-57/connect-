import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore.js';
import { Lock, Loader2, ArrowLeft, ShieldAlert } from 'lucide-react';

export default function ResetPassword({ setPage, email }) {
  const { resetPassword, error } = useAuthStore();
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSuccess('');

    if (otp.length !== 6) {
      setLocalError('OTP must be exactly 6 digits');
      return;
    }

    if (newPassword.length < 6) {
      setLocalError('New password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      await resetPassword(email, otp, newPassword);
      setSuccess('Password reset successful! Redirecting to login...');
      setTimeout(() => {
        setPage('login');
      }, 2500);
    } catch (err) {
      setLocalError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg p-4 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl shadow-xl overflow-hidden p-8 relative">
        
        {/* Decorative Top Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-brand-400 opacity-20 rounded-full blur-3xl"></div>
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500 opacity-20 rounded-full blur-3xl"></div>

        <button
          onClick={() => setPage('forgot-password')}
          className="absolute top-6 left-6 text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center gap-1.5 text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex flex-col items-center mb-8 mt-4 relative">
          <div className="w-14 h-14 bg-gradient-to-tr from-fuchsia-600 to-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-fuchsia-500/20 mb-4">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">Reset Password</h2>
          <p className="text-sm text-slate-500 dark:text-dark-muted mt-2 text-center">
            Recovering account for <strong className="text-slate-700 dark:text-slate-300">{email}</strong>
          </p>
        </div>

        {localError && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/30 border-l-4 border-rose-500 text-rose-700 dark:text-rose-400 text-sm rounded-r-lg">
            {localError}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/30 border-l-4 border-emerald-500 text-emerald-700 dark:text-emerald-400 text-sm rounded-r-lg">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-600 dark:text-dark-muted mb-1">6-Digit OTP Code</label>
            <input
              type="text"
              maxLength="6"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all font-mono tracking-widest text-center text-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-600 dark:text-dark-muted mb-1">New Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Resetting...
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
