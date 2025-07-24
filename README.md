# Billboard Platform - The Times Square of the Internet

A global, AI-powered advertising platform that replicates the real-world "Times Square" billboard experience on the web. Users from around the world can view, create, and interact with dynamic, location-based digital ads.

## 🌟 Features

### Core Platform
- **Live Digital Billboard Display** - Dynamic rotating ads with real-time metrics
- **AI-Powered Ad Creation** - Generate text, images, and video ads using OpenAI
- **Manual Ad Upload** - Support for custom ads with file upload capabilities
- **Smart Pricing Engine** - Dynamic pricing based on location, time, demand, and slot tier
- **Calendar-Based Booking** - Interactive booking system with real-time pricing updates

### User Experience
- **Multi-Language Support** - Full internationalization with 10 languages
- **Geo-Targeting** - Location-based ad personalization and pricing
- **Real-Time Analytics** - Live click tracking, impressions, and performance metrics
- **Responsive Design** - Optimized for desktop and mobile devices

### Monetization & Growth
- **Stripe Payment Integration** - Secure payment processing for ad bookings
- **Referral System** - Viral growth mechanisms with reward tracking
- **Content-Driven Pages** - Organic traffic through /surprises, /deals, /today pages
- **Admin & Advertiser Dashboards** - Comprehensive analytics and management tools

## 🏗️ Architecture

This project follows a clean separation between frontend and backend:

```
billboard-platform/
├── frontend/          # React + Vite (Vercel-ready)
├── backend/           # Node.js + Express (Render-ready)
├── README.md          # This file
└── .gitignore         # Git ignore rules
```

### Frontend (`/frontend`)
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom cyberpunk theme
- **State Management**: TanStack Query for server state
- **Internationalization**: i18next with 10 language support
- **Deployment**: Optimized for Vercel

### Backend (`/backend`)
- **Framework**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with session management
- **AI Integration**: OpenAI API for ad generation
- **Payment Processing**: Stripe integration
- **Deployment**: Optimized for Render

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Stripe account
- OpenAI API key

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
VITE_API_URL=http://localhost:3000
VITE_STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key
```

5. Start development server:
```bash
npm run dev
```

6. Build for production:
```bash
npm run build
```

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/billboard
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
OPENAI_API_KEY=sk-your_openai_api_key
SESSION_SECRET=your_session_secret_here
```

5. Run database migrations:
```bash
npm run db:migrate
```

6. Start development server:
```bash
npm run dev
```

7. Build for production:
```bash
npm run build
```

## 🌐 Deployment

### Frontend Deployment (Vercel)

1. Connect your GitHub repository to Vercel
2. Set the root directory to `frontend`
3. Configure environment variables in Vercel dashboard:
   - `VITE_API_URL`: Your backend URL (e.g., https://your-app.render.com)
   - `VITE_STRIPE_PUBLIC_KEY`: Your Stripe publishable key

4. Deploy automatically on push to main branch

### Backend Deployment (Render)

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set the root directory to `backend`
4. Configure environment variables:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `STRIPE_SECRET_KEY`: Your Stripe secret key
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `SESSION_SECRET`: A secure random string
   - `NODE_ENV`: `production`

5. Set build command: `npm install && npm run build`
6. Set start command: `npm start`

## 📁 Project Structure

### Frontend Structure
```
frontend/
├── public/                 # Static assets
├── src/
│   ├── components/        # Reusable UI components
│   ├── pages/            # Page components
│   ├── lib/              # Utility functions
│   ├── types/            # TypeScript type definitions
│   ├── i18n/             # Internationalization files
│   └── styles/           # Global styles
├── .env.example          # Environment variables template
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── vite.config.ts        # Vite configuration
└── README.md             # Frontend documentation
```

### Backend Structure
```
backend/
├── src/
│   ├── lib/              # Shared types and constants
│   ├── services/         # Business logic services
│   └── routes/           # API route handlers
├── migrations/           # Database migrations
├── .env.example          # Environment variables template
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── drizzle.config.ts     # Database configuration
├── index.ts              # Application entry point
└── README.md             # Backend documentation
```

## 🔧 Environment Variables

### Frontend Environment Variables
- `VITE_API_URL`: Backend API URL
- `VITE_STRIPE_PUBLIC_KEY`: Stripe publishable key

### Backend Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `STRIPE_SECRET_KEY`: Stripe secret key
- `OPENAI_API_KEY`: OpenAI API key
- `SESSION_SECRET`: Session encryption secret
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 3000)

## 🎯 Key Features Implementation

### Smart Pricing Engine
The platform includes a sophisticated pricing engine that calculates ad costs based on:
- **Slot Tier**: Premium, mid-tier, or standard placement
- **Geographic Location**: Country-based multipliers
- **Time of Day**: Prime time, business hours, etc.
- **Ad Format**: Video, image, or text content
- **Campaign Duration**: Volume discounts for longer campaigns
- **Demand Level**: Dynamic pricing based on slot availability

### AI-Powered Ad Generation
- **Text Generation**: Create compelling ad copy using OpenAI
- **Image Generation**: Generate custom visuals for ads
- **Multi-language Support**: Automatic translation and localization
- **A/B Testing**: Generate multiple ad variations for optimization

### Content-Driven Growth
- **Surprise Generator** (`/surprises`): AI-powered personalized surprise ideas
- **Daily Deals Hub** (`/deals`): Aggregated deals with affiliate tracking
- **Today's Highlights** (`/today`): Personalized daily digest with weather integration

## 🔒 Security Features

- **Authentication**: Secure session-based authentication with Passport.js
- **Input Validation**: Comprehensive input validation using Zod schemas
- **SQL Injection Protection**: Parameterized queries with Drizzle ORM
- **CORS Configuration**: Proper cross-origin resource sharing setup
- **Environment Variables**: Sensitive data stored in environment variables

## 📊 Analytics & Monitoring

- **Real-time Metrics**: Live tracking of impressions, clicks, and conversions
- **Performance Analytics**: Detailed campaign performance reports
- **User Analytics**: User engagement and behavior tracking
- **Revenue Tracking**: Comprehensive financial reporting and analytics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, email support@billboard-platform.com or join our Discord community.

## 🚀 Roadmap

- [ ] Video ad support with AI generation
- [ ] Advanced targeting options (demographics, interests)
- [ ] Real-time bidding system
- [ ] Mobile app development
- [ ] Blockchain integration for ad verification
- [ ] Advanced analytics dashboard
- [ ] Multi-currency support
- [ ] API for third-party integrations

---

**Built with ❤️ by the Billboard Team**

*Transform your advertising strategy with the power of AI and global reach.*

