import React, { useState, useEffect } from 'react';
import { useChatStore } from '../store/useChatStore.js';
import api from '../services/api.js';
import { ArrowLeft, Users, UserCheck, MessageSquare, Ban, UserMinus, Plus, Clock, Loader2 } from 'lucide-react';

export default function SocialSidebar({ onClose }) {
  const { selectConversation, fetchConversations } = useChatStore();
  const [activeTab, setActiveTab] = useState('friends'); // 'friends', 'received', 'sent'
  const [friends, setFriends] = useState([]);
  const [pendingReceived, setPendingReceived] = useState([]);
  const [pendingSent, setPendingSent] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSocialData();
  }, [activeTab]);

  const fetchSocialData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'friends') {
        const res = await api.get('/friends');
        setFriends(res.data.friends || []);
      } else {
        const res = await api.get('/friends/pending');
        setPendingReceived(res.data.pending?.received || []);
        setPendingSent(res.data.pending?.sent || []);
      }
    } catch (err) {
      console.error('Failed to fetch social details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      const res = await api.put(`/friends/request/${requestId}/accept`);
      alert(res.data.message || 'Friend request accepted!');
      
      // Update local lists
      setPendingReceived(pendingReceived.filter((r) => r._id !== requestId));
      
      // Fetch fresh conversations and auto-select new chat
      await fetchConversations();
      if (res.data.conversation) {
        selectConversation(res.data.conversation);
      }
      onClose(); // Go back to chats view
    } catch (err) {
      alert('Failed to accept request');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await api.delete(`/friends/request/${requestId}`);
      setPendingReceived(pendingReceived.filter((r) => r._id !== requestId));
      setPendingSent(pendingSent.filter((r) => r._id !== requestId));
      alert('Request removed');
    } catch (err) {
      alert('Failed to remove request');
    }
  };

  const handleStartChat = async (friend) => {
    try {
      const res = await api.post('/friends/request', { recipientId: friend._id });
      await fetchConversations();
      const updated = useChatStore.getState().conversations;
      const matched = updated.find((c) => !c.isGroup && c.participants.some((p) => p._id === friend._id));
      if (matched) selectConversation(matched);
      onClose();
    } catch (err) {
      alert('Could not start chat');
    }
  };

  const handleBlockUser = async (userId) => {
    if (!confirm('Are you sure you want to block this user?')) return;
    try {
      await api.post('/friends/block', { userIdToBlock: userId });
      setFriends(friends.filter((f) => f._id !== userId));
      alert('User blocked successfully');
    } catch (err) {
      alert('Failed to block user');
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
        <span className="font-bold text-base text-slate-800 dark:text-white">Contacts & Social</span>
      </div>

      {/* Tabs */}
      <div className="px-3 py-2 flex gap-1 border-b border-slate-100 dark:border-dark-border">
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'friends'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-500 dark:text-dark-muted hover:bg-slate-50 dark:hover:bg-dark-bg'
          }`}
        >
          Friends
        </button>
        <button
          onClick={() => setActiveTab('received')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
            activeTab === 'received'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-500 dark:text-dark-muted hover:bg-slate-50 dark:hover:bg-dark-bg'
          }`}
        >
          Received
          {pendingReceived.length > 0 && (
            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'sent'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-500 dark:text-dark-muted hover:bg-slate-50 dark:hover:bg-dark-bg'
          }`}
        >
          Sent
        </button>
      </div>

      {/* Social Items list */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
          </div>
        ) : activeTab === 'friends' ? (
          <div className="space-y-2">
            {friends.length > 0 ? (
              friends.map((friend) => (
                <div
                  key={friend._id}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={friend.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${friend.fullName}`}
                      alt={friend.fullName}
                      className="w-9 h-9 rounded-lg object-cover"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{friend.fullName}</p>
                      <p className="text-[10px] text-slate-400 truncate">@{friend.username}</p>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => handleStartChat(friend)}
                      title="Chat"
                      className="w-7 h-7 rounded-lg bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleBlockUser(friend._id)}
                      title="Block User"
                      className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all border border-rose-200/40"
                    >
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center p-8 text-slate-400">
                <Users className="w-8 h-8 opacity-30 mx-auto mb-1" />
                <p className="text-xs">No friends added yet</p>
              </div>
            )}
          </div>
        ) : activeTab === 'received' ? (
          <div className="space-y-2">
            {pendingReceived.length > 0 ? (
              pendingReceived.map((reqItem) => (
                <div
                  key={reqItem._id}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={reqItem.sender.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${reqItem.sender.fullName}`}
                      alt={reqItem.sender.fullName}
                      className="w-9 h-9 rounded-lg object-cover"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{reqItem.sender.fullName}</p>
                      <p className="text-[10px] text-slate-400 truncate">@{reqItem.sender.username}</p>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => handleAcceptRequest(reqItem._id)}
                      title="Accept"
                      className="w-7 h-7 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRejectRequest(reqItem._id)}
                      title="Decline"
                      className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-colors border border-rose-200/40"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center p-8 text-slate-400">
                <Clock className="w-8 h-8 opacity-30 mx-auto mb-1 animate-pulse" />
                <p className="text-xs">No pending requests received</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {pendingSent.length > 0 ? (
              pendingSent.map((reqItem) => (
                <div
                  key={reqItem._id}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={reqItem.recipient.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${reqItem.recipient.fullName}`}
                      alt={reqItem.recipient.fullName}
                      className="w-9 h-9 rounded-lg object-cover"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{reqItem.recipient.fullName}</p>
                      <p className="text-[10px] text-slate-400 truncate">@{reqItem.recipient.username}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRejectRequest(reqItem._id)}
                    title="Cancel Request"
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-500 flex items-center justify-center transition-colors"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center p-8 text-slate-400">
                <Clock className="w-8 h-8 opacity-30 mx-auto mb-1" />
                <p className="text-xs">No pending requests sent</p>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
