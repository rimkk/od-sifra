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

// Database migration endpoint - drops and recreates all tables with prisma
app.post('/api/admin/migrate', async (req, res) => {
  try {
    console.log('🔄 Running database migration...');
    const results: string[] = [];
    const { execSync } = require('child_process');
    
    // Drop tables except users to allow prisma db push to recreate with correct types
    const tablesToDrop = [
      'notifications', 'messages', 'thread_participants', 'message_threads',
      'invites', 'activity_logs', 'comments', 'sub_tasks', 'task_assignments',
      'task_field_values', 'tasks', 'columns', 'groups', 'board_members', 'boards',
      'workspace_members', 'workspaces'
      // Note: NOT dropping 'users' to preserve admin account
    ];
    
    for (const table of tablesToDrop) {
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${table}" CASCADE`)
        .catch(() => {});
    }
    results.push('dropped old tables');
    
    // Run prisma db push
    try {
      execSync('npx prisma db push --accept-data-loss --skip-generate', { 
        stdio: 'pipe',
        timeout: 120000 
      });
      results.push('prisma db push ✓');
      return res.json({ success: true, message: 'Full schema sync completed', results });
    } catch (e: any) {
      results.push('prisma failed: ' + (e.stderr?.toString() || e.message));
    }
    
    // Create all tables
    const tables = [
      `CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, description TEXT,
        logo_url TEXT, default_currency TEXT DEFAULT 'USD', settings JSONB,
        is_active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS workspace_members (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        workspace_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT DEFAULT 'CUSTOMER',
        joined_at TIMESTAMP DEFAULT NOW(), is_active BOOLEAN DEFAULT true, UNIQUE(workspace_id, user_id)
      )`,
      `CREATE TABLE IF NOT EXISTS boards (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        workspace_id TEXT NOT NULL, created_by_id TEXT NOT NULL, name TEXT NOT NULL,
        description TEXT, type TEXT DEFAULT 'GENERAL', color TEXT, icon TEXT,
        is_template BOOLEAN DEFAULT false, is_public BOOLEAN DEFAULT false, settings JSONB,
        is_active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS board_members (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        board_id TEXT NOT NULL, user_id TEXT NOT NULL, can_edit BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(), UNIQUE(board_id, user_id)
      )`,
      `CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        board_id TEXT NOT NULL, name TEXT NOT NULL, color TEXT, position INT DEFAULT 0,
        collapsed BOOLEAN DEFAULT false, is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS columns (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        board_id TEXT NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL, width INT DEFAULT 150,
        position INT DEFAULT 0, settings JSONB, is_required BOOLEAN DEFAULT false, is_visible BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        group_id TEXT NOT NULL, created_by_id TEXT NOT NULL, name TEXT NOT NULL,
        position INT DEFAULT 0, is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS task_field_values (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        task_id TEXT NOT NULL, column_id TEXT NOT NULL, value JSONB,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW(), UNIQUE(task_id, column_id)
      )`,
      `CREATE TABLE IF NOT EXISTS task_assignments (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        task_id TEXT NOT NULL, user_id TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW(), UNIQUE(task_id, user_id)
      )`,
      `CREATE TABLE IF NOT EXISTS sub_tasks (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        task_id TEXT NOT NULL, name TEXT NOT NULL, is_completed BOOLEAN DEFAULT false,
        position INT DEFAULT 0, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        task_id TEXT NOT NULL, user_id TEXT NOT NULL, content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        task_id TEXT, user_id TEXT NOT NULL, action TEXT NOT NULL, details JSONB, created_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS invites (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        workspace_id TEXT NOT NULL, email TEXT NOT NULL, role TEXT DEFAULT 'CUSTOMER',
        token TEXT UNIQUE NOT NULL, status TEXT DEFAULT 'PENDING', invited_by_id TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL, accepted_at TIMESTAMP, created_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS message_threads (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        workspace_id TEXT NOT NULL, title TEXT, is_group BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS thread_participants (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        thread_id TEXT NOT NULL, user_id TEXT NOT NULL, last_read_at TIMESTAMP, joined_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(thread_id, user_id)
      )`,
      `CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        thread_id TEXT NOT NULL, sender_id TEXT NOT NULL, content TEXT NOT NULL,
        is_edited BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT NOT NULL, type TEXT NOT NULL, title TEXT NOT NULL, message TEXT, link TEXT,
        is_read BOOLEAN DEFAULT false, data JSONB, created_at TIMESTAMP DEFAULT NOW()
      )`
    ];

    for (const sql of tables) {
      const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1] || 'unknown';
      await prisma.$executeRawUnsafe(sql)
        .then(() => results.push(`${tableName} ✓`))
        .catch((e: any) => results.push(`${tableName}: ${e.message}`));
    }

    // Fix UserRole enum - add missing values
    const enumValues = ['OWNER_ADMIN', 'ADMIN', 'EMPLOYEE', 'CUSTOMER'];
    for (const val of enumValues) {
      await prisma.$executeRawUnsafe(`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS '${val}'`)
        .then(() => results.push(`enum ${val} ✓`))
        .catch(() => {}); // Ignore if already exists
    }

    console.log('✅ Migration complete:', results);
    res.json({ success: true, message: 'Migration completed', results });
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
