#!/bin/bash

echo "🚀 UnMenu Setup Script"
echo "======================"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js $(node --version) found"

# Check for PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL not found. Please install PostgreSQL 14+"
    echo "   macOS: brew install postgresql@14"
    echo "   Ubuntu: sudo apt-get install postgresql-14"
    exit 1
fi

echo "✅ PostgreSQL found"

# Check for Redis
if ! command -v redis-cli &> /dev/null; then
    echo "⚠️  Redis not found. Please install Redis 6+"
    echo "   macOS: brew install redis"
    echo "   Ubuntu: sudo apt-get install redis-server"
    exit 1
fi

echo "✅ Redis found"
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install backend dependencies"
    exit 1
fi

# Setup backend environment
if [ ! -f .env ]; then
    echo "📝 Creating backend .env file..."
    cp .env.example .env
    echo "⚠️  Please edit backend/.env with your credentials:"
    echo "   - DATABASE_URL"
    echo "   - REDIS_URL"
    echo "   - JWT_SECRET"
    echo "   - OPENAI_API_KEY"
    echo "   - AWS credentials"
    echo ""
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run prisma:generate

echo ""
echo "✅ Backend setup complete!"
echo ""

# Install mobile dependencies
echo "📦 Installing mobile dependencies..."
cd ../mobile
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install mobile dependencies"
    exit 1
fi

# Setup mobile environment
if [ ! -f .env ]; then
    echo "📝 Creating mobile .env file..."
    cp .env.example .env
    echo "⚠️  Please edit mobile/.env with your API URL"
    echo ""
fi

echo "✅ Mobile setup complete!"
echo ""

# Install shared dependencies
echo "📦 Installing shared dependencies..."
cd ../shared
npm install

echo ""
echo "✅ Shared setup complete!"
echo ""

cd ..

echo "🎉 Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Edit backend/.env with your credentials"
echo "2. Create PostgreSQL database: createdb unmenu"
echo "3. Start Redis: redis-server"
echo "4. Run database migrations: cd backend && npm run prisma:migrate"
echo "5. Start backend: cd backend && npm run dev"
echo "6. Start mobile: cd mobile && npx expo start"
echo ""
echo "See DEVELOPMENT.md for detailed instructions."
