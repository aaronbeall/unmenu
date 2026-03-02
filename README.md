# UnMenu - AI Menu Scanner App

A mobile-first app that lets users photograph restaurant menus and receive structured, enriched, translated, and allergen-aware menu experiences.

## Project Structure

```
unmenu/
├── backend/          # Node.js + TypeScript API
├── mobile/           # React Native + Expo app
├── shared/           # Shared types and schemas
└── README.md
```

## Quick Start

### Backend
```bash
cd backend
npm install
npm run dev
```

### Mobile
```bash
cd mobile
npm install
npx expo start
```

## Features

- 📸 Menu photo scanning with OCR
- 🌍 Multi-language translation
- 🥜 Allergen detection (with disclaimers)
- 📱 Offline menu storage
- 💎 Freemium subscription model
- ⚡ Progressive loading (OCR → Translation → Enrichment)

## Tech Stack

**Backend:**
- Node.js + TypeScript
- Express
- Prisma ORM
- OpenAI GPT-4 Vision
- Redis caching
- AWS S3 for images

**Mobile:**
- React Native
- Expo
- TypeScript
- React Query
- AsyncStorage

## Environment Variables

See `.env.example` in backend and mobile directories.

## License

Proprietary
