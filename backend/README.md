# UnMenu Backend

Node.js + TypeScript backend API for the UnMenu app.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your credentials
```

3. Set up PostgreSQL database:

```bash
# Install PostgreSQL if not already installed
# Create database
createdb unmenu

# Update DATABASE_URL in .env
```

4. Set up Redis:

```bash
# Install Redis if not already installed
# Start Redis server
redis-server
```

5. Run Prisma migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

6. Start development server:

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Scanning

- `POST /api/scan/upload` - Upload menu image (requires auth)
- `GET /api/scan/status/:scanId` - Get scan status (requires auth)

### Menus

- `POST /api/menu/save` - Save menu for offline access (requires auth)
- `GET /api/menu/saved` - Get all saved menus (requires auth)
- `DELETE /api/menu/saved/:menuId` - Delete saved menu (requires auth)

### User

- `GET /api/user/profile` - Get user profile (requires auth)
- `POST /api/user/upgrade` - Upgrade to Pro (requires auth)

## Environment Variables

Required:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret for JWT tokens
- `OPENAI_API_KEY` - OpenAI API key

Optional:

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `FREE_TIER_INITIAL_SCANS` - Free tier initial scans for new users (default: 5)
- `FREE_TIER_MONTHLY_SCANS` - Free tier monthly scan reset amount (default: 1)
- `PRO_TIER_SCANS` - Pro tier monthly scan limit (default: 35)
- `OPENAI_MODEL` - OpenAI model to use (default: gpt-4o)

## Architecture

- **Express** - Web framework
- **Prisma** - ORM for PostgreSQL
- **OpenAI GPT-4 Vision** - Menu OCR and processing
- **Redis** - Caching layer
- **JWT** - Authentication

## Cost Optimization

- Content-based caching (same menu = cache hit regardless of photo)
- 30-day cache for processed menus
- OCR before full AI processing
- Image compression and resizing
