import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes';
import workspaceRoutes from './routes/workspace.routes';
import boardRoutes from './routes/board.routes';
import groupRoutes from './routes/group.routes';
import columnRoutes from './routes/column.routes';
import taskRoutes from './routes/task.routes';
import inviteRoutes from './routes/invite.routes';
import threadRoutes from './routes/thread.routes';
import notificationRoutes from './routes/notification.routes';
import { errorHandler } from './middleware/errorHandler';
import { prisma } from './lib/prisma';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware - CORS configuration
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database migration endpoint (one-time use)
app.post('/api/admin/migrate', async (req, res) => {
  try {
    console.log('🔄 Running database migration...');
    
    // Run prisma db push via child process
    const { execSync } = require('child_process');
    try {
      execSync('npx prisma db push --accept-data-loss', { 
        stdio: 'inherit',
        timeout: 120000,
        env: { ...process.env }
      });
      console.log('✅ Prisma db push completed');
    } catch (pushError: any) {
      console.log('⚠️ Prisma db push:', pushError.message);
    }

    console.log('✅ Migration complete');
    res.json({ success: true, message: 'Migration completed' });
  } catch (error: any) {
    console.error('Migration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/columns', columnRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/threads', threadRoutes);
app.use('/api/notifications', notificationRoutes);

// Error handler
app.use(errorHandler);

// Basic Socket.io connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-workspace', (workspaceId: string) => {
    socket.join(`workspace:${workspaceId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

const PORT = process.env.PORT || 3000;

// Sync database schema and start server
async function startServer() {
  try {
    // Run prisma db push to sync schema
    console.log('🔄 Running prisma db push...');
    try {
      const { execSync } = require('child_process');
      execSync('npx prisma db push --accept-data-loss', { 
        stdio: 'inherit',
        timeout: 120000 
      });
      console.log('✅ Database schema synced');
    } catch (e: any) {
      console.error('⚠️ prisma db push error:', e.message);
    }

    await prisma.$connect();
    console.log('✅ Database connected');
    
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();

export { app, httpServer, io };
