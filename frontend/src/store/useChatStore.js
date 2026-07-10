import { create } from 'zustand';
import { io } from 'socket.io-client';
import api from '../services/api.js';
import { playNotificationSound } from '../utils/audio.js';

export const useChatStore = create((set, get) => {
  let socketInstance = null;

  return {
    conversations: [],
    activeConversation: null,
    messages: [],
    typingUsers: {}, // conversationId -> Array of typing usernames
    onlineUserIds: [],
    isConversationsLoading: false,
    isMessagesLoading: false,
    hasMoreMessages: false,

    // Socket Client Instance
    socket: null,

    // Sound alert toggle
    soundEnabled: true,
    setSoundEnabled: (val) => set({ soundEnabled: val }),

    // Connection Socket.IO
    connectSocket: () => {
      const token = localStorage.getItem('accessToken');
      if (!token || socketInstance) return;

      const serverUrl = import.meta.env.VITE_SERVER_URL || 'https://connect-vii1.onrender.com';
      
      socketInstance = io(serverUrl, {
        auth: { token },
        transports: ['websocket'],
      });

      set({ socket: socketInstance });

      // Socket Listeners
      socketInstance.on('connect', () => {
        console.log('Connected to WebSocket server');
      });

      // Receive Online Users
      socketInstance.on('getOnlineUsers', (userIds) => {
        set({ onlineUserIds: userIds });
      });

      // Presence Status Updates
      socketInstance.on('userStatusChange', ({ userId, onlineStatus, lastSeen }) => {
        set((state) => {
          const updatedOnlineUserIds = onlineStatus
            ? Array.from(new Set([...state.onlineUserIds, userId]))
            : state.onlineUserIds.filter((id) => id !== userId);

          // Update active conversation participant status
          let updatedActiveConv = state.activeConversation;
          if (updatedActiveConv && !updatedActiveConv.isGroup) {
            updatedActiveConv = {
              ...updatedActiveConv,
              participants: updatedActiveConv.participants.map((p) =>
                p._id === userId ? { ...p, onlineStatus, lastSeen } : p
              ),
            };
          }

          // Update conversations participant status
          const updatedConvs = state.conversations.map((conv) => {
            if (conv.isGroup) return conv;
            return {
              ...conv,
              participants: conv.participants.map((p) =>
                p._id === userId ? { ...p, onlineStatus, lastSeen } : p
              ),
            };
          });

          return {
            onlineUserIds: updatedOnlineUserIds,
            activeConversation: updatedActiveConv,
            conversations: updatedConvs,
          };
        });
      });

      // Typing indicators
      socketInstance.on('typing', ({ conversationId, username }) => {
        set((state) => {
          const currentTyping = state.typingUsers[conversationId] || [];
          if (!currentTyping.includes(username)) {
            return {
              typingUsers: {
                ...state.typingUsers,
                [conversationId]: [...currentTyping, username],
              },
            };
          }
          return {};
        });
      });

      socketInstance.on('stopTyping', ({ conversationId, username }) => {
        set((state) => {
          const currentTyping = state.typingUsers[conversationId] || [];
          return {
            typingUsers: {
              ...state.typingUsers,
              [conversationId]: currentTyping.filter((name) => name !== username),
            },
          };
        });
      });

      // Real-time message receiver
      socketInstance.on('receiveMessage', (message) => {
        const activeConv = get().activeConversation;
        const currentMessages = get().messages;
        const conversations = get().conversations;

        // If message is in the active conversation
        if (activeConv && message.conversation === activeConv._id) {
          // Append message
          set({ messages: [...currentMessages, message] });

          // Send seen confirmation via socket and REST
          socketInstance.emit('messageSeen', {
            conversationId: activeConv._id,
            messageId: message._id,
            readerId: message.sender._id,
          });
          api.put(`/messages/conversations/${activeConv._id}/read`).catch(() => {});
        } else {
          // Play sound and increment unread badge if sound is enabled
          if (get().soundEnabled) {
            playNotificationSound();
          }

          // Trigger browser notification
          if (Notification.permission === 'granted') {
            new Notification(`New message from ${message.sender.fullName}`, {
              body: message.text || 'Sent an attachment',
              icon: message.sender.avatar || '/assets/avatar-placeholder.png',
            });
          }
        }

        // Update last message in conversation list
        const updatedConversations = conversations.map((conv) => {
          if (conv._id === message.conversation) {
            const count = activeConv && activeConv._id === conv._id ? conv.unreadCount : conv.unreadCount + 1;
            return {
              ...conv,
              lastMessage: message,
              unreadCount: count,
            };
          }
          return conv;
        });

        // Re-sort conversations by updated time
        updatedConversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        set({ conversations: updatedConversations });
      });

      // Real-time message edit listener
      socketInstance.on('editMessage', (updatedMessage) => {
        set((state) => {
          const updatedMessages = state.messages.map((msg) =>
            msg._id === updatedMessage._id ? updatedMessage : msg
          );
          return { messages: updatedMessages };
        });
      });

      // Real-time message delete listener
      socketInstance.on('deleteMessage', ({ messageId, text, media }) => {
        set((state) => {
          const updatedMessages = state.messages.map((msg) =>
            msg._id === messageId ? { ...msg, text, media, deletedForEveryone: true } : msg
          );
          return { messages: updatedMessages };
        });
      });

      // Real-time reactions listener
      socketInstance.on('reactionAdded', ({ messageId, reactions }) => {
        set((state) => {
          const updatedMessages = state.messages.map((msg) =>
            msg._id === messageId ? { ...msg, reactions } : msg
          );
          return { messages: updatedMessages };
        });
      });

      socketInstance.on('reactionRemoved', ({ messageId, reactions }) => {
        set((state) => {
          const updatedMessages = state.messages.map((msg) =>
            msg._id === messageId ? { ...msg, reactions } : msg
          );
          return { messages: updatedMessages };
        });
      });

      // Real-time read receipt updates
      socketInstance.on('messageSeen', ({ conversationId, readerId }) => {
        const activeConv = get().activeConversation;
        if (activeConv && activeConv._id === conversationId) {
          set((state) => {
            const updatedMessages = state.messages.map((msg) => {
              if (msg.sender._id !== readerId && !msg.seenBy.includes(readerId)) {
                return { ...msg, seenBy: [...msg.seenBy, readerId] };
              }
              return msg;
            });
            return { messages: updatedMessages };
          });
        }
      });
    },

    disconnectSocket: () => {
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
        set({ socket: null });
      }
    },

    // Fetch conversation list
    fetchConversations: async () => {
      set({ isConversationsLoading: true });
      try {
        const res = await api.get('/messages/conversations');
        set({ conversations: res.data.conversations, isConversationsLoading: false });
      } catch (err) {
        console.error('Fetch conversations error:', err.message);
        set({ isConversationsLoading: false });
      }
    },

    // Select Active Conversation
    selectConversation: async (conversation) => {
      const currentActive = get().activeConversation;
      const socket = get().socket;

      // Leave old conversation socket room
      if (currentActive && socket) {
        socket.emit('leaveRoom', currentActive._id);
      }

      set({ activeConversation: conversation, messages: [] });

      if (!conversation) return;

      // Join new conversation socket room
      if (socket) {
        socket.emit('joinRoom', conversation._id);
      }

      // Mark as read in store, socket and DB
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c._id === conversation._id ? { ...c, unreadCount: 0 } : c
        ),
      }));

      try {
        // Fetch messages for this conversation
        await get().fetchMessages(conversation._id);
        
        // Call read status endpoint
        await api.put(`/messages/conversations/${conversation._id}/read`);
      } catch (err) {
        console.error('Select conversation setup failed:', err);
      }
    },

    // Fetch Messages history
    fetchMessages: async (conversationId, skip = 0) => {
      set({ isMessagesLoading: true });
      try {
        const res = await api.get(`/messages/${conversationId}?skip=${skip}&limit=50`);
        set((state) => ({
          messages: skip === 0 ? res.data.messages : [...res.data.messages, ...state.messages],
          hasMoreMessages: res.data.hasMore,
          isMessagesLoading: false,
        }));
      } catch (err) {
        console.error('Fetch messages error:', err.message);
        set({ isMessagesLoading: false });
      }
    },

    // Send a message
    sendMessage: async (text, file = null, replyToId = null) => {
      const activeConv = get().activeConversation;
      if (!activeConv) return;

      const formData = new FormData();
      formData.append('conversationId', activeConv._id);
      if (text) formData.append('text', text);
      if (replyToId) formData.append('replyToId', replyToId);
      if (file) formData.append('media', file);

      try {
        const res = await api.post('/messages', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        // The socket emitter inside REST controller broadcasts the message
        // Local state gets updated in client when 'receiveMessage' triggers
        return res.data.message;
      } catch (err) {
        console.error('Send message error:', err.response?.data?.message || err.message);
        throw err;
      }
    },

    // Edit message
    editMessage: async (messageId, text) => {
      try {
        await api.put(`/messages/${messageId}`, { text });
      } catch (err) {
        console.error('Edit message failed:', err.message);
        throw err;
      }
    },

    // Delete message
    deleteMessage: async (messageId, deleteType = 'me') => {
      try {
        await api.delete(`/messages/${messageId}?deleteType=${deleteType}`);
        if (deleteType === 'me') {
          // Manually remove locally since deleting for me doesn't broadcast to self
          set((state) => ({
            messages: state.messages.filter((msg) => msg._id !== messageId),
          }));
        }
      } catch (err) {
        console.error('Delete message failed:', err.message);
        throw err;
      }
    },

    // Toggle message pin
    togglePinMessage: async (messageId) => {
      try {
        const res = await api.put(`/messages/${messageId}/pin`);
        return res.data.pinned;
      } catch (err) {
        console.error('Toggle message pin failed:', err.message);
        throw err;
      }
    },

    // Toggle message star
    toggleStarMessage: async (messageId) => {
      try {
        const res = await api.put(`/messages/${messageId}/star`);
        set((state) => {
          const user = useAuthStore.getState().user;
          const updatedMessages = state.messages.map((msg) => {
            if (msg._id === messageId) {
              const starredIndex = msg.starredBy.indexOf(user._id);
              const starredBy = [...msg.starredBy];
              if (starredIndex > -1) starredBy.splice(starredIndex, 1);
              else starredBy.push(user._id);
              return { ...msg, starredBy };
            }
            return msg;
          });
          return { messages: updatedMessages };
        });
        return res.data.starred;
      } catch (err) {
        console.error('Toggle message star failed:', err.message);
        throw err;
      }
    },

    // Add Reaction
    addReaction: async (messageId, emoji) => {
      try {
        await api.post(`/messages/${messageId}/reaction`, { emoji });
      } catch (err) {
        console.error('Add reaction failed:', err.message);
        throw err;
      }
    },

    // Remove Reaction
    removeReaction: async (messageId) => {
      try {
        await api.delete(`/messages/${messageId}/reaction`);
      } catch (err) {
        console.error('Remove reaction failed:', err.message);
        throw err;
      }
    },

    // Send typing indicators
    sendTypingIndicator: (isTyping) => {
      const activeConv = get().activeConversation;
      const socket = get().socket;
      const user = useAuthStore.getState().user;

      if (activeConv && socket && user) {
        const event = isTyping ? 'typing' : 'stopTyping';
        socket.emit(event, {
          conversationId: activeConv._id,
          username: user.username,
        });
      }
    },

    // Toggle Mute Conversation
    toggleMuteConversation: async (conversationId) => {
      try {
        const res = await api.put(`/messages/conversations/${conversationId}/mute`);
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c._id === conversationId ? { ...c, isMuted: res.data.isMuted } : c
          ),
          activeConversation:
            state.activeConversation?._id === conversationId
              ? { ...state.activeConversation, isMuted: res.data.isMuted }
              : state.activeConversation,
        }));
      } catch (err) {
        console.error('Mute conversation failed:', err.message);
      }
    },

    // Toggle Archive Conversation
    toggleArchiveConversation: async (conversationId) => {
      try {
        const res = await api.put(`/messages/conversations/${conversationId}/archive`);
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c._id === conversationId ? { ...c, isArchived: res.data.isArchived } : c
          ),
          activeConversation:
            state.activeConversation?._id === conversationId
              ? { ...state.activeConversation, isArchived: res.data.isArchived }
              : state.activeConversation,
        }));
      } catch (err) {
        console.error('Archive conversation failed:', err.message);
      }
    },

    // Toggle Pin Conversation
    togglePinConversation: async (conversationId) => {
      try {
        const res = await api.put(`/messages/conversations/${conversationId}/pin`);
        set((state) => {
          const updatedConversations = state.conversations.map((c) =>
            c._id === conversationId ? { ...c, isPinned: res.data.isPinned } : c
          );
          // Re-sort so pinned always float to top, followed by date
          updatedConversations.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return new Date(b.updatedAt) - new Date(a.updatedAt);
          });
          return {
            conversations: updatedConversations,
            activeConversation:
              state.activeConversation?._id === conversationId
                ? { ...state.activeConversation, isPinned: res.data.isPinned }
                : state.activeConversation,
          };
        });
      } catch (err) {
        console.error('Pin conversation failed:', err.message);
      }
    },
  };
});
