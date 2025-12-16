# UBVA CRM

A full-stack CRM application built with modern technologies.

## Tech Stack

### Frontend
- **React** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling

### Backend
- **Express** - Web framework
- **Socket.io** - Real-time communication
- **TypeScript** - Type safety

### Database
- **PostgreSQL** - Database
- **Drizzle ORM** - Database ORM

## Project Structure

```
ubva-crm/
├── client/              # Frontend (React + Vite)
│   ├── components/      # React components
│   ├── pages/          # Page components
│   ├── hooks/          # Custom React hooks
│   ├── styles/         # CSS files
│   ├── App.tsx         # Main App component
│   ├── main.tsx        # Entry point
│   └── index.html      # HTML template
├── server/             # Backend (Express + Socket.io)
│   ├── routes/         # API route handlers
│   ├── utils/          # Utility functions
│   ├── db/             # Database configuration
│   └── index.ts        # Server entry point
├── migrations/         # Drizzle migrations
├── public/             # Static assets
├── vite.config.ts      # Vite configuration
├── tailwind.config.js  # Tailwind configuration
├── drizzle.config.ts   # Drizzle configuration
└── tsconfig.json       # TypeScript configuration
```

## Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ubva-crm
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Setup database**
   ```bash
   # Create database
   createdb ubva_crm
   
   # Generate and run migrations
   npm run db:generate
   npm run db:push
   ```

## Development

### Run frontend (Vite dev server)
```bash
npm run dev
```
The frontend will be available at `http://localhost:3000`

### Run backend (Express + Socket.io server)
```bash
npm run server:watch
```
The backend will be available at `http://localhost:3001`

### Database operations
```bash
# Generate migration files
npm run db:generate

# Push schema changes to database
npm run db:push

# Open Drizzle Studio (database GUI)
npm run db:studio
```

## Build for Production

```bash
npm run build
```

This will create optimized production builds in the `dist` directory.

## Features

- ✅ Full-stack TypeScript
- ✅ Hot Module Replacement (HMR) with Vite
- ✅ Real-time communication with Socket.io
- ✅ Type-safe database queries with Drizzle ORM
- ✅ Responsive UI with Tailwind CSS
- ✅ Shared node_modules for frontend and backend
- ✅ Separated routes and utilities
- ✅ RESTful API with Express

## API Endpoints

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create a new user

### Contacts
- `GET /api/contacts` - Get all contacts
- `POST /api/contacts` - Create a new contact
- `PUT /api/contacts/:id` - Update a contact
- `DELETE /api/contacts/:id` - Delete a contact

## License

ISC