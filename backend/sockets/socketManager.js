import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Map of userId string -> Set of socketId strings (to support multiple device tabs)
export const onlineUsers = new Map();

// Helper to get socket IDs for a given user
export const getUserSockets = (userId) => {
  return onlineUsers.get(userId.toString()) || new Set();
};

let ioInstance = null;

// Socket Authentication Middleware
const socketAuth = async (socket, next) => {
  try {
    let token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (token && token.startsWith('Bearer ')) {
      token = token.split(' ')[1];
    }

    if (!token) {
      return next(new Error('Authentication failed: Token missing'));
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(new Error('Authentication failed: User not found'));
    }

    socket.user = user;
    next();
  } catch (error) {
    console.error('Socket Authentication Error:', error.message);
    next(new Error('Authentication failed: Invalid token'));
  }
};

export const initSocket = (io) => {
  ioInstance = io;
  
  // Securing WebSocket connection
  io.use(socketAuth);

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`Socket Connected: User ${socket.user.username} (${socket.id})`);

    // 1. Manage user socket map
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // 2. Set presence to online in DB
    await User.findByIdAndUpdate(userId, { onlineStatus: true, lastSeen: Date.now() });

    // Join user's personal room for receiving direct notifications (like friend requests, etc.)
    socket.join(`user_${userId}`);

    // Broadcast user online status
    socket.broadcast.emit('userStatusChange', {
      userId,
      onlineStatus: true,
      lastSeen: Date.now(),
    });

    // Send immediate list of currently online users to the connected client
    socket.emit('getOnlineUsers', Array.from(onlineUsers.keys()));

    // 3. Join Conversation Room
    socket.on('joinRoom', (conversationId) => {
      socket.join(conversationId);
      console.log(`User ${socket.user.username} joined room: ${conversationId}`);
    });

    // 4. Leave Conversation Room
    socket.on('leaveRoom', (conversationId) => {
      socket.leave(conversationId);
      console.log(`User ${socket.user.username} left room: ${conversationId}`);
    });

    // 5. Typing Indicator
    socket.on('typing', ({ conversationId, username }) => {
      socket.to(conversationId).emit('typing', { conversationId, username });
    });

    socket.on('stopTyping', ({ conversationId, username }) => {
      socket.to(conversationId).emit('stopTyping', { conversationId, username });
    });

    // 6. Message Read Receipt Event (Seen)
    socket.on('messageSeen', ({ conversationId, messageId, readerId }) => {
      socket.to(conversationId).emit('messageSeen', { conversationId, messageId, readerId });
    });

    // 7. Disconnection
    socket.on('disconnect', async () => {
      console.log(`Socket Disconnected: Socket ${socket.id}`);
      
      const userConns = onlineUsers.get(userId);
      if (userConns) {
        userConns.delete(socket.id);
        if (userConns.size === 0) {
          onlineUsers.delete(userId);
          
          // Set offline status in DB
          const lastSeen = Date.now();
          await User.findByIdAndUpdate(userId, { onlineStatus: false, lastSeen });

          // Broadcast offline presence to everyone
          socket.broadcast.emit('userStatusChange', {
            userId,
            onlineStatus: false,
            lastSeen,
          });
        }
      }
    });
  });
};

// Global emitter helper for controllers to emit real-time events
export const emitToUser = (userId, eventName, data) => {
  if (ioInstance) {
    ioInstance.to(`user_${userId.toString()}`).emit(eventName, data);
  }
};

export const emitToRoom = (roomId, eventName, data) => {
  if (ioInstance) {
    ioInstance.to(roomId.toString()).emit(eventName, data);
  }
};

export const getIO = () => ioInstance;
