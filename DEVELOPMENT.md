# Development Guide

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+
- iOS Simulator (for iOS development)
- Android Studio (for Android development)
- OpenAI API key
- AWS account (for S3)

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

# Start PostgreSQL and Redis
# Then run migrations
npm run prisma:generate
npm run prisma:migrate

# Start backend
npm run dev
```

3. Set up mobile:
```bash
cd mobile
cp .env.example .env
# Update API URL to http://localhost:3000/api

# Start Expo
npx expo start
```

## Development Workflow

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
│       ├── uploadService.ts  # S3 image upload
│       ├── ocrService.ts     # Text extraction
│       ├── aiService.ts      # Menu processing
│       └── scanService.ts    # Scan orchestration
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
2. Image uploaded to S3 → `uploadService.ts`
3. Image hash checked for cache → `scanService.ts`
4. OCR extraction → `ocrService.ts`
5. AI processing → `aiService.ts`
6. Result cached → `CachedMenu` table
7. Progressive updates via polling → `menu/[id].tsx`

### Progressive Loading
- **0-40%**: OCR text extraction
- **40-80%**: Translation and basic processing
- **80-100%**: Enrichment (allergens, similar dishes)

### Subscription Logic
- Free tier: 5 scans/month
- Pro tier: Unlimited scans + premium features
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
1. **Image hashing** - Avoid reprocessing same menu
2. **30-day cache** - Reuse popular menus
3. **OCR first** - Cheaper than full vision API
4. **Image compression** - Reduce upload costs
5. **Token limits** - Cap AI processing costs

### Monitoring Costs
```typescript
// Add to aiService.ts
console.log('Tokens used:', response.usage);
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
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
