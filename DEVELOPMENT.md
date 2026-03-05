# Development Guide

## Getting Started

### Prerequisites

- Node.js 18+ and npm (20.19.4+ recommended for Expo SDK 54)
- PostgreSQL 14+ (or Docker)
- Redis 6+ (or Docker)
- iOS Simulator (for iOS development)
- Android Studio (for Android development)
- OpenAI API key

### Initial Setup

1. Clone and install dependencies:

```bash
cd backend && npm install
cd ../mobile && npm install
cd ../shared && npm install
```

2. Set up backend:

```bash
cd backend
cp .env.example .env
# Edit .env with your credentials

# Start PostgreSQL and Redis with Docker
docker-compose up -d

# Run migrations
npm run prisma:generate
npm run prisma:migrate

# Start backend
npm run dev
```

> **Note**: If you have PostgreSQL running locally (via Homebrew), stop it first with `brew services stop postgresql@15` to avoid port conflicts with Docker.

### Environment Variables

#### Backend (.env)

| Variable                    | Value                                                  | Where to Get                                                                            |
| --------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| **DATABASE_URL**            | `postgresql://postgres:postgres@localhost:5432/unmenu` | Docker PostgreSQL (default with docker-compose.yml)                                     |
| **REDIS_URL**               | `redis://localhost:6379`                               | Docker Redis (default with docker-compose.yml)                                          |
| **JWT_SECRET**              | Any random string                                      | Generate: `openssl rand -hex 32`                                                        |
| **OPENAI_API_KEY**          | `sk-...`                                               | [OpenAI API Keys](https://platform.openai.com/account/api-keys) - Create new secret key |
| **OPENAI_MODEL**            | `gpt-4o`                                               | OpenAI model to use for OCR and menu processing                                         |
| **PORT**                    | `3000`                                                 | Default port for backend server                                                         |
| **NODE_ENV**                | `development`                                          | Set to `development` for local, `production` for deployment                             |
| **FREE_TIER_INITIAL_SCANS** | `5`                                                    | Initial scan quota for new free tier users                                              |
| **FREE_TIER_MONTHLY_SCANS** | `1`                                                    | Monthly scan reset amount for free tier users                                           |
| **PRO_TIER_SCANS**          | `35`                                                   | Monthly scan limit for pro users                                                        |

**Quick Setup:**

```bash
# Generate JWT secret
openssl rand -hex 32
```

#### Mobile (.env)

| Variable                | Value                       | Where to Get                                |
| ----------------------- | --------------------------- | ------------------------------------------- |
| **EXPO_PUBLIC_API_URL** | `http://localhost:3000/api` | Backend API URL (localhost for development) |

**Local Development:** Use `http://localhost:3000/api`  
**Production:** Replace with your deployed backend URL (e.g., `https://api.unmenu.com/api`)

3. Set up mobile:

```bash
cd mobile
cp .env.example .env
# Update API URL to http://localhost:3000/api

# Start Expo
npx expo start
```

## Development Workflow

### Docker Services

The backend uses Docker Compose to manage PostgreSQL and Redis:

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f postgres
docker-compose logs -f redis

# Restart services
docker-compose restart

# Remove services and data
docker-compose down -v
```

### Backend Development

#### Database Changes

```bash
# Create migration
npx prisma migrate dev --name description

# View database
npx prisma studio
```

#### Testing API Endpoints

Use tools like:

- Postman
- Insomnia
- cURL
- Thunder Client (VS Code)

Example:

```bash
# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Mobile Development

#### Running on Devices

```bash
# iOS Simulator
npx expo start --ios

# Android Emulator
npx expo start --android

# Physical device
npx expo start
# Scan QR code with Expo Go app
```

#### SDK 54 Updates

Mobile app uses Expo SDK 54 with the following key dependencies and changes:

**Core Versions:**

- React 19.1.0
- React Native 0.81.5
- Expo Router 6
- expo-camera 17
- expo-image-picker 17

**API Changes from SDK 50:**

- `expo-camera` v17 uses `CameraView` component instead of `Camera`
- Camera permission handling uses `useCameraPermissions` hook instead of `Camera.requestCameraPermissionsAsync()`
- Camera type parameter uses `facing="back"` string instead of `CameraType.back` enum
- All camera-related types updated for new API
- React 19 introduces updates to component APIs and hooks

**Node.js Requirement:**

- SDK 54 packages require Node.js 20.19.4 or higher
- Current installed: v20.18.0 (works but with engine warnings)

#### Debugging

- Use React DevTools
- Enable Remote Debugging in Expo
- Use Flipper for advanced debugging
- Check logs: `npx expo start --clear`

## Project Structure

### Backend

```
backend/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── index.ts              # App entry point
│   ├── middleware/           # Auth, rate limiting, etc.
│   ├── routes/               # API routes
│   └── services/             # Business logic
│       ├── uploadService.ts  # Image processing (base64)
│       ├── ocrService.ts     # Text extraction
│       ├── aiService.ts      # Menu processing with OpenAI
│       └── scanService.ts    # Scan orchestration & caching
└── package.json
```

### Mobile

```
mobile/
├── app/                      # Expo Router screens
│   ├── _layout.tsx          # Root layout
│   ├── index.tsx            # Home
│   ├── scan.tsx             # Camera
│   ├── auth/                # Login/Register
│   ├── menu/[id].tsx        # Menu detail
│   ├── saved.tsx            # Saved menus
│   └── profile.tsx          # User profile
├── lib/
│   ├── api.ts               # API client
│   └── storage.ts           # AsyncStorage wrapper
└── package.json
```

## Key Features Implementation

### Menu Scanning Flow

1. User takes photo → `scan.tsx`
2. Image converted to base64 (in-memory) → `uploadService.ts`
3. OCR text extraction → `ocrService.ts`
4. AI processing with OpenAI Vision → `aiService.ts`
5. Content hash computed from processed menu → `scanService.ts`
6. Result cached by content hash → `CachedMenu` table (30 days)
7. Progressive updates via polling → `menu/[id].tsx`

**Note:** Images are never stored persistently. Only the processed menu JSON is cached.

### Progressive Loading

- **0-40%**: OCR text extraction
- **40-80%**: Translation and basic processing
- **80-100%**: Enrichment (allergens, similar dishes)

### Subscription Logic

- Free tier: 5 scans/month
- Pro tier: 35 scans/month + premium features
- Scans reset monthly via `scans_reset_at`
- Check in `scan.ts` route before processing

### Offline Support

- Saved menus stored in AsyncStorage
- Fallback to local data if API fails
- Sync when connection restored

## AI Prompt Engineering

### Current Prompt Structure

See `backend/src/services/aiService.ts`

Key principles:

- Never invent dishes
- Prefer uncertainty over hallucination
- Include confidence scores
- Use concise, neutral language
- Never claim allergen safety

### Improving Accuracy

- Add more context about cuisine type
- Include user's dietary restrictions
- Use few-shot examples
- Adjust temperature (currently 0.3)
- Increase max_tokens for complex menus

## Cost Optimization

### Current Strategies

1. **Content-based caching** - Same menu from different photos = cache hit
2. **30-day cache TTL** - Reduces OpenAI API calls for popular menus
3. **In-memory base64** - No external storage costs (no S3 needed)
4. **Image compression before sending** - Reduce vision API processing time
5. **Token limits** - Cap AI processing with `max_tokens: 4000`

### How Content Caching Works

Instead of hashing raw image bytes (which differ for each photo), we hash the processed menu JSON:

```
Photo A of Menu X → Process → JSON → Hash(JSON) → Cache Key
Photo B of Menu X → Process → JSON → Hash(JSON) → Same Cache Key ✓
```

Two different photos of the same menu produce the same content hash, so the second scan returns cached results instantly (no OpenAI call needed).

### Monitoring Costs

```typescript
// Add to aiService.ts
console.log("Tokens used:", response.usage);
```

Track in database:

- Add `tokens_used` column to Scan table
- Monitor daily/monthly totals
- Alert on unusual spikes

## Testing

### Backend Testing

```bash
# Add to package.json
"test": "jest"

# Install
npm install --save-dev jest @types/jest ts-jest

# Run tests
npm test
```

### Mobile Testing

```bash
# Install
npm install --save-dev @testing-library/react-native jest

# Run tests
npm test
```

### Manual Testing Checklist

- [ ] Register new user
- [ ] Login existing user
- [ ] Scan menu (camera)
- [ ] Scan menu (upload)
- [ ] View processing progress
- [ ] View completed menu
- [ ] Save menu
- [ ] View saved menus
- [ ] Delete saved menu
- [ ] Upgrade to Pro
- [ ] Logout
- [ ] Test offline mode

## Common Issues

### Backend

**Issue**: Prisma client not found

```bash
npm run prisma:generate
```

**Issue**: Database connection failed

- Check PostgreSQL is running
- Verify DATABASE_URL in .env

**Issue**: Redis connection failed

- Check Redis is running
- Verify REDIS_URL in .env

### Mobile

**Issue**: Metro bundler cache issues

```bash
npx expo start --clear
```

**Issue**: Camera not working

- Check permissions in app.json
- Request permissions at runtime

**Issue**: API calls failing

- Check backend is running
- Verify EXPO_PUBLIC_API_URL
- Check network connectivity

## Performance Optimization

### Backend

- Use database indexes (already in schema)
- Implement connection pooling
- Cache frequently accessed data
- Use compression middleware
- Optimize image processing

### Mobile

- Lazy load images
- Implement pagination for saved menus
- Use React.memo for expensive components
- Optimize re-renders with useMemo/useCallback
- Reduce bundle size

## Contributing

### Code Style

- Use TypeScript strict mode
- Follow ESLint rules
- Use Prettier for formatting
- Write meaningful commit messages
- Add comments for complex logic

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/menu-filtering

# Make changes and commit
git add .
git commit -m "Add menu filtering by allergens"

# Push and create PR
git push origin feature/menu-filtering
```

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
