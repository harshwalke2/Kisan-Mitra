# AgroConnect - Smart Farming & Direct Market Platform

![AgroConnect Logo](https://via.placeholder.com/150x150/10b981/ffffff?text=AC)

AgroConnect is a comprehensive, AI-powered agriculture platform designed to empower farmers with technology, market access, and community support. Built with modern web technologies, it offers real-time features, multilingual support, and scalable architecture.

## Features

### Core Modules

1. **Farm Health Monitoring (AI-Based)**
   - AI-powered crop disease detection via image analysis
   - Real-time weather monitoring and forecasting
   - Soil health tracking and recommendations
   - Fire/theft detection alerts
   - Smart AI assistant chatbot

2. **Crop Market Intelligence**
   - Live crop price tracking
   - Demand and supply analysis
   - AI-powered price predictions
   - Market trend visualization
   - Overproduction alerts

3. **Tools Lending Marketplace**
   - List and rent farm equipment
   - Calendar-based booking system
   - Rating and review system
   - Farmland rental listings

4. **Direct Crop Selling Marketplace**
   - Sell crops directly to buyers (no middlemen)
   - Location-based filtering
   - Order tracking system
   - Wishlist and trending crops

5. **Real-Time Chat System**
   - One-to-one and group messaging
   - Online status indicators
   - Media sharing (images/videos)
   - Chat history storage

6. **Government Schemes Portal**
   - Browse central and state schemes
   - Eligibility checker
   - Application tracking
   - Deadline reminders

### Additional Features

- **Multilingual Support**: Hindi, Marathi, English, Gujarati, Bengali
- **Role-Based Access**: Farmer and Admin roles
- **Real-Time Notifications**: Push, SMS, and email alerts
- **Dark Mode**: Full dark theme support
- **Mobile-First Design**: Fully responsive interface
- **JWT Authentication**: Secure login system
- **Cloud Ready**: Deployable to AWS, GCP, Azure

## Tech Stack

### Frontend
- **Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS 3.4
- **UI Components**: shadcn/ui + Radix UI
- **State Management**: Zustand
- **Charts**: Recharts
- **Routing**: React Router
- **Build Tool**: Vite 7

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL 14+
- **ORM**: Knex.js
- **Real-Time**: Socket.io
- **Authentication**: JWT + bcrypt
- **Validation**: express-validator
- **Logging**: Winston

### AI Integration
- Image analysis for disease detection (API-ready)
- Price prediction models
- Crop recommendation engine
- Weather-based farming advice

## Project Structure

```
agroconnect/
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── sections/       # Page sections
│   │   ├── stores/         # Zustand state stores
│   │   ├── hooks/          # Custom React hooks
│   │   ├── types/          # TypeScript types
│   │   └── i18n/           # Internationalization
│   ├── public/             # Static assets
│   └── package.json
│
├── backend/                # Node.js backend
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Express middleware
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utility functions
│   │   └── websocket/      # Socket.io handlers
│   ├── uploads/            # File uploads
│   └── package.json
│
├── database/
│   ├── migrations/         # Knex migrations
│   ├── seeds/              # Database seeds
│   └── schemas/            # ER diagrams
│
├── docs/
│   ├── API_DOCUMENTATION.md
│   └── DEPLOYMENT_GUIDE.md
│
└── docker-compose.yml
```

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Git

### Frontend Setup

```bash
# Navigate to frontend directory
cd app

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
npm run db:migrate

# Seed initial data
npm run db:seed

# Start development server
npm run dev

# Build for production
npm run build
npm start
```

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Server
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=agroconnect
DB_SSL=false

# JWT
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# External APIs
WEATHER_API_KEY=your_weather_api_key
AI_API_KEY=your_ai_api_key
```

## Database Schema

### Core Tables
- `users` - User accounts and profiles
- `crop_health_records` - Crop health monitoring
- `farm_alerts` - Farm-related alerts
- `crop_prices` - Market price data
- `crop_listings` - Marketplace listings
- `tools` - Equipment listings
- `tool_bookings` - Rental bookings
- `chats` - Chat conversations
- `messages` - Chat messages
- `government_schemes` - Scheme information
- `notifications` - User notifications

See `database/schemas/` for complete ER diagram.

## API Documentation

Full API documentation is available in `docs/API_DOCUMENTATION.md`.

### Authentication
- JWT-based authentication
- Role-based access control (RBAC)
- Secure password hashing with bcrypt

### Endpoints
- `/api/auth` - Authentication
- `/api/users` - User management
- `/api/farm` - Farm health monitoring
- `/api/market` - Market intelligence
- `/api/tools` - Tools marketplace
- `/api/chat` - Messaging
- `/api/schemes` - Government schemes
- `/api/notifications` - Notifications

## Deployment

See `docs/DEPLOYMENT_GUIDE.md` for detailed deployment instructions.

### Quick Deploy (Docker)

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- Follow ESLint configuration
- Use TypeScript strict mode
- Write meaningful commit messages
- Add tests for new features

## Testing

```bash
# Run frontend tests
cd app && npm test

# Run backend tests
cd backend && npm test

# Run e2e tests
npm run test:e2e
```

## Security

- All passwords are hashed with bcrypt
- JWT tokens for authentication
- Rate limiting on API endpoints
- Input validation with express-validator
- CORS configuration
- Helmet.js for security headers

## Performance

- Lazy loading of components
- Image optimization
- Database indexing
- Redis caching (optional)
- CDN for static assets

## Monitoring

- Winston logging
- Error tracking
- Performance monitoring
- Real-time analytics

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

- Email: support@agroconnect.com
- Helpline: 1800-XXX-XXXX
- Documentation: https://docs.agroconnect.com

## Acknowledgments

- Thanks to all contributors
- Inspired by the farming community of India
- Built with love for farmers

---

**Made with ❤️ for Indian Farmers**

[Website](https://agroconnect.com) • [Documentation](https://docs.agroconnect.com) • [API Reference](https://api.agroconnect.com)
