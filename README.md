# Od Sifra - Property Management App

A full-stack property management and project-tracking application with mobile (iOS/Android) and web interfaces.

## Features

- **Multi-role Authentication**: Admin, Employee, and Customer roles with invitation-based registration
- **Property Management**: Track properties with rent, costs, tenants, and rental dates
- **Renovation Tracking**: Manage renovations with step-by-step progress tracking
- **Real-time Messaging**: In-app messaging between employees and customers
- **Notifications**: Status change and visit notifications
- **Admin Dashboard**: Overview of all customers, total rent, and onboarding metrics
- **Dark/Light Mode**: GitHub-style theming with brand colors

## Tech Stack

- **Mobile**: React Native + Expo (iOS & Android)
- **Web**: Next.js 14 + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Real-time**: Socket.io
- **Authentication**: JWT

## Brand Colors

- Primary (Accent): `#CFFC92` (Lime Green)
- Secondary: `#00353B` (Dark Teal)

## Project Structure

```
od-sifra/
├── backend/          # Node.js Express API
├── web/              # Next.js web application
├── mobile/           # React Native Expo app
└── shared/           # Shared TypeScript types
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Expo CLI (`npm install -g expo-cli`) - for mobile development

### Installation

```bash
# Install all dependencies
npm install

# Setup database
cd backend
cp .env.example .env
# Edit .env with your database credentials
npm run db:migrate
npm run db:seed

# Start backend (runs on port 3000)
npm run dev
```

### Running the Web App

```bash
# In another terminal
cd web
cp .env.example .env
npm run dev
# Open http://localhost:3001
```

### Running the Mobile App

```bash
# In another terminal
cd mobile
npm start

# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Expo Go on physical device
# Scan QR code with Expo Go app
```

## API Documentation

See [backend/README.md](backend/README.md) for API endpoints documentation.

## Deployment

### Firebase Deployment

The app is configured for Firebase deployment:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Create a new Firebase project (if needed)
firebase projects:create od-sifra

# Deploy everything
firebase deploy

# Deploy only web app
firebase deploy --only hosting

# Deploy only functions (API)
firebase deploy --only functions
```

#### Firebase Setup Steps

1. **Create Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project named "od-sifra"
   - Enable Cloud Functions (requires Blaze plan)

2. **Configure GitHub Secrets** (for CI/CD):
   - `FIREBASE_SERVICE_ACCOUNT`: Service account JSON for hosting
   - `FIREBASE_TOKEN`: Token from `firebase login:ci`
   - `FIREBASE_API_URL`: Your deployed API URL

3. **Database**:
   - For production, use a managed PostgreSQL service (e.g., Cloud SQL, Supabase, Neon)
   - Update `DATABASE_URL` in Firebase Functions environment

4. **Environment Variables**:
   ```bash
   # Set functions config
   firebase functions:config:set database.url="your-database-url" jwt.secret="your-jwt-secret"
   ```

### Fly.io Deployment (Recommended)

The app is configured for Fly.io deployment:

```bash
# Install Fly CLI
brew install flyctl

# Login to Fly.io
fly auth login

# Create the apps (first time only)
cd backend && fly apps create od-sifra-api
cd ../web && fly apps create od-sifra-web

# Create a PostgreSQL database
fly postgres create --name od-sifra-db

# Attach database to API
cd backend && fly postgres attach od-sifra-db

# Set secrets for the API
fly secrets set JWT_SECRET="your-jwt-secret" -a od-sifra-api

# Deploy the API
cd backend && fly deploy

# Set the API URL for the web app
fly secrets set NEXT_PUBLIC_API_URL="https://od-sifra-api.fly.dev/api" -a od-sifra-web

# Deploy the web app
cd web && fly deploy
```

#### GitHub Actions (CI/CD)

Add `FLY_API_TOKEN` secret to your GitHub repo:
```bash
fly tokens create deploy -x 999999h
```

### Alternative: Docker Deployment

The app also supports Docker deployment. See `docker-compose.yml` for local development.

## License

MIT
