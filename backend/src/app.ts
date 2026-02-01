import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import propertyRoutes from './routes/property.routes';
import renovationRoutes from './routes/renovation.routes';
import messageRoutes from './routes/message.routes';
import notificationRoutes from './routes/notification.routes';
import adminRoutes from './routes/admin.routes';
import invitationRoutes from './routes/invitation.routes';
import customerAccountRoutes from './routes/customerAccounts';
import { errorHandler } from './middleware/errorHandler';
import { setupSocketHandlers } from './socket/handlers';
import { prisma } from './lib/prisma';

// Auto-seed admin user on startup
async function seedAdminUser() {
  try {
    const adminEmail = 'moria.mann97@gmail.com';
    const passwordHash = await bcrypt.hash('1234567', 12);
    
    // Use upsert to create or update admin user
    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        passwordHash,
        name: 'Moria Mann',
        role: 'ADMIN',
        isActive: true,
      },
      create: {
        email: adminEmail,
        passwordHash,
        name: 'Moria Mann',
        role: 'ADMIN',
        isActive: true,
      },
    });
    console.log('✅ Admin user ready:', admin.email);
  } catch (error) {
    console.error('⚠️ Could not seed admin user:', error);
  }
}

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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/renovations', renovationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/customer-accounts', customerAccountRoutes);

// Error handler
app.use(errorHandler);

// Socket.io handlers
setupSocketHandlers(io);

// Make io accessible to routes
app.set('io', io);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, async () => {
  console.log(`🚀 Od Sifra API running on port ${PORT}`);
  console.log(`📡 Socket.io ready for connections`);
  
  // Seed admin user on startup
  await seedAdminUser();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { app, io };
