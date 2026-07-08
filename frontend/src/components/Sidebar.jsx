import React, { useState, useEffect } from 'react';
import { useChatStore } from '../store/useChatStore.js';
import { useAuthStore } from '../store/useAuthStore.js';
import api from '../services/api.js';
import {
  Search,
  Settings,
  User,
  LogOut,
  UserPlus,
  MessageSquare,
  Users,
  Archive,
  VolumeX,
  Pin,
  Clock,
  Check,
  CheckCheck,
  Plus
} from 'lucide-react';

export default function Sidebar({ setSidebarView, setShowGroupModal, setProfileDrawerOpen }) {
  const { user, logout } = useAuthStore();
  const {
    conversations,
    activeConversation,
    selectConversation,
    fetchConversations,
    isConversationsLoading,
    onlineUserIds,
    typingUsers
  } = useChatStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'groups', 'archived'

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Handle live user search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        try {
          const res = await api.get(`/users/search?query=${searchQuery}`);
          setSearchResults(res.data.users || []);
        } catch (err) {
          console.error('User search failed:', err.message);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Handle starting a 1-to-1 conversation with a searched user
  const startConversation = async (targetUser) => {
    setSearchQuery('');
    setSearchResults([]);
    
    // Check if conversation already exists in our list
    const existing = conversations.find(
      (c) => !c.isGroup && c.participants.some((p) => p._id === targetUser._id)
    );

    if (existing) {
      selectConversation(existing);
    } else {
      // Create a temporary/placeholder conversation or hit endpoint
      try {
        // Create request or find conversation
        const res = await api.post('/friends/request', { recipientId: targetUser._id });
        if (res.data.conversationId) {
          await fetchConversations();
          const updated = useChatStore.getState().conversations;
          const matched = updated.find(
            (c) => !c.isGroup && c.participants.some((p) => p._id === targetUser._id)
          );
          if (matched) selectConversation(matched);
        } else {
          // If friend request is pending, alert user
          alert(res.data.message || 'Friend request sent! Once accepted, you can chat.');
        }
      } catch (err) {
        // Fallback: Try accepting if request exists or just alert
        alert(err.response?.data?.message || 'Failed to start conversation');
      }
    }
  };

  const handleSendFriendRequest = async (userId) => {
    try {
      const res = await api.post('/friends/request', { recipientId: userId });
      alert(res.data.message || 'Friend request sent!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send request');
    }
  };

  // Filter conversations based on selected tab
  const filteredConversations = conversations.filter((c) => {
    if (c.isArchived && filter !== 'archived') return false;
    if (!c.isArchived && filter === 'archived') return false;
    
    if (filter === 'groups') return c.isGroup;
    return true; // 'all'
  });

  const getRecipient = (conv) => {
    if (conv.isGroup) return null;
    return conv.participants.find((p) => p._id !== user._id);
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    
    // If today, return HH:MM
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If yesterday, return 'Yesterday'
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // Otherwise return date format MM/DD
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-full md:w-80 h-full flex flex-col bg-white dark:bg-dark-card border-r border-slate-200 dark:border-dark-border select-none relative transition-colors duration-300">
      
      {/* Sidebar Header */}
      <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-dark-border">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center font-bold text-white shadow-md shadow-brand-500/20">
            GC
          </div>
          <span className="font-bold text-lg text-slate-800 dark:text-white">Gaga Connect</span>
        </div>
        <button
          onClick={() => setShowGroupModal(true)}
          title="Create Group"
          className="w-8 h-8 bg-slate-50 dark:bg-dark-bg hover:bg-brand-50 dark:hover:bg-brand-950/20 text-slate-600 dark:text-dark-text hover:text-brand-500 rounded-lg flex items-center justify-center transition-all border border-slate-200 dark:border-dark-border"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search users or start chat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all text-sm"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      {!searchQuery && (
        <div className="px-3 pb-2 flex gap-1 border-b border-slate-100 dark:border-dark-border">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === 'all'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-slate-500 dark:text-dark-muted hover:bg-slate-50 dark:hover:bg-dark-bg'
            }`}
          >
            Chats
          </button>
          <button
            onClick={() => setFilter('groups')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === 'groups'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-slate-500 dark:text-dark-muted hover:bg-slate-50 dark:hover:bg-dark-bg'
            }`}
          >
            Groups
          </button>
          <button
            onClick={() => setFilter('archived')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === 'archived'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-slate-500 dark:text-dark-muted hover:bg-slate-50 dark:hover:bg-dark-bg'
            }`}
          >
            Archived
          </button>
        </div>
      )}

      {/* Search results overlay or Conversation thread listing */}
      <div className="flex-1 overflow-y-auto min-h-0 relative">
        {searchQuery ? (
          <div className="p-3 space-y-2">
            <h4 className="text-xs font-bold text-slate-400 mb-2 px-1">SEARCH RESULTS</h4>
            {isSearching ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((userItem) => (
                <div
                  key={userItem._id}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={userItem.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${userItem.fullName}`}
                      alt={userItem.fullName}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-dark-border"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{userItem.fullName}</p>
                      <p className="text-xs text-slate-400 truncate">@{userItem.username}</p>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => startConversation(userItem)}
                      title="Start Chat"
                      className="w-8 h-8 rounded-lg bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleSendFriendRequest(userItem._id)}
                      title="Add Friend"
                      className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-dark-border hover:bg-slate-200 text-slate-600 dark:text-dark-text flex items-center justify-center transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 p-2 text-center">No users found matching query</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-dark-border/30">
            {isConversationsLoading && conversations.length === 0 ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="flex gap-3 p-4 items-center animate-pulse">
                  <div className="w-11 h-11 bg-slate-200 dark:bg-dark-border rounded-xl"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-slate-200 dark:bg-dark-border rounded w-1/2"></div>
                    <div className="h-3 bg-slate-200 dark:bg-dark-border rounded w-4/5"></div>
                  </div>
                </div>
              ))
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => {
                const recipient = getRecipient(conv);
                const isActive = activeConversation && activeConversation._id === conv._id;
                
                // Determine user presence
                let isOnline = false;
                if (!conv.isGroup && recipient) {
                  isOnline = onlineUserIds.includes(recipient._id) || recipient.onlineStatus;
                }

                // Get conversation label details
                const avatarUrl = conv.isGroup
                  ? conv.group?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${conv.group?.name || 'Group'}`
                  : recipient?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${recipient?.fullName || 'User'}`;
                
                const displayName = conv.isGroup ? conv.group?.name : recipient?.fullName || 'Gaga User';
                
                // Typing text
                const typers = typingUsers[conv._id] || [];
                const isTyping = typers.length > 0;

                return (
                  <div
                    key={conv._id}
                    onClick={() => selectConversation(conv)}
                    className={`flex items-center gap-3 p-3.5 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-dark-bg/60 border-l-4 ${
                      isActive
                        ? 'bg-slate-50 dark:bg-dark-bg border-brand-500'
                        : 'border-transparent'
                    }`}
                  >
                    {/* Avatar Container */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-11 h-11 rounded-xl object-cover border border-slate-200 dark:border-dark-border"
                      />
                      {isOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-dark-card rounded-full" />
                      )}
                    </div>

                    {/* Chat Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-bold text-slate-800 dark:text-white truncate">
                          {displayName}
                        </span>
                        <span className="text-2xs text-slate-400 font-semibold">
                          {conv.lastMessage ? formatTime(conv.lastMessage.createdAt) : ''}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        {isTyping ? (
                          <span className="text-xs text-brand-500 font-bold italic animate-pulse truncate">
                            {typers.join(', ')} is typing...
                          </span>
                        ) : (
                          <div className="text-xs text-slate-400 dark:text-dark-muted truncate flex items-center gap-1">
                            {conv.lastMessage && conv.lastMessage.sender?._id === user._id && (
                              <span>
                                {conv.lastMessage.seenBy.length > 1 ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-brand-500" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-slate-300" />
                                )}
                              </span>
                            )}
                            <span className="truncate">
                              {conv.lastMessage ? (
                                conv.lastMessage.deletedForEveryone ? (
                                  <span className="italic text-slate-300">This message was deleted</span>
                                ) : conv.lastMessage.media?.url ? (
                                  `📎 [${conv.lastMessage.media.type}] ${conv.lastMessage.media.name}`
                                ) : (
                                  conv.lastMessage.text
                                )
                              ) : (
                                <span className="italic text-slate-300">No messages yet</span>
                              )}
                            </span>
                          </div>
                        )}

                        {/* Badges / Status */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {conv.isMuted && <VolumeX className="w-3.5 h-3.5 text-slate-300" />}
                          {conv.isPinned && <Pin className="w-3.5 h-3.5 text-brand-400 fill-brand-400 rotate-45" />}
                          {conv.unreadCount > 0 && (
                            <span className="h-5 min-w-5 px-1.5 bg-brand-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-md shadow-brand-500/20">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
                <Clock className="w-8 h-8 opacity-40 mb-2" />
                <p className="text-xs">No conversations found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Profile controls */}
      <div className="p-3 border-t border-slate-100 dark:border-dark-border bg-slate-50/50 dark:bg-dark-bg/20 flex items-center justify-between">
        <div
          onClick={() => setProfileDrawerOpen(true)}
          className="flex items-center gap-2 cursor-pointer hover:opacity-90 min-w-0"
        >
          <img
            src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.fullName}`}
            alt={user?.fullName}
            className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-dark-border"
          />
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{user?.fullName}</p>
            <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Online
            </p>
          </div>
        </div>

        <div className="flex gap-1.5">
          <button
            onClick={() => setSidebarView('friends')}
            title="Social / Friends"
            className="p-2 bg-white dark:bg-dark-card hover:bg-brand-50 dark:hover:bg-brand-950/20 text-slate-500 dark:text-dark-text hover:text-brand-500 rounded-xl border border-slate-200 dark:border-dark-border transition-colors"
          >
            <Users className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={() => setSidebarView('settings')}
            title="Settings"
            className="p-2 bg-white dark:bg-dark-card hover:bg-brand-50 dark:hover:bg-brand-950/20 text-slate-500 dark:text-dark-text hover:text-brand-500 rounded-xl border border-slate-200 dark:border-dark-border transition-colors"
          >
            <Settings className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={() => logout()}
            title="Sign Out"
            className="p-2 bg-white dark:bg-dark-card hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-500 dark:text-dark-text hover:text-rose-500 rounded-xl border border-slate-200 dark:border-dark-border transition-colors"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
