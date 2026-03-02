# UnMenu Mobile App

React Native + Expo mobile app for scanning and translating restaurant menus.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Update EXPO_PUBLIC_API_URL with your backend URL
```

3. Start Expo development server:
```bash
npx expo start
```

4. Run on device:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on physical device

## Features

- 📸 Camera integration for menu scanning
- 🖼️ Image picker for uploading from gallery
- 🌍 Multi-language translation
- 🥜 Allergen detection (Pro only)
- 💾 Offline menu storage
- 👤 User authentication
- 💎 Subscription management

## Project Structure

```
mobile/
├── app/                    # Expo Router screens
│   ├── _layout.tsx        # Root layout
│   ├── index.tsx          # Home screen
│   ├── scan.tsx           # Camera screen
│   ├── saved.tsx          # Saved menus
│   ├── profile.tsx        # User profile
│   ├── auth/              # Auth screens
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── menu/              # Menu detail
│       └── [id].tsx
├── lib/                   # Utilities
│   ├── api.ts            # API client
│   └── storage.ts        # Local storage
└── assets/               # Images and icons
```

## Tech Stack

- **React Native** - Mobile framework
- **Expo** - Development platform
- **Expo Router** - File-based routing
- **React Query** - Data fetching
- **AsyncStorage** - Local storage
- **Axios** - HTTP client
- **Lucide React Native** - Icons
- **NativeWind** - Tailwind CSS for React Native

## Building for Production

### iOS
```bash
eas build --platform ios
```

### Android
```bash
eas build --platform android
```

## Environment Variables

- `EXPO_PUBLIC_API_URL` - Backend API URL

## Offline Support

Saved menus are stored locally using AsyncStorage and remain accessible even without internet connection.
