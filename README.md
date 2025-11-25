# Recipe Chef 🧑‍🍳

A mobile-first Progressive Web App (PWA) for managing recipes with AI-powered search, meal planning, and smart import capabilities.

## Features

- **Personal Cookbook**: Organize your favorite recipes with fuzzy search
- **Web Import**: Import recipes from any website using Schema.org parsing
- **AI-Powered Search**: Find recipes using natural language queries
- **Chef Tony**: Animated French chef avatar with rotating greetings and tips
- **Meal Planning**: Calendar-based menu planning with shopping list generation
- **Recipe Scaling**: Scale ingredient amounts for different serving sizes
- **PDF Export**: Print recipes to PDF for offline use
- **Offline Support**: PWA with offline caching and service worker
- **Voice Search**: Use voice commands to search recipes
- **Trial System**: 14-day free trial with optional AI subscription

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + TailwindCSS
- **UI Components**: Radix UI + shadcn/ui + Framer Motion
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth with OAuth support
- **Payments**: Paddle (one-time + subscription)
- **AI**: OpenAI API for recipe search and Q&A
- **Import**: Schema.org, Microdata, RDFa, and h-recipe parsing
- **PDF Generation**: React PDF Renderer
- **PWA**: Next PWA with service worker and offline support

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo>
cd recipe-chef
npm install
```

### 2. Environment Setup

Create a `.env.local` file with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Paddle Hosted Checkout Configuration (optional for payments)
NEXT_PUBLIC_PADDLE_MONTHLY_CHECKOUT_URL=https://sandbox-pay.paddle.io/hsc_xxxxx
NEXT_PUBLIC_PADDLE_ANNUAL_CHECKOUT_URL=https://sandbox-pay.paddle.io/hsc_xxxxx

# Paddle Webhook Configuration (for payment processing)
PADDLE_API_KEY=your_paddle_api_key
PADDLE_WEBHOOK_SECRET=your_paddle_webhook_secret

# App Configuration
APP_BASE_URL=http://localhost:3002
WEB_SHARE_TARGET=true
```

### 3. Database Setup

1. Create a new Supabase project
2. Run the SQL schema from `supabase-schema.sql` in the Supabase SQL editor
3. Enable Row Level Security on all tables
4. Configure OAuth providers in Supabase Auth settings

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the app.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── auth/              # Authentication pages
│   ├── cookbook/          # My Cookbook page
│   ├── add/               # Recipe import page
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── chef-ouioui.tsx   # Chef avatar component
├── lib/                   # Utility libraries
│   ├── supabase.ts       # Supabase client
│   ├── auth.ts           # Authentication helpers
│   ├── fetchHtml.ts      # HTML fetching utility
│   ├── jsonld.ts         # Recipe parsing logic
│   ├── units.ts          # Unit conversion utilities
│   ├── pdf.ts            # PDF generation
│   └── utils.ts          # General utilities
└── public/               # Static assets
    └── manifest.json     # PWA manifest
```

## Key Features Implementation

### Recipe Import Pipeline

The app supports importing recipes from any website using multiple parsing strategies:

1. **JSON-LD**: Structured data in `<script type="application/ld+json">`
2. **Microdata**: HTML attributes like `itemprop`
3. **RDFa**: Resource Description Framework attributes
4. **h-recipe**: Microformat class-based parsing
5. **Heuristic**: Fallback text parsing for basic recipe extraction

### Chef Tony Avatar

An animated French chef character that:
- Sways gently with Framer Motion animations
- Blinks periodically (7-10 second intervals)
- Displays rotating greetings, jokes, and cooking tips
- Uses weighted random selection from database

### Search & Matching

- **Fuzzy Search**: PostgreSQL trigram matching for recipe titles
- **Recipe Finder**: Multi-faceted filtering with scoring algorithm
- **AI Fallback**: OpenAI integration for natural language recipe queries
- **Voice Search**: Web Speech API for hands-free searching

### Offline Support

- **Service Worker**: Caches app shell and assets
- **IndexedDB**: Offline storage for user recipes
- **Background Sync**: Queue actions when offline, sync when online
- **Installable**: PWA manifest for mobile app-like experience

## Database Schema

The app uses a comprehensive PostgreSQL schema with:

- **User Management**: Profiles, roles, trial tracking
- **Recipe Storage**: Global (moderated) and user (personal) recipes
- **Taxonomy**: Cuisines, meal types, ingredient categories
- **Relationships**: Many-to-many for ingredients, equipment, tags
- **Analytics**: Ratings, AI feedback, import logs
- **Planning**: Meal calendar and shopping lists

## API Routes

- `POST /api/import-recipe` - Import recipe from URL
- `GET /api/ouioui/random` - Get random Chef Tony message
- `POST /api/search/my` - Search user's cookbook
- `POST /api/search/global` - Recipe Finder with scoring
- `POST /api/ai/answer` - AI-powered recipe Q&A
- `POST /api/pdf/recipe` - Generate recipe PDF
- `POST /api/paddle/webhook` - Handle payment events

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms

The app is a standard Next.js application and can be deployed to:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify
- Any Node.js hosting provider

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@recipechef.app or create an issue in the GitHub repository.

---

Built with ❤️ using Next.js, Supabase, and modern web technologies.