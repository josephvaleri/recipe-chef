# Recipe Chef - Complete Context Summary for New Agent

## 🍳 Application Overview

**Recipe Chef** is a comprehensive recipe management and meal planning Progressive Web App (PWA) built with modern web technologies. It's designed as a mobile-first application with both web and native mobile app capabilities through Capacitor.

### Core Value Proposition
- **Personal Recipe Management**: Import, organize, and manage personal recipe collections
- **AI-Powered Discovery**: Find recipes using natural language queries and ingredient-based matching
- **Meal Planning**: Calendar-based meal planning with automatic shopping list generation
- **Smart Import**: Import recipes from any website with intelligent parsing
- **Gamification**: Badge system to encourage user engagement and recipe creation

---

## 🏗️ Technical Architecture

### Frontend Stack
- **Framework**: Next.js 15.5.4 with Turbopack for fast development
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS with custom components
- **UI Components**: Radix UI + shadcn/ui for accessible design
- **Animations**: Framer Motion for smooth interactions
- **Icons**: Lucide React
- **State Management**: React hooks and context

### Backend & Database
- **Database**: Supabase (PostgreSQL) with advanced features
- **Authentication**: Supabase Auth with OAuth support
- **Real-time**: Supabase real-time subscriptions
- **Security**: Row Level Security (RLS) on all tables
- **API**: Next.js API routes with serverless functions

### Mobile Support
- **Hybrid App**: Capacitor 7 for iOS/Android deployment
- **PWA**: Service worker, offline support, installable
- **Responsive**: Mobile-first design with desktop optimization

### External Services
- **AI**: OpenAI API for recipe search and Q&A
- **Payments**: Paddle for subscriptions and one-time purchases
- **Import**: Schema.org, Microdata, RDFa, h-recipe parsing

---

## 🎯 Core Features & Pages

### 1. **Homepage** (`/`)
- Chef Tony animated avatar with rotating greetings
- Quick access to main features
- User onboarding and trial information

### 2. **Recipe Finder** (`/finder`) - **Recently Enhanced**
- **Ingredient-based matching**: Select ingredients to find recipes that use them
- **Smart sorting**: Results sorted by number of matching ingredients
- **Three result types**:
  - **My Cookbook**: User's personal recipes (no "Add to Cookbook" button)
  - **Global Recipes**: Curated recipes from community (with "Add to Cookbook" button)
  - **AI Results**: AI-generated recipes based on queries
- **Pagination**: Handles 1000+ ingredients efficiently
- **Pantry integration**: Auto-selects user's pantry ingredients

### 3. **My Cookbook** (`/cookbook`)
- Personal recipe collection with search and filtering
- Recipe cards with ratings, times, and difficulty
- Quick actions: edit, delete, view details

### 4. **Recipe Import** (`/add`)
- **URL Import**: Paste any recipe URL for automatic parsing
- **Manual Entry**: Full recipe creation form
- **Parsing Support**: JSON-LD, Microdata, RDFa, h-recipe, heuristic fallback
- **Authentication**: Fixed SSR-compatible auth for imports

### 5. **Meal Planning** (`/calendar`)
- Weekly calendar view with drag-and-drop
- Meal type categorization (breakfast, lunch, dinner)
- Shopping list generation from planned meals

### 6. **Shopping Lists** (`/shopping-list`)
- Auto-generated from meal plans
- Manual shopping list creation
- Smart ingredient aggregation and portion scaling

### 7. **Badge System** (`/badges`, `/earn-badges`) - **Recently Completed**
- **16 Badge Types**: Recipe creation, cooking streaks, meal planning, etc.
- **Anti-gaming Logic**: Validates recipe quality and prevents spam
- **Event Logging**: Tracks user actions throughout the app
- **Progress Tracking**: Visual progress bars and achievements

### 8. **Profile Management** (`/profile`)
- User preferences and settings
- Pantry ingredient management
- Badge collection display
- Subscription status

### 9. **Admin Panel** (`/admin/*`)
- **Global Recipe Management**: Add, edit, delete curated recipes
- **Bulk Upload**: CSV import for recipes
- **User Management**: View user statistics
- **Reference Data**: Manage cuisines, meal types, ingredients

---

## 🗄️ Database Schema Overview

### Core Tables
- **`profiles`**: User profiles with pantry ingredients and preferences
- **`user_recipes`**: Personal recipe collection
- **`global_recipes`**: Curated community recipes
- **`ingredients`**: Ingredient database with categories
- **`cuisines`**, **`meal_types`**: Taxonomy tables

### Badge System Tables
- **`badges`**: Badge definitions with tiers
- **`user_badges`**: User badge achievements
- **`user_events`**: Event logging for badge triggers
- **`badge_tiers`**: Badge progression levels

### Supporting Tables
- **`user_recipe_ingredients`**: Recipe-ingredient relationships
- **`meal_plans`**: Calendar meal planning data
- **`shopping_lists`**: Generated shopping lists
- **`recipe_ratings`**: User ratings and feedback

---

## 🔧 Recent Fixes & Improvements

### Recipe Finder Enhancements (Just Fixed)
- **Fixed**: `ReferenceError: ingredientsError is not defined` in loadInitialData
- **Fixed**: "Add to Cookbook" button logic - hidden for user recipes, shown for global/AI recipes
- **Enhanced**: Pagination for ingredient loading (1000+ items)
- **Improved**: User experience with proper button visibility

### Ingredient Parsing Improvements
- **Two-word ingredients**: Checked before single-word matches
- **Specificity priority**: More specific ingredients matched first
- **Enhanced matching**: Handles complex ingredient descriptions
- **Fixed parsing**: Orange/lemon with "quartered", chicken broth vs chicken, etc.

### Authentication Fixes
- **SSR Compatibility**: Fixed Supabase client for Next.js 15 App Router
- **Cookie Handling**: Proper session management for imports
- **URL Import**: Working authentication for recipe imports

### JSON-LD Normalization
- **Schema.org Objects**: Properly extract URLs, names, text from complex objects
- **Duration Format**: Convert PT15M to readable "15m"
- **Image Handling**: Extract URLs from ImageObject structures

---

## 🎨 Design System

### Color Scheme
- **Primary**: Orange theme (#DA734E for Valeri Consulting secondary color)
- **UI**: Tailwind CSS with custom component variants
- **Accessibility**: Radix UI components with proper ARIA support

### Chef Tony Character
- **Animated Avatar**: French chef with swaying motion and blinking
- **Dynamic Content**: Rotating greetings, jokes, and cooking tips from database
- **Engagement**: Adds personality and guides users through features

---

## 🧪 Testing & Quality

### Test Coverage
- **E2E Testing**: Playwright tests for critical user flows
- **Badge System**: Comprehensive testing for event logging and awarding
- **Import Flow**: URL import and parsing validation
- **Authentication**: Login/logout and session management

### Code Quality
- **TypeScript**: Full type safety throughout
- **ESLint**: Code quality and consistency
- **Performance**: Optimized with Turbopack and Next.js 15

---

## 🚀 Deployment & Environment

### Production Setup
- **Hosting**: Vercel with automatic deployments
- **Database**: Supabase production instance
- **CDN**: Vercel Edge Network for global performance
- **Monitoring**: Built-in Vercel analytics

### Development Environment
- **Local Server**: `npm run dev` (http://localhost:3000)
- **Hot Reload**: Turbopack for fast development
- **Mobile Testing**: Capacitor for iOS/Android testing

### Environment Variables Required
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_PADDLE_ENV=sandbox
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=
PADDLE_API_KEY=
PADDLE_WEBHOOK_SECRET=
NEXT_PUBLIC_RECIPECHEF_MONTHLY_PRICE_ID=
NEXT_PUBLIC_RECIPECHEF_YEARLY_PRICE_ID=
```

---

## 📱 Mobile App Features

### Capacitor Integration
- **Native Features**: Camera, file system, push notifications
- **Offline Support**: Service worker with IndexedDB storage
- **App Store Ready**: iOS and Android build configurations
- **PWA Fallback**: Works in browsers without native app

### Mobile-Specific Features
- **Voice Search**: Web Speech API integration
- **Camera Import**: Photo-based recipe import (planned)
- **Offline Mode**: Full functionality without internet
- **Install Prompts**: Native app installation

---

## 🔐 Security & Privacy

### Data Protection
- **Row Level Security**: Database-level user data isolation
- **Authentication**: Secure Supabase Auth with OAuth
- **API Security**: Server-side validation and sanitization
- **Content Sanitization**: DOMPurify for user-generated content

### Privacy Features
- **User Control**: Full data export and deletion
- **Minimal Data**: Only collect necessary user information
- **Secure Storage**: Encrypted database with proper backups

---

## 📊 Performance & Scalability

### Optimization Strategies
- **Code Splitting**: Automatic with Next.js App Router
- **Image Optimization**: Next.js Image component with lazy loading
- **Database Indexing**: Optimized queries with proper indexes
- **Caching**: Vercel Edge caching and Supabase connection pooling

### Scalability Considerations
- **Serverless**: Vercel functions scale automatically
- **Database**: Supabase handles connection pooling and scaling
- **CDN**: Global content delivery for fast loading
- **Monitoring**: Built-in performance monitoring

---

## 🎯 Current Status & Next Steps

### Recently Completed ✅
- Recipe Finder ingredient matching and UI improvements
- Badge system with 16 badge types and event logging
- Authentication fixes for SSR compatibility
- JSON-LD parsing normalization
- "Add to Cookbook" button logic fixes

### Active Development Areas
- **AI Integration**: Enhanced recipe search and Q&A
- **Mobile Optimization**: Native app features and performance
- **User Engagement**: Badge system expansion and gamification
- **Content Quality**: Global recipe curation and moderation

### Known Issues
- Minor linting warnings (non-breaking)
- Some unused imports and variables (cleanup needed)
- Image optimization warnings (performance improvements)

---

## 🛠️ Development Workflow

### Getting Started
```bash
# Clone and install
git clone <repository>
cd recipe-chef
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your keys

# Start development server
npm run dev
```

### Key Commands
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run test:e2e` - Run Playwright E2E tests
- `npm run build:mobile` - Build for mobile deployment
- `vercel --prod` - Deploy to production

### Code Organization
- **Pages**: `src/app/` (Next.js App Router)
- **Components**: `src/components/` (reusable UI components)
- **Utilities**: `src/lib/` (shared functions and helpers)
- **API Routes**: `src/app/api/` (serverless functions)
- **Database**: `supabase/` (migrations and schema)

---

## 💡 Key Insights for New Developers

### Architecture Decisions
1. **Next.js 15 App Router**: Modern routing with server components
2. **Supabase**: Full-stack solution with real-time capabilities
3. **TypeScript**: Essential for maintaining code quality
4. **Tailwind CSS**: Rapid UI development with consistent design
5. **Capacitor**: Cross-platform mobile without React Native complexity

### Common Patterns
- **Server Components**: Use for data fetching and SEO
- **Client Components**: Use for interactivity and state
- **API Routes**: Serverless functions for external integrations
- **Database Functions**: Complex queries and business logic
- **RLS Policies**: Secure data access at the database level

### Best Practices
- Always use TypeScript interfaces for data structures
- Implement proper error handling and loading states
- Use Supabase RLS for data security
- Optimize images and bundle size
- Test critical user flows with Playwright
- Follow mobile-first responsive design principles

---

## 📞 Support & Resources

### Documentation
- **README.md**: Quick start and setup guide
- **RECIPECHEF_CONTEXT_SUMMARY.md**: Detailed feature overview
- **FINAL_SUMMARY.md**: Recent fixes and improvements
- **Session summaries**: Individual feature implementation details

### Key Files to Understand
- `src/app/layout.tsx` - Root layout and providers
- `src/app/page.tsx` - Homepage implementation
- `src/app/finder/page.tsx` - Recipe finder logic
- `src/components/chef-ouioui.tsx` - Chef Tony character
- `src/lib/supabase.ts` - Database client configuration
- `supabase-schema.sql` - Complete database schema

### Community & Support
- **GitHub Issues**: Bug reports and feature requests
- **Documentation**: Comprehensive setup and usage guides
- **Testing**: Playwright test suite for quality assurance

---

*This context summary provides a complete overview of Recipe Chef for any new developer or agent joining the project. The application is production-ready with comprehensive features for recipe management, meal planning, and user engagement.*
