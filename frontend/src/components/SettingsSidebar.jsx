import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore.js';
import { useChatStore } from '../store/useChatStore.js';
import { ArrowLeft, Moon, Sun, Volume2, VolumeX, ShieldEllipsis, Loader2, Save } from 'lucide-react';

export default function SettingsSidebar({ onClose }) {
  const { changePassword } = useAuthStore();
  const { soundEnabled, setSoundEnabled } = useChatStore();

  const [darkMode, setDarkMode] = useState(
    typeof document !== 'undefined' ? document.body.classList.contains('dark') : false
  );
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const toggleDarkMode = () => {
    const isDark = !darkMode;
    setDarkMode(isDark);
    if (isDark) {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      setSuccess('Password changed successfully!');
      setOldPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err.message || 'Password update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-dark-card border-r border-slate-200 dark:border-dark-border select-none transition-colors duration-300">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-dark-border flex items-center gap-3">
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-100 dark:hover:bg-dark-bg rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-bold text-base text-slate-800 dark:text-white">Workspace Settings</span>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        
        {/* Appearance Settings */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">APPEARANCE</h4>
          
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-dark-bg rounded-2xl border border-slate-200/40 dark:border-dark-border">
            <div className="flex items-center gap-2 text-slate-700 dark:text-dark-text">
              {darkMode ? <Moon className="w-5 h-5 text-brand-500" /> : <Sun className="w-5 h-5 text-brand-500" />}
              <span className="text-xs font-bold">Dark Mode theme</span>
            </div>
            
            <button
              onClick={toggleDarkMode}
              className={`w-11 h-6 rounded-full p-0.5 transition-colors focus:outline-none ${
                darkMode ? 'bg-brand-500' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  darkMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-dark-bg rounded-2xl border border-slate-200/40 dark:border-dark-border">
            <div className="flex items-center gap-2 text-slate-700 dark:text-dark-text">
              {soundEnabled ? <Volume2 className="w-5 h-5 text-brand-500" /> : <VolumeX className="w-5 h-5 text-brand-500" />}
              <span className="text-xs font-bold">Message Alerts sound</span>
            </div>
            
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-11 h-6 rounded-full p-0.5 transition-colors focus:outline-none ${
                soundEnabled ? 'bg-brand-500' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  soundEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Change Password Form */}
        <div className="space-y-4 border-t border-slate-100 dark:border-dark-border pt-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldEllipsis className="w-4 h-4 text-brand-500" />
            SECURITY SETTINGS
          </h4>

          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border-l-3 border-rose-500 text-rose-700 dark:text-rose-400 text-2xs rounded-r-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border-l-3 border-emerald-500 text-emerald-700 dark:text-emerald-400 text-2xs rounded-r-lg">
              {success}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">CURRENT PASSWORD</label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl text-slate-800 dark:text-white text-xs focus:ring-1 focus:ring-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">NEW PASSWORD</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl text-slate-800 dark:text-white text-xs focus:ring-1 focus:ring-brand-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-brand-500/10"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Update Password
                </>
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
