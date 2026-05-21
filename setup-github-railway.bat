@echo off
REM AlphaPulse GitHub + Railway Quick Start (Windows)

echo.
echo 🚀 AlphaPulse GitHub + Railway Setup
echo =====================================
echo.

REM Step 1: Git Setup
echo Step 1: Setting up Git...
git rev-parse --git-dir >nul 2>&1
if errorlevel 1 (
    git init
    echo ✅ Git initialized
) else (
    echo ✅ Git already initialized
)

REM Step 2: Check for .env
if not exist .env (
    echo.
    echo ⚠️  No .env file found
    echo 📝 Create .env with at least:
    echo    BOT_TOKEN=your_telegram_token
    echo    ADMIN_TELEGRAM_IDS=your_telegram_id
    pause
    exit /b 1
)

REM Step 3: Git add and commit
echo Step 2: Adding files to Git...
git add .
git commit -m "AlphaPulse bot - ready for Railway deployment" 2>nul
if errorlevel 1 (
    echo ✅ No new changes to commit
) else (
    echo ✅ Files committed
)

REM Step 4: Display GitHub instructions
echo.
echo Step 3: Create GitHub Repository
echo =================================
echo.
echo 1. Go to: https://github.com/new
echo 2. Create repository: alphapulse-bot
echo 3. Run these commands in PowerShell:
echo.
echo git remote add origin https://github.com/YOUR_USERNAME/alphapulse-bot.git
echo git branch -M main
echo git push -u origin main
echo.
echo Then come back here!
echo.

REM Step 5: Railway instructions
echo Step 4: Deploy to Railway
echo =========================
echo.
echo 1. Go to: https://railway.app
echo 2. Sign up with GitHub (easiest)
echo 3. Create new project from your alphapulse-bot repository
echo 4. Railway will auto-detect Dockerfile and deploy!
echo.
echo 5. Add these services in Railway:
echo    - PostgreSQL (auto-creates DATABASE_URL)
echo    - Redis (auto-creates REDIS_URL)
echo.
echo 6. Add environment variables in Railway:
echo    - BOT_TOKEN
echo    - ADMIN_TELEGRAM_IDS
echo    - NODE_ENV=production
echo.
echo 7. Railway will auto-deploy when you push to GitHub
echo.

echo 📚 Full guide: RAILWAY_DEPLOYMENT.md
echo.
echo ✅ Setup complete! Your bot will be live on Railway soon 🎉
echo.
pause
