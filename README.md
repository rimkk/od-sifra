# Od Sifra - Project Management Platform

A multi-tenant project management platform inspired by Monday.com, built for property management and project tracking.

## Features

### Core Features
- **Multi-tenant Workspaces** - Each company has its own workspace with isolated data
- **Role-based Access Control** - Admin, Employee, and Customer roles with appropriate permissions
- **Monday.com-style Boards** - Table view with groups, columns, and inline editing
- **Custom Fields** - Status, Text, Number, Date, Money, Person, Checkbox columns
- **Real-time Messaging** - In-app chat between team members
- **Notifications** - Activity notifications and alerts
- **Invite System** - Email-based invitations with role assignment

### Board Types
- **Property Board** - Track properties, rent, tenants, and occupancy
- **Project Board** - Manage tasks, assignments, and deadlines
- **CRM Board** - Track leads and customer relationships
- **General Board** - Flexible board for any use case

### User Roles
- **Admin (Owner)** - Full access to workspace, can invite employees and customers
- **Employee** - Can manage boards, tasks, and invite customers
- **Customer** - Can view assigned boards and tasks only

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT (JSON Web Tokens)
- **Real-time**: Socket.io
- **State Management**: Zustand

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Environment Variables

Create `.env` files:

**Backend** (`backend/.env`):
```env
DATABASE_URL="postgresql://user:password@localhost:5432/odsifra"
JWT_SECRET="your-super-secret-jwt-key"
PORT=3000
```

**Frontend** (`web/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
cd backend && npx prisma generate

# Run database migrations
npx prisma db push

# Seed demo data (optional)
npm run db:seed
```

### Running Locally

```bash
# Start backend (from root)
npm run dev:backend

# Start frontend (in another terminal)
npm run dev:web
```

### Docker Setup

```bash
# Build and run with Docker Compose
docker-compose up -d

# Access the app at http://localhost:3001
```

## Demo Accounts

After running the seed script:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@odsifra.com | password123 |
| Employee | employee@odsifra.com | password123 |
| Customer | customer@example.com | password123 |

## Project Structure

```
od-sifra/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── seed.ts          # Demo data seed
│   └── src/
│       ├── routes/          # API routes
│       ├── middleware/      # Auth & validation
│       └── socket/          # Real-time handlers
├── web/
│   └── src/
│       ├── app/             # Next.js pages
│       ├── components/      # UI components
│       ├── lib/             # API client
│       └── stores/          # Zustand stores
└── docker-compose.yml
```

## API Routes

### Auth
- `POST /api/auth/setup` - First-time admin setup
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register (with invite token)
- `GET /api/auth/me` - Get current user

### Workspaces
- `GET /api/workspaces` - List user's workspaces
- `POST /api/workspaces` - Create workspace (Admin)
- `GET /api/workspaces/:id/members` - List members

### Boards
- `GET /api/boards/workspace/:id` - List boards
- `GET /api/boards/:id` - Get board with full data
- `POST /api/boards` - Create board
- `PATCH /api/boards/:id` - Update board

### Tasks
- `POST /api/tasks` - Create task
- `PATCH /api/tasks/:id` - Update task
- `PATCH /api/tasks/:id/field/:columnId` - Update field value
- `POST /api/tasks/:id/comments` - Add comment

### Invites
- `POST /api/invites` - Create invite
- `GET /api/invites/token/:token` - Validate invite

### Messages
- `GET /api/threads` - List conversations
- `POST /api/threads` - Create thread
- `POST /api/threads/:id/messages` - Send message

## Permissions

| Action | Admin | Employee | Customer |
|--------|-------|----------|----------|
| Create workspace | ✅ | ❌ | ❌ |
| Create boards | ✅ | ✅ | ❌ |
| Invite employees | ✅ | ❌ | ❌ |
| Invite customers | ✅ | ✅ | ❌ |
| View all boards | ✅ | ✅ | ❌ |
| View assigned boards | ✅ | ✅ | ✅ |
| Edit tasks | ✅ | ✅ | ⚠️* |
| Send messages | ✅ | ✅ | ✅ |

*Customers can only edit if granted edit permission on the board

## Next Steps for Scaling

1. **File Uploads** - Add S3/Cloudinary for task attachments
2. **Email Notifications** - Send email alerts for important events
3. **Activity Feed** - Show timeline of all workspace activity
4. **Board Templates** - Save custom board configurations
5. **Kanban View** - Add drag-and-drop kanban board view
6. **Gantt Charts** - Timeline view for project planning
7. **Mobile App** - React Native mobile application
8. **Webhooks** - Integration with external services
9. **Reports** - Generate PDF reports and analytics
10. **Two-Factor Auth** - Enhanced security with 2FA

## License

MIT
