#!/bin/bash

# BlogMagic Deployment Fix Script
# This script fixes common deployment issues

echo "🔧 BlogMagic Deployment Fix Script"
echo "===================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root directory."
    exit 1
fi

echo "✅ Found package.json"
echo ""

# Step 1: Pull latest changes
echo "📥 Step 1: Pulling latest changes from GitHub..."
git pull origin main
if [ $? -ne 0 ]; then
    echo "⚠️  Warning: Git pull failed. Continuing anyway..."
fi
echo ""

# Step 2: Check if patches directory exists
echo "📁 Step 2: Checking patches directory..."
if [ -d "patches" ]; then
    echo "✅ Patches directory exists"
    ls -la patches/
else
    echo "❌ Patches directory missing!"
    echo "   Creating patches directory..."
    mkdir -p patches
    
    # If patches is still missing, we need to re-clone
    echo "⚠️  Patches directory was missing. You may need to re-clone the repository."
    echo "   Run: git clone https://github.com/VanceGC/BlogMagic.git"
fi
echo ""

# Step 3: Clean install dependencies
echo "🧹 Step 3: Cleaning and reinstalling dependencies..."
rm -rf node_modules
rm -rf .pnpm-store
pnpm install
if [ $? -ne 0 ]; then
    echo "❌ pnpm install failed!"
    exit 1
fi
echo "✅ Dependencies installed"
echo ""

# Step 4: Check .env file
echo "⚙️  Step 4: Checking .env file..."
if [ -f ".env" ]; then
    echo "✅ .env file exists"
else
    echo "⚠️  .env file not found!"
    if [ -f ".env.example" ]; then
        echo "   Creating .env from .env.example..."
        cp .env.example .env
        echo "   ⚠️  Please edit .env and configure your settings!"
    else
        echo "   ❌ .env.example not found either!"
    fi
fi
echo ""

# Step 5: Test database connection
echo "🗄️  Step 5: Testing database connection..."
if grep -q "DATABASE_URL" .env; then
    echo "✅ DATABASE_URL found in .env"
else
    echo "⚠️  DATABASE_URL not configured in .env"
fi
echo ""

# Step 6: Push database schema
echo "📊 Step 6: Pushing database schema..."
pnpm db:push
if [ $? -ne 0 ]; then
    echo "⚠️  Database push failed. Check your DATABASE_URL in .env"
else
    echo "✅ Database schema updated"
fi
echo ""

# Step 7: Build application
echo "🏗️  Step 7: Building application..."
pnpm build
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi
echo "✅ Build successful"
echo ""

# Step 8: Check if PM2 is installed
echo "🔍 Step 8: Checking PM2..."
if command -v pm2 &> /dev/null; then
    echo "✅ PM2 is installed"
    
    # Stop existing process
    pm2 delete blogmagic 2>/dev/null || true
    
    # Start new process
    echo "🚀 Starting application with PM2..."
    pm2 start npm --name "blogmagic" -- start
    pm2 save
    
    echo ""
    echo "✅ Application started!"
    echo ""
    echo "📊 PM2 Status:"
    pm2 status
    echo ""
    echo "📝 View logs with: pm2 logs blogmagic"
else
    echo "⚠️  PM2 not installed"
    echo "   Install with: npm install -g pm2"
    echo ""
    echo "🚀 Starting application manually..."
    echo "   Run: pnpm start"
fi

echo ""
echo "===================================="
echo "✅ Fix script completed!"
echo ""
echo "Next steps:"
echo "1. Check PM2 logs: pm2 logs blogmagic"
echo "2. Check application status: pm2 status"
echo "3. Visit your domain to test"
echo ""
echo "If you're using Docker instead:"
echo "  docker-compose down"
echo "  docker-compose up -d --build"
echo "===================================="

