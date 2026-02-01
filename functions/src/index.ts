import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';

// Initialize Firebase Admin
admin.initializeApp();

const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Note: For full deployment, copy route files from backend/src/routes
// and service files from backend/src/services
// For now, this is a placeholder that shows the structure

app.get('/api', (req, res) => {
  res.json({ 
    message: 'Od Sifra API',
    version: '1.0.0',
    endpoints: [
      '/api/auth',
      '/api/users',
      '/api/properties',
      '/api/renovations',
      '/api/messages',
      '/api/notifications',
      '/api/admin',
      '/api/invitations',
      '/api/customer-accounts'
    ]
  });
});

// Export the Express app as a Firebase Function
export const api = functions.https.onRequest(app);
