import './config/env.js';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Config
import connectDB from './config/db.js';

// Middlewares
import { notFound, errorHandler } from './middleware/error.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// Sockets
import { initSocket } from './sockets/socketManager.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import friendRoutes from './routes/friendRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[REQUEST LOG] ${req.method} ${req.originalUrl} - Origin: ${req.headers.origin}`);
  next();
});

const server = http.createServer(app);

// Configure dynamic CORS origin validation
const corsOriginCheck = (origin, callback) => {
  if (!origin) return callback(null, true);
  
  const isAllowed = origin === 'https://connect-vfe9.vercel.app' ||
                    origin.endsWith('.vercel.app') ||
                    origin.startsWith('http://localhost:') ||
                    origin.startsWith('http://127.0.0.1:') ||
                    (process.env.CLIENT_URL && origin === process.env.CLIENT_URL);
                    
  if (isAllowed) {
    callback(null, true);
  } else {
    callback(new Error('Not allowed by CORS'));
  }
};

const corsOptions = {
  origin: corsOriginCheck,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

// Initialize Socket.IO
const io = new Server(server, {
  cors: corsOptions,
  maxHttpBufferSize: 1e8, // Allow up to 100MB message sizes (for large document/video transfers)
});

initSocket(io);

// Security & Standard Middlewares (CORS registered BEFORE all other route handlers)
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle OPTIONS preflight requests
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Apply global rate limiting to all REST APIs
app.use('/api', apiLimiter);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/notifications', notificationRoutes);

// Base route for server status
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Gaga Connect backend server is healthy and running.' });
});

// Error handling fallback
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
