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

The app is configured for deployment with JFrog Fly. See deployment configuration in the respective directories.

## License

MIT
