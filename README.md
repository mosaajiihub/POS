# Mosaajii POS System

A comprehensive Point of Sale system designed for both desktop and mobile browser platforms. The system provides complete business management capabilities including retail operations, inventory management, financial tracking, and user administration with OTP-based access control.

## Features

- **Admin Panel**: User management with OTP-based access control and payment verification
- **POS Terminal**: Responsive sales interface for desktop and mobile devices
- **Inventory Management**: Real-time stock tracking, purchase orders, and supplier management
- **Financial Reporting**: Comprehensive profit analysis and expense tracking
- **Customer Management**: CRM capabilities with loyalty programs
- **Service Management**: Appointment scheduling and service billing
- **Multi-platform**: Progressive Web App (PWA) with offline capabilities

## Tech Stack

### Frontend
- **React.js** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Query** for data fetching
- **Zustand** for state management
- **PWA** capabilities with service worker

### Backend
- **Node.js** with Express.js
- **TypeScript** for type safety
- **PostgreSQL** for primary database
- **Redis** for session management and OTP storage
- **Prisma** as ORM
- **JWT** for authentication

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v13 or higher)
- Redis (v6 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mosaajii-pos
```

2. Install dependencies:
```bash
npm run install:all
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up the database:
```bash
cd server
npx prisma migrate dev
npx prisma generate
npm run db:seed
```

5. Start the development servers:
```bash
npm run dev
```

This will start:
- Frontend development server on http://localhost:3000
- Backend API server on http://localhost:5000

### Environment Variables

Copy `.env.example` to `.env` and configure the following:

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `SMTP_*`: Email configuration for OTP delivery
- `TWILIO_*`: SMS configuration for OTP delivery

## Project Structure

```
mosaajii-pos/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── stores/         # Zustand stores
│   │   ├── utils/          # Utility functions
│   │   └── test/           # Test utilities
│   └── public/             # Static assets
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utility functions
│   │   └── test/           # Test files
│   └── prisma/             # Database schema and migrations
└── docs/                   # Documentation
```

## Development

### Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run client:dev` - Start only the frontend development server
- `npm run server:dev` - Start only the backend development server
- `npm run build` - Build both frontend and backend for production
- `npm run test` - Run tests for both frontend and backend
- `npm run lint` - Run ESLint for both frontend and backend

### Database Management

- `npm run db:migrate` - Run database migrations
- `npm run db:generate` - Generate Prisma client
- `npm run db:seed` - Seed the database with initial data

## API Documentation

The API follows RESTful conventions and includes the following main endpoints:

- `/api/auth` - Authentication and user management
- `/api/users` - User CRUD operations
- `/api/products` - Product management
- `/api/sales` - Sales transactions
- `/api/customers` - Customer management
- `/api/reports` - Financial and inventory reports

## Testing

The project uses Vitest for testing:

```bash
# Run all tests
npm run test

# Run frontend tests only
npm run test:client

# Run backend tests only
npm run test:server
```

## Deployment

### Production Build

```bash
npm run build
```

### Environment Setup

Ensure the following environment variables are set in production:

- Set `NODE_ENV=production`
- Configure secure `JWT_SECRET`
- Set up production database and Redis instances
- Configure email/SMS services for OTP delivery

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions, please contact the development team or create an issue in the repository.