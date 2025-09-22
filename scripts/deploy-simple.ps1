# Simple PowerShell deployment script for RBCA Task Management System
# No Docker required - deploys to various platforms

param(
    [Parameter(Position=0)]
    [ValidateSet("railway", "vercel", "netlify", "server", "build", "test", "menu")]
    [string]$Platform = "menu"
)

# Colors for output
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Blue }
function Write-Success { param($Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }
function Write-Title { param($Message) Write-Host $Message -ForegroundColor Cyan -BackgroundColor Black }

function Test-Prerequisites {
    Write-Info "🔍 Checking prerequisites..."
    
    # Check if we're in the right directory
    if (-not (Test-Path "package.json")) {
        Write-Error "❌ package.json not found. Please run this script from the project root."
        exit 1
    }
    
    # Check if Node.js is installed
    try {
        $null = node --version
    } catch {
        Write-Error "❌ Node.js is not installed. Please install Node.js first."
        exit 1
    }
    
    # Check if npm is available
    try {
        $null = npm --version
    } catch {
        Write-Error "❌ npm is not available. Please install npm first."
        exit 1
    }
    
    Write-Success "✅ Prerequisites check passed"
}

function Install-Dependencies {
    Write-Info "📦 Installing dependencies..."
    
    try {
        npm ci
        Write-Success "✅ Dependencies installed successfully"
    } catch {
        Write-Error "❌ Failed to install dependencies"
        exit 1
    }
}

function Invoke-Tests {
    Write-Info "🧪 Running tests..."
    
    try {
        npx nx run-many --target=test --all --skip-nx-cache
        Write-Success "✅ All tests passed"
        return $true
    } catch {
        Write-Error "❌ Tests failed"
        return $false
    }
}

function Build-Applications {
    Write-Info "🏗️ Building applications..."
    
    # Build API
    Write-Warning "Building API..."
    try {
        npx nx build api --configuration=production
    } catch {
        Write-Error "❌ Failed to build API"
        exit 1
    }
    
    # Build Dashboard
    Write-Warning "Building Dashboard..."
    try {
        npx nx build dashboard --configuration=production
    } catch {
        Write-Error "❌ Failed to build Dashboard"
        exit 1
    }
    
    Write-Success "✅ Applications built successfully"
}

function Deploy-ToRailway {
    Write-Info "🚂 Deploying to Railway..."
    
    # Check if Railway CLI is installed
    try {
        $null = railway --version
    } catch {
        Write-Warning "Installing Railway CLI..."
        try {
            npm install -g @railway/cli
        } catch {
            Write-Error "❌ Failed to install Railway CLI"
            return $false
        }
    }
    
    # Deploy
    try {
        railway deploy
        Write-Success "✅ Successfully deployed to Railway"
        Write-Info "🌐 Your app should be available at the Railway-provided URL"
        return $true
    } catch {
        Write-Error "❌ Failed to deploy to Railway"
        return $false
    }
}

function Deploy-ToVercel {
    Write-Info "▲ Deploying to Vercel..."
    
    # Check if Vercel CLI is installed
    try {
        $null = vercel --version
    } catch {
        Write-Warning "Installing Vercel CLI..."
        try {
            npm install -g vercel
        } catch {
            Write-Error "❌ Failed to install Vercel CLI"
            return $false
        }
    }
    
    # Deploy frontend
    Write-Warning "Deploying frontend to Vercel..."
    $frontendPath = Join-Path $PWD "dist\dashboard\browser"
    
    if (-not (Test-Path $frontendPath)) {
        Write-Error "❌ Frontend build not found. Please build first."
        return $false
    }
    
    try {
        Push-Location $frontendPath
        vercel --prod
        Write-Success "✅ Successfully deployed to Vercel"
        return $true
    } catch {
        Write-Error "❌ Failed to deploy to Vercel"
        return $false
    } finally {
        Pop-Location
    }
}

function Deploy-ToNetlify {
    Write-Info "🌐 Deploying to Netlify..."
    
    # Check if Netlify CLI is installed
    try {
        $null = netlify --version
    } catch {
        Write-Warning "Installing Netlify CLI..."
        try {
            npm install -g netlify-cli
        } catch {
            Write-Error "❌ Failed to install Netlify CLI"
            return $false
        }
    }
    
    # Deploy
    $frontendPath = "dist\dashboard\browser"
    try {
        netlify deploy --prod --dir=$frontendPath
        Write-Success "✅ Successfully deployed to Netlify"
        return $true
    } catch {
        Write-Error "❌ Failed to deploy to Netlify"
        return $false
    }
}

function Deploy-ToTraditionalServer {
    Write-Info "🖥️ Preparing for traditional server deployment..."
    
    # Create deployment package
    $deployDir = "deploy-package"
    
    if (Test-Path $deployDir) {
        Remove-Item -Recurse -Force $deployDir
    }
    
    New-Item -ItemType Directory -Path $deployDir -Force | Out-Null
    
    # Copy built applications
    Copy-Item -Recurse "dist" "$deployDir\"
    
    # Copy necessary files
    if (Test-Path "package.json") {
        Copy-Item "package.json" $deployDir
    }
    
    if (Test-Path "package-lock.json") {
        Copy-Item "package-lock.json" $deployDir
    }
    
    # Create production package.json with only production dependencies
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    $prodPackageJson = @{
        name = $packageJson.name
        version = $packageJson.version
        dependencies = $packageJson.dependencies
        scripts = @{
            start = "node dist/api/main.js"
        }
    }
    
    $prodPackageJson | ConvertTo-Json -Depth 10 | Out-File "$deployDir\package.json" -Encoding UTF8
    
    # Create deployment instructions
    $instructions = @"
# Deployment Instructions for Windows Server

## 1. Upload this folder to your server
# Use SCP, FTP, or any file transfer method

## 2. On the server, install dependencies
cd C:\path\to\app\
npm ci --production

## 3. Set up environment variables
copy .env.production.example .env.production
# Edit .env.production with your values using notepad or any editor

## 4. Start the application

### Option 1: Direct start
npm start

### Option 2: With PM2 (recommended for production)
npm install -g pm2
pm2 start dist/api/main.js --name rbca-api
pm2 startup
pm2 save

### Option 3: Windows Service (using node-windows)
npm install -g node-windows
# Create a service script and install it

## 5. Set up IIS for frontend (optional)
# 1. Install IIS with Static Content feature
# 2. Create a new site pointing to: dist/dashboard/browser/
# 3. Configure URL Rewrite for Angular routing

## 6. Set up reverse proxy in IIS for API (optional)
# Install URL Rewrite and Application Request Routing
# Configure reverse proxy to forward /api/* to http://localhost:3000

## Frontend files are in: dist/dashboard/browser/
## Serve these files with IIS, nginx, or any web server

## Database Setup
# Install PostgreSQL or use a cloud database
# Run migrations if needed
# Update connection string in .env.production
"@
    
    $instructions | Out-File "$deployDir\DEPLOYMENT_INSTRUCTIONS.txt" -Encoding UTF8
    
    Write-Success "✅ Deployment package created in: $deployDir\"
    Write-Info "📋 Check DEPLOYMENT_INSTRUCTIONS.txt for server setup steps"
    
    return $true
}

function Show-Menu {
    Write-Host ""
    Write-Title "🚀 RBCA Task Management System - Deployment Tool"
    Write-Host "=" * 50 -ForegroundColor Cyan
    Write-Host "1. Railway (Recommended - Easy setup)" -ForegroundColor White
    Write-Host "2. Vercel (Frontend hosting)" -ForegroundColor White
    Write-Host "3. Netlify (Static site hosting)" -ForegroundColor White
    Write-Host "4. Traditional Server (VPS/Dedicated)" -ForegroundColor White
    Write-Host "5. Build only (no deployment)" -ForegroundColor White
    Write-Host "6. Run tests only" -ForegroundColor White
    Write-Host "0. Exit" -ForegroundColor White
    Write-Host "=" * 50 -ForegroundColor Cyan
}

function Get-UserChoice {
    $choice = Read-Host "Enter your choice (0-6)"
    return $choice.Trim()
}

function Start-Deployment {
    Write-Title "🎯 Starting RBCA Task Management System Deployment"
    
    # Check prerequisites
    Test-Prerequisites
    
    # Show menu if no platform specified
    if ($Platform -eq "menu") {
        Show-Menu
        $choice = Get-UserChoice
    } else {
        $choice = $Platform
    }
    
    # Install dependencies
    Install-Dependencies
    
    switch ($choice) {
        "1" { 
            Build-Applications
            Deploy-ToRailway 
        }
        "railway" { 
            Build-Applications
            Deploy-ToRailway 
        }
        "2" { 
            Build-Applications
            Deploy-ToVercel 
        }
        "vercel" { 
            Build-Applications
            Deploy-ToVercel 
        }
        "3" { 
            Build-Applications
            Deploy-ToNetlify 
        }
        "netlify" { 
            Build-Applications
            Deploy-ToNetlify 
        }
        "4" { 
            Build-Applications
            Deploy-ToTraditionalServer 
        }
        "server" { 
            Build-Applications
            Deploy-ToTraditionalServer 
        }
        "5" { 
            Build-Applications
            Write-Success "✅ Build completed. Check the dist\ folder for built applications."
        }
        "build" { 
            Build-Applications
            Write-Success "✅ Build completed. Check the dist\ folder for built applications."
        }
        "6" { 
            Invoke-Tests 
        }
        "test" { 
            Invoke-Tests 
        }
        "0" { 
            Write-Warning "👋 Goodbye!"
            exit 0 
        }
        default {
            Write-Error "❌ Invalid choice. Please run the script again."
            exit 1
        }
    }
    
    Write-Host ""
    Write-Title "🎉 Deployment process completed!"
    Write-Info "📊 Next steps:"
    Write-Host "  1. Configure your environment variables" -ForegroundColor White
    Write-Host "  2. Set up your database" -ForegroundColor White
    Write-Host "  3. Configure your domain (if applicable)" -ForegroundColor White
    Write-Host "  4. Set up SSL certificates for production" -ForegroundColor White
}

# Main execution
try {
    Start-Deployment
} catch {
    Write-Error "❌ Deployment failed: $($_.Exception.Message)"
    exit 1
}




