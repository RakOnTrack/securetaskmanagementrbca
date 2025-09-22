#!/usr/bin/env node

/**
 * Simple deployment script for RBCA Task Management System
 * No Docker required - deploys to various platforms
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, options = {}) {
  try {
    log(`Running: ${command}`, 'cyan');
    execSync(command, { stdio: 'inherit', ...options });
    return true;
  } catch (error) {
    log(`Error executing: ${command}`, 'red');
    log(error.message, 'red');
    return false;
  }
}

function checkPrerequisites() {
  log('🔍 Checking prerequisites...', 'blue');
  
  // Check if we're in the right directory
  if (!fs.existsSync('package.json')) {
    log('❌ package.json not found. Please run this script from the project root.', 'red');
    process.exit(1);
  }
  
  // Check if Node.js is installed
  try {
    execSync('node --version', { stdio: 'ignore' });
  } catch {
    log('❌ Node.js is not installed. Please install Node.js first.', 'red');
    process.exit(1);
  }
  
  // Check if npm is available
  try {
    execSync('npm --version', { stdio: 'ignore' });
  } catch {
    log('❌ npm is not available. Please install npm first.', 'red');
    process.exit(1);
  }
  
  log('✅ Prerequisites check passed', 'green');
}

function installDependencies() {
  log('📦 Installing dependencies...', 'blue');
  
  if (!execCommand('npm ci')) {
    log('❌ Failed to install dependencies', 'red');
    process.exit(1);
  }
  
  log('✅ Dependencies installed successfully', 'green');
}

function runTests() {
  log('🧪 Running tests...', 'blue');
  
  if (!execCommand('npx nx run-many --target=test --all --skip-nx-cache')) {
    log('❌ Tests failed', 'red');
    return false;
  }
  
  log('✅ All tests passed', 'green');
  return true;
}

function buildApplications() {
  log('🏗️  Building applications...', 'blue');
  
  // Build API
  log('Building API...', 'yellow');
  if (!execCommand('npx nx build api --configuration=production')) {
    log('❌ Failed to build API', 'red');
    process.exit(1);
  }
  
  // Build Dashboard
  log('Building Dashboard...', 'yellow');
  if (!execCommand('npx nx build dashboard --configuration=production')) {
    log('❌ Failed to build Dashboard', 'red');
    process.exit(1);
  }
  
  log('✅ Applications built successfully', 'green');
}

function deployToRailway() {
  log('🚂 Deploying to Railway...', 'blue');
  
  // Check if Railway CLI is installed
  try {
    execSync('railway --version', { stdio: 'ignore' });
  } catch {
    log('Installing Railway CLI...', 'yellow');
    if (!execCommand('npm install -g @railway/cli')) {
      log('❌ Failed to install Railway CLI', 'red');
      return false;
    }
  }
  
  // Deploy
  if (!execCommand('railway deploy')) {
    log('❌ Failed to deploy to Railway', 'red');
    return false;
  }
  
  log('✅ Successfully deployed to Railway', 'green');
  return true;
}

function deployToVercel() {
  log('▲ Deploying to Vercel...', 'blue');
  
  // Check if Vercel CLI is installed
  try {
    execSync('vercel --version', { stdio: 'ignore' });
  } catch {
    log('Installing Vercel CLI...', 'yellow');
    if (!execCommand('npm install -g vercel')) {
      log('❌ Failed to install Vercel CLI', 'red');
      return false;
    }
  }
  
  // Deploy frontend
  log('Deploying frontend to Vercel...', 'yellow');
  const frontendPath = path.join(process.cwd(), 'dist', 'dashboard', 'browser');
  
  if (!fs.existsSync(frontendPath)) {
    log('❌ Frontend build not found. Please build first.', 'red');
    return false;
  }
  
  if (!execCommand('vercel --prod', { cwd: frontendPath })) {
    log('❌ Failed to deploy to Vercel', 'red');
    return false;
  }
  
  log('✅ Successfully deployed to Vercel', 'green');
  return true;
}

function deployToNetlify() {
  log('🌐 Deploying to Netlify...', 'blue');
  
  // Check if Netlify CLI is installed
  try {
    execSync('netlify --version', { stdio: 'ignore' });
  } catch {
    log('Installing Netlify CLI...', 'yellow');
    if (!execCommand('npm install -g netlify-cli')) {
      log('❌ Failed to install Netlify CLI', 'red');
      return false;
    }
  }
  
  // Deploy
  const frontendPath = path.join('dist', 'dashboard', 'browser');
  if (!execCommand(`netlify deploy --prod --dir=${frontendPath}`)) {
    log('❌ Failed to deploy to Netlify', 'red');
    return false;
  }
  
  log('✅ Successfully deployed to Netlify', 'green');
  return true;
}

function deployToTraditionalServer() {
  log('🖥️  Preparing for traditional server deployment...', 'blue');
  
  // Create deployment package
  const deployDir = 'deploy-package';
  
  if (fs.existsSync(deployDir)) {
    execCommand(`rm -rf ${deployDir}`, { stdio: 'ignore' });
  }
  
  fs.mkdirSync(deployDir, { recursive: true });
  
  // Copy built applications
  execCommand(`cp -r dist/ ${deployDir}/`);
  
  // Copy necessary files
  if (fs.existsSync('package.json')) {
    execCommand(`cp package.json ${deployDir}/`);
  }
  
  if (fs.existsSync('package-lock.json')) {
    execCommand(`cp package-lock.json ${deployDir}/`);
  }
  
  // Create production package.json with only production dependencies
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const prodPackageJson = {
    name: packageJson.name,
    version: packageJson.version,
    dependencies: packageJson.dependencies || {},
    scripts: {
      start: 'node dist/api/main.js'
    }
  };
  
  fs.writeFileSync(
    path.join(deployDir, 'package.json'),
    JSON.stringify(prodPackageJson, null, 2)
  );
  
  // Create deployment instructions
  const instructions = `
# Deployment Instructions

## 1. Upload this folder to your server
scp -r ${deployDir}/ user@your-server:/path/to/app/

## 2. On the server, install dependencies
cd /path/to/app/
npm ci --production

## 3. Set up environment variables
cp .env.production.example .env.production
# Edit .env.production with your values

## 4. Start the application
# Option 1: Direct start
npm start

# Option 2: With PM2 (recommended)
npm install -g pm2
pm2 start dist/api/main.js --name rbca-api
pm2 startup
pm2 save

## 5. Set up Nginx (optional)
# Copy nginx configuration and restart nginx
sudo cp nginx.conf /etc/nginx/sites-available/rbca
sudo ln -s /etc/nginx/sites-available/rbca /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

## Frontend files are in: dist/dashboard/browser/
## Serve these files with nginx or any web server
`;
  
  fs.writeFileSync(path.join(deployDir, 'DEPLOYMENT_INSTRUCTIONS.txt'), instructions);
  
  log(`✅ Deployment package created in: ${deployDir}/`, 'green');
  log('📋 Check DEPLOYMENT_INSTRUCTIONS.txt for server setup steps', 'cyan');
  
  return true;
}

function showMenu() {
  log('\n🚀 RBCA Task Management System - Deployment Tool', 'bright');
  log('=' .repeat(50), 'cyan');
  log('1. Railway (Recommended - Easy setup)', 'white');
  log('2. Vercel (Frontend hosting)', 'white');
  log('3. Netlify (Static site hosting)', 'white');
  log('4. Traditional Server (VPS/Dedicated)', 'white');
  log('5. Build only (no deployment)', 'white');
  log('6. Run tests only', 'white');
  log('0. Exit', 'white');
  log('=' .repeat(50), 'cyan');
}

function promptUser(question) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  log('🎯 Starting RBCA Task Management System Deployment', 'bright');
  
  // Check prerequisites
  checkPrerequisites();
  
  // Show menu if no arguments provided
  const args = process.argv.slice(2);
  let choice = args[0];
  
  if (!choice) {
    showMenu();
    choice = await promptUser('\nEnter your choice (0-6): ');
  }
  
  // Install dependencies
  installDependencies();
  
  switch (choice) {
    case '1':
    case 'railway':
      buildApplications();
      deployToRailway();
      break;
      
    case '2':
    case 'vercel':
      buildApplications();
      deployToVercel();
      break;
      
    case '3':
    case 'netlify':
      buildApplications();
      deployToNetlify();
      break;
      
    case '4':
    case 'server':
      buildApplications();
      deployToTraditionalServer();
      break;
      
    case '5':
    case 'build':
      buildApplications();
      log('✅ Build completed. Check the dist/ folder for built applications.', 'green');
      break;
      
    case '6':
    case 'test':
      runTests();
      break;
      
    case '0':
    case 'exit':
      log('👋 Goodbye!', 'yellow');
      process.exit(0);
      break;
      
    default:
      log('❌ Invalid choice. Please run the script again.', 'red');
      process.exit(1);
  }
  
  log('\n🎉 Deployment process completed!', 'bright');
  log('📊 Next steps:', 'cyan');
  log('  1. Configure your environment variables', 'white');
  log('  2. Set up your database', 'white');
  log('  3. Configure your domain (if applicable)', 'white');
  log('  4. Set up SSL certificates for production', 'white');
}

// Handle errors gracefully
process.on('unhandledRejection', (reason, promise) => {
  log('❌ Unhandled Rejection at:', 'red');
  log(promise, 'red');
  log('Reason:', 'red');
  log(reason, 'red');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log('❌ Uncaught Exception:', 'red');
  log(error, 'red');
  process.exit(1);
});

// Run the main function
if (require.main === module) {
  main().catch((error) => {
    log('❌ Deployment failed:', 'red');
    log(error.message, 'red');
    process.exit(1);
  });
}




