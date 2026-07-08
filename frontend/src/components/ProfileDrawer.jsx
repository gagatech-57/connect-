import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore.js';
import api from '../services/api.js';
import { X, Camera, ShieldCheck, Calendar, Info, Ban, User, Edit3, Save } from 'lucide-react';

export default function ProfileDrawer({ isOpen, onClose }) {
  const { user, updateProfile, updateAvatar } = useAuthStore();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [statusMessage, setStatusMessage] = useState(user?.statusMessage || '');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Blocked users state
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [isBlockedLoading, setIsBlockedLoading] = useState(false);

  // Fetch blocked list when drawer opens
  useEffect(() => {
    if (isOpen) {
      fetchBlockedUsers();
    }
  }, [isOpen]);

  const fetchBlockedUsers = async () => {
    setIsBlockedLoading(true);
    try {
      const res = await api.get('/friends/blocked');
      setBlockedUsers(res.data.blocked || []);
    } catch (err) {
      console.error('Failed to fetch blocked users:', err);
    } finally {
      setIsBlockedLoading(false);
    }
  };

  const handleUnblock = async (blockedUserId) => {
    try {
      await api.post('/friends/unblock', { userIdToUnblock: blockedUserId });
      setBlockedUsers(blockedUsers.filter((u) => u._id !== blockedUserId));
    } catch (err) {
      alert('Failed to unblock user');
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      await updateAvatar(formData);
      alert('Profile picture updated!');
    } catch (err) {
      alert('Failed to upload picture: ' + err.message);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ fullName, bio, statusMessage });
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (err) {
      alert('Failed to update profile: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-sm bg-white dark:bg-dark-card border-l border-slate-200 dark:border-dark-border shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 transition-colors">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-dark-border flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <User className="w-5 h-5 text-brand-500" />
          My Profile
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-dark-bg rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Profile Details Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        
        {/* Avatar Area */}
        <div className="flex flex-col items-center">
          <div className="relative group cursor-pointer w-24 h-24 rounded-3xl overflow-hidden border border-slate-200 dark:border-dark-border shadow-md">
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.fullName}`}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-white mt-3">@{user?.username}</p>
          <p className="text-xs text-slate-400">{user?.email}</p>
          
          <div className="flex items-center gap-1.5 mt-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200/50">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified Account
          </div>
        </div>

        {/* Info Fields */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">ABOUT ME</h4>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            >
              {isEditing ? <X className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl text-slate-800 dark:text-white text-xs focus:ring-1 focus:ring-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows="2"
                  maxLength="160"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl text-slate-800 dark:text-white text-xs focus:ring-1 focus:ring-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Status Message</label>
                <input
                  type="text"
                  value={statusMessage}
                  onChange={(e) => setStatusMessage(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl text-slate-800 dark:text-white text-xs focus:ring-1 focus:ring-brand-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-brand-500/10"
              >
                <Save className="w-3.5 h-3.5" />
                Save Changes
              </button>
            </form>
          ) : (
            <div className="bg-slate-50 dark:bg-dark-bg border border-slate-200/50 dark:border-dark-border rounded-2xl p-4 space-y-3.5 text-xs text-slate-700 dark:text-dark-text">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block mb-0.5">FULL NAME</span>
                <span className="font-semibold">{user?.fullName}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block mb-0.5">BIO</span>
                <span className="font-semibold">{user?.bio}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block mb-0.5">STATUS MESSAGE</span>
                <span className="px-2 py-0.5 bg-brand-50 dark:bg-brand-950/20 text-brand-500 rounded-md font-bold">
                  {user?.statusMessage}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 dark:text-dark-muted border-t border-slate-100 dark:border-dark-border/40 pt-3">
                <Calendar className="w-4 h-4" />
                <span>Joined {new Date(user?.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Blocked Users Section */}
        <div className="space-y-3 border-t border-slate-100 dark:border-dark-border pt-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Ban className="w-4 h-4 text-rose-500" />
            BLOCKED USERS
          </h4>

          <div className="space-y-2 max-h-44 overflow-y-auto">
            {isBlockedLoading ? (
              <p className="text-2xs text-slate-400 text-center">Loading list...</p>
            ) : blockedUsers.length > 0 ? (
              blockedUsers.map((blocked) => (
                <div
                  key={blocked._id}
                  className="flex items-center justify-between p-2 bg-slate-50 dark:bg-dark-bg/60 border border-slate-100 dark:border-dark-border/50 rounded-xl"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={blocked.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${blocked.fullName}`}
                      alt={blocked.fullName}
                      className="w-7 h-7 rounded-lg object-cover"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{blocked.fullName}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnblock(blocked._id)}
                    className="px-2.5 py-1 text-[10px] font-bold text-brand-500 bg-brand-50 dark:bg-brand-950/20 border border-brand-200/50 rounded-lg hover:bg-brand-500 hover:text-white transition-colors"
                  >
                    Unblock
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center p-4 border border-dashed border-slate-200 dark:border-dark-border rounded-xl">
                <Info className="w-5 h-5 text-slate-300 mx-auto mb-1" />
                <p className="text-[10px] text-slate-400">Blocked list is empty</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
