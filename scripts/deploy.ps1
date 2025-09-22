# RBCA Task Management System - PowerShell Deployment Script
# This script automates the deployment process on Windows

param(
    [Parameter(Position=0)]
    [ValidateSet("deploy", "rollback", "status", "backup", "health", "cleanup")]
    [string]$Command = "deploy"
)

# Configuration
$ProjectName = "rbca-task-manager"
$DockerComposeFile = "docker-compose.prod.yml"
$BackupDir = "backup"
$EnvFile = ".env.production"

# Colors for output
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Blue }
function Write-Success { param($Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    # Check if Docker is installed
    try {
        $null = docker --version
    } catch {
        Write-Error "Docker is not installed. Please install Docker Desktop first."
        exit 1
    }
    
    # Check if Docker Compose is installed
    try {
        $null = docker-compose --version
    } catch {
        Write-Error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    }
    
    # Check if environment file exists
    if (-not (Test-Path $EnvFile)) {
        Write-Error "Environment file $EnvFile not found. Please create it from .env.production.example"
        exit 1
    }
    
    Write-Success "Prerequisites check passed"
}

function Backup-Database {
    Write-Info "Creating database backup..."
    
    if (-not (Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir -Force
    }
    
    $BackupFile = "$BackupDir\backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
    
    try {
        # Load environment variables
        Get-Content $EnvFile | Where-Object { $_ -notmatch '^#' -and $_ -match '=' } | ForEach-Object {
            $key, $value = $_.Split('=', 2)
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
        
        $PostgresUser = $env:POSTGRES_USER
        $PostgresDb = $env:POSTGRES_DB
        
        docker-compose -f $DockerComposeFile exec -T postgres pg_dump -U $PostgresUser $PostgresDb | Out-File -FilePath $BackupFile -Encoding UTF8
        Write-Success "Database backup created: $BackupFile"
    } catch {
        Write-Warning "Backup failed or backup directory not accessible. Skipping backup."
    }
}

function Build-Images {
    Write-Info "Building Docker images..."
    docker-compose -f $DockerComposeFile build --no-cache
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Docker images built successfully"
    } else {
        Write-Error "Failed to build Docker images"
        exit 1
    }
}

function Invoke-Tests {
    Write-Info "Running tests..."
    
    # Build test image
    docker build --target development -t "$ProjectName-test" .
    
    if ($LASTEXITCODE -eq 0) {
        # Run tests
        docker run --rm "$ProjectName-test" npm test
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "All tests passed"
        } else {
            Write-Error "Tests failed"
            exit 1
        }
    } else {
        Write-Error "Failed to build test image"
        exit 1
    }
}

function Deploy-Services {
    Write-Info "Deploying services..."
    
    # Start services
    docker-compose -f $DockerComposeFile up -d --remove-orphans
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Services deployed successfully"
    } else {
        Write-Error "Failed to deploy services"
        exit 1
    }
}

function Test-Health {
    Write-Info "Performing health checks..."
    
    # Wait for services to start
    Start-Sleep -Seconds 30
    
    $HealthPassed = $true
    
    # Check API health
    try {
        $ApiResponse = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 10
        if ($ApiResponse.StatusCode -eq 200) {
            Write-Success "API health check passed"
        } else {
            Write-Error "API health check failed"
            $HealthPassed = $false
        }
    } catch {
        Write-Error "API health check failed: $($_.Exception.Message)"
        $HealthPassed = $false
    }
    
    # Check frontend
    try {
        $FrontendResponse = Invoke-WebRequest -Uri "http://localhost/nginx-health" -TimeoutSec 10
        if ($FrontendResponse.StatusCode -eq 200) {
            Write-Success "Frontend health check passed"
        } else {
            Write-Error "Frontend health check failed"
            $HealthPassed = $false
        }
    } catch {
        Write-Error "Frontend health check failed: $($_.Exception.Message)"
        $HealthPassed = $false
    }
    
    # Check database
    try {
        docker-compose -f $DockerComposeFile exec -T postgres pg_isready -U $env:POSTGRES_USER
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Database health check passed"
        } else {
            Write-Error "Database health check failed"
            $HealthPassed = $false
        }
    } catch {
        Write-Error "Database health check failed"
        $HealthPassed = $false
    }
    
    return $HealthPassed
}

function Remove-OldImages {
    Write-Info "Cleaning up old Docker images..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused volumes
    docker volume prune -f
    
    Write-Success "Cleanup completed"
}

function Invoke-Rollback {
    Write-Warning "Rolling back deployment..."
    
    # Stop current services
    docker-compose -f $DockerComposeFile down
    
    # Find latest backup
    $LatestBackup = Get-ChildItem -Path $BackupDir -Filter "backup_*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    
    if ($LatestBackup) {
        Write-Info "Restoring database from $($LatestBackup.Name)"
        docker-compose -f $DockerComposeFile up -d postgres
        Start-Sleep -Seconds 10
        Get-Content $LatestBackup.FullName | docker-compose -f $DockerComposeFile exec -T postgres psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB
    }
    
    Write-Warning "Rollback completed"
}

function Show-Status {
    Write-Info "Deployment status:"
    docker-compose -f $DockerComposeFile ps
    
    Write-Host ""
    Write-Info "Service URLs:"
    Write-Host "  Frontend: http://localhost" -ForegroundColor Cyan
    Write-Host "  API: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "  API Health: http://localhost:3000/health" -ForegroundColor Cyan
    Write-Host "  Grafana (if enabled): http://localhost:3001" -ForegroundColor Cyan
    Write-Host "  Prometheus (if enabled): http://localhost:9090" -ForegroundColor Cyan
}

function Start-Deployment {
    Write-Info "Starting deployment of $ProjectName..."
    
    # Load environment variables
    if (Test-Path $EnvFile) {
        Get-Content $EnvFile | Where-Object { $_ -notmatch '^#' -and $_ -match '=' } | ForEach-Object {
            $key, $value = $_.Split('=', 2)
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
    
    # Check prerequisites
    Test-Prerequisites
    
    # Create backup
    Backup-Database
    
    # Build images
    Build-Images
    
    # Run tests (optional, comment out if not needed)
    # Invoke-Tests
    
    # Deploy services
    Deploy-Services
    
    # Health checks
    if (-not (Test-Health)) {
        Write-Error "Health checks failed. Rolling back..."
        Invoke-Rollback
        exit 1
    }
    
    # Cleanup
    Remove-OldImages
    
    # Show status
    Show-Status
    
    Write-Success "Deployment completed successfully! 🚀"
}

# Main script logic
switch ($Command) {
    "deploy" { Start-Deployment }
    "rollback" { Invoke-Rollback }
    "status" { Show-Status }
    "backup" { Backup-Database }
    "health" { Test-Health }
    "cleanup" { Remove-OldImages }
    default {
        Write-Host "Usage: .\deploy.ps1 [deploy|rollback|status|backup|health|cleanup]" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Commands:" -ForegroundColor Yellow
        Write-Host "  deploy   - Full deployment (default)" -ForegroundColor White
        Write-Host "  rollback - Rollback to previous version" -ForegroundColor White
        Write-Host "  status   - Show current status" -ForegroundColor White
        Write-Host "  backup   - Create database backup" -ForegroundColor White
        Write-Host "  health   - Run health checks" -ForegroundColor White
        Write-Host "  cleanup  - Clean up old Docker images" -ForegroundColor White
        exit 1
    }
}

