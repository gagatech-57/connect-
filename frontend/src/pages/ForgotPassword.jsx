import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore.js';
import { Mail, Loader2, ArrowLeft, KeyRound } from 'lucide-react';

export default function ForgotPassword({ setPage, setVerificationEmail }) {
  const { forgotPassword, error } = useAuthStore();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setLoading(true);

    try {
      await forgotPassword(email);
      setVerificationEmail(email);
      setPage('reset-password');
    } catch (err) {
      setLocalError(err.message || 'Request failed');
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
          onClick={() => setPage('login')}
          className="absolute top-6 left-6 text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center gap-1.5 text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex flex-col items-center mb-8 mt-4 relative">
          <div className="w-14 h-14 bg-gradient-to-tr from-violet-600 to-fuchsia-500 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/20 mb-4">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">Recover Password</h2>
          <p className="text-sm text-slate-500 dark:text-dark-muted mt-2 text-center">
            Enter your email to receive a 6-digit OTP code to verify and reset your password.
          </p>
        </div>

        {localError && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/30 border-l-4 border-rose-500 text-rose-700 dark:text-rose-400 text-sm rounded-r-lg">
            {localError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-600 dark:text-dark-muted mb-2">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Mail className="w-5 h-5" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending OTP...
              </>
            ) : (
              'Send OTP Code'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
