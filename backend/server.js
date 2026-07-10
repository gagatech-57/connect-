import './config/env.js';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

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

// Validate required environment variables at startup
const hasDB = process.env.MONGO_URI || process.env.MONGODB_URI;
const hasJWT = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET;

if (!hasDB) {
  console.error("FATAL STARTUP ERROR: Database connection string (MONGO_URI or MONGODB_URI) is missing.");
  process.exit(1);
}

if (!hasJWT) {
  console.warn("WARNING: JWT secret is missing. Falling back to default development secret key.");
  process.env.JWT_SECRET = 'gaga_access_key_123_dev_secret_key';
  process.env.JWT_ACCESS_SECRET = 'gaga_access_key_123_dev_secret_key';
  process.env.JWT_REFRESH_SECRET = 'gaga_refresh_key_123_dev_secret_key';
}

// Connect to Database
connectDB();

const app = express();
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

// 1. CORS Middleware (Mounted FIRST)
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // OPTIONS preflight

// 2. Parser Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 3. Security Middleware
app.use(helmet());

// 4. Request Logging Middleware (logs Method, URL, Origin, and Status Code on finish)
app.use((req, res, next) => {
  res.on('finish', () => {
    console.log(`[REQUEST] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Origin: ${req.headers.origin || 'N/A'}`);
  });
  next();
});

// 5. Health Endpoints
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend is running"
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: "ok"
  });
});

// Apply global rate limiting to all REST APIs under /api
app.use('/api', apiLimiter);

// 6. Registered API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/notifications', notificationRoutes);

// 7. Error Handling Fallbacks (Mounted AFTER all routes)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`✓ Server Running on port ${PORT}`);
  console.log(`✓ Registered Routes: /api/auth, /api/users, /api/friends, /api/messages, /api/groups, /api/notifications`);
  console.log(`✓ CORS Enabled for: https://connect-vfe9.vercel.app, *.vercel.app, and localhost`);
});
