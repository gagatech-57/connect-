import React, { useState, useEffect } from 'react';
import { useChatStore } from '../store/useChatStore.js';
import api from '../services/api.js';
import { X, Loader2, Users, Camera } from 'lucide-react';

export default function GroupModal({ isOpen, onClose }) {
  const { fetchConversations, selectConversation } = useChatStore();
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFriendsLoading, setIsFriendsLoading] = useState(false);
  
  // Avatar upload
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  // Fetch friends list when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchFriendsList = async () => {
        setIsFriendsLoading(true);
        try {
          const res = await api.get('/friends');
          setFriends(res.data.friends || []);
        } catch (err) {
          console.error('Failed to fetch friends list:', err);
        } finally {
          setIsFriendsLoading(false);
        }
      };
      fetchFriendsList();
      
      // Reset state
      setGroupName('');
      setDescription('');
      setSelectedFriends([]);
      setAvatarFile(null);
      setAvatarPreview('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setAvatarPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleToggleFriend = (friendId) => {
    if (selectedFriends.includes(friendId)) {
      setSelectedFriends(selectedFriends.filter((id) => id !== friendId));
    } else {
      setSelectedFriends([...selectedFriends, friendId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      alert('Group name is required');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('name', groupName);
    formData.append('description', description);
    formData.append('memberIds', JSON.stringify(selectedFriends));
    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }

    try {
      const res = await api.post('/groups', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      await fetchConversations();
      
      // Select the newly created group conversation
      if (res.data.conversation) {
        selectConversation(res.data.conversation);
      }
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-dark-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-500" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Create Group Chat</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-dark-bg rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Avatar Upload */}
          <div className="flex flex-col items-center mb-4">
            <div className="relative group cursor-pointer w-20 h-20 bg-slate-100 dark:bg-dark-bg rounded-2xl overflow-hidden flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-dark-border">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Group Preview" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-8 h-8 text-slate-400" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-wider">Group Avatar</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-dark-muted mb-1 uppercase tracking-wider">Group Name</label>
            <input
              type="text"
              required
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Sales Team, Family"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-dark-muted mb-1 uppercase tracking-wider">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this group about?"
              rows="2"
              className="w-full px-4 py-2 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm"
            />
          </div>

          {/* Members list */}
          <div className="flex flex-col">
            <label className="block text-xs font-bold text-slate-500 dark:text-dark-muted mb-2 uppercase tracking-wider">Add Friends</label>
            
            <div className="border border-slate-200 dark:border-dark-border rounded-xl overflow-hidden bg-slate-50 dark:bg-dark-bg max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-dark-border/40">
              {isFriendsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
                </div>
              ) : friends.length > 0 ? (
                friends.map((friend) => (
                  <label
                    key={friend._id}
                    className="flex items-center justify-between p-3 hover:bg-slate-100/50 dark:hover:bg-dark-border cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={friend.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${friend.fullName}`}
                        alt={friend.fullName}
                        className="w-8 h-8 rounded-lg object-cover"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-white">{friend.fullName}</p>
                        <p className="text-[10px] text-slate-400">@{friend.username}</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedFriends.includes(friend._id)}
                      onChange={() => handleToggleFriend(friend._id)}
                      className="w-4.5 h-4.5 text-brand-500 border-slate-300 rounded focus:ring-brand-500 dark:bg-dark-bg dark:border-dark-border cursor-pointer"
                    />
                  </label>
                ))
              ) : (
                <p className="text-xs text-slate-400 p-4 text-center">Add friends first to select them here</p>
              )}
            </div>
          </div>

          {/* Footer controls */}
          <div className="pt-3 border-t border-slate-100 dark:border-dark-border flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 dark:bg-dark-border hover:bg-slate-200 text-slate-700 dark:text-dark-text rounded-xl text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl text-xs shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Group'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
