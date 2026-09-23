# =============================================================================
# EMBLEMA NEXUS — Script de Respaldo Automatizado para PowerShell (Windows)
# =============================================================================
# Permite realizar copias de seguridad de la base de datos PostgreSQL,
# configuración y datos de Nextcloud en entornos de servidor Windows.
# Uso:
#   powershell -ExecutionPolicy Bypass -File .\scripts\backup.ps1
#   Parametros opcionales:
#     -BackupDir "C:\backups\emblema-nexus"
#     -RetentionDays 30
# =============================================================================

[CmdletBinding()]
param (
    [string]$BackupDir = "C:\backups\emblema-nexus",
    [int]$RetentionDays = 30,
    [string]$EnvFile = ".env.production"
)

$ErrorActionPreference = "Stop"

function Write-Log {
    param([string]$Message, [string]$Color = "White")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $Message" -ForegroundColor $Color
}

Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host "         EMBLEMA NEXUS — Copia de Seguridad del Sistema (PowerShell)         " -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan

# 1. Resolver ruta base y variables
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot

$FullEnvPath = Join-Path $ProjectRoot $EnvFile
$EnvVars = @{}

if (Test-Path $FullEnvPath) {
    Get-Content $FullEnvPath | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $EnvVars[$parts[0].Trim()] = $parts[1].Trim()
        }
    }
} else {
    Write-Log "Aviso: No se encontró el archivo $EnvFile. Usando credenciales por defecto." "Yellow"
}

$PostgresUser = if ($EnvVars.ContainsKey("POSTGRES_USER")) { $EnvVars["POSTGRES_USER"] } else { "emblema_user" }
$PostgresDb   = if ($EnvVars.ContainsKey("POSTGRES_DB")) { $EnvVars["POSTGRES_DB"] } else { "emblema_nexus" }
$NextcloudDb  = if ($EnvVars.ContainsKey("NEXTCLOUD_DB")) { $EnvVars["NEXTCLOUD_DB"] } else { "nextcloud" }

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$CurrentBackupFolder = Join-Path $BackupDir $Timestamp

if (-not (Test-Path $CurrentBackupFolder)) {
    New-Item -ItemType Directory -Path $CurrentBackupFolder -Force | Out-Null
}

Write-Log "Directorio de destino: $CurrentBackupFolder" "Cyan"

# 2. Respaldo de Base de Datos Principal de Emblema Nexus
try {
    Write-Log "1/4: Exportando base de datos principal ($PostgresDb)..." "Yellow"
    $DbDumpSql = Join-Path $CurrentBackupFolder "postgres_$($PostgresDb)_$($Timestamp).sql"
    $DbDumpZip = Join-Path $CurrentBackupFolder "postgres_$($PostgresDb)_$($Timestamp).zip"

    # Ejecutar pg_dump dentro del contenedor Docker
    $dumpCmd = "docker exec emblema-postgres pg_dump -U $PostgresUser -d $PostgresDb --clean --if-exists"
    cmd.exe /c "$dumpCmd > `"$DbDumpSql`""

    if (Test-Path $DbDumpSql) {
        Compress-Archive -Path $DbDumpSql -DestinationPath $DbDumpZip -CompressionLevel Optimal
        Remove-Item -Path $DbDumpSql -Force
        Write-Log "Base de datos principal exportada y comprimida con éxito." "Green"
    }
} catch {
    Write-Log "Error al exportar base de datos principal: $_" "Red"
}

# 3. Respaldo de Base de Datos de Nextcloud
try {
    Write-Log "2/4: Exportando base de datos de Nextcloud ($NextcloudDb)..." "Yellow"
    $NcDumpSql = Join-Path $CurrentBackupFolder "postgres_$($NextcloudDb)_$($Timestamp).sql"
    $NcDumpZip = Join-Path $CurrentBackupFolder "postgres_$($NextcloudDb)_$($Timestamp).zip"

    $ncCmd = "docker exec emblema-postgres pg_dump -U $PostgresUser -d $NextcloudDb --clean --if-exists"
    cmd.exe /c "$ncCmd > `"$NcDumpSql`"" 2>$null

    if ((Test-Path $NcDumpSql) -and (Get-Item $NcDumpSql).Length -gt 0) {
        Compress-Archive -Path $NcDumpSql -DestinationPath $NcDumpZip -CompressionLevel Optimal
        Remove-Item -Path $NcDumpSql -Force
        Write-Log "Base de datos de Nextcloud exportada con éxito." "Green"
    } else {
        if (Test-Path $NcDumpSql) { Remove-Item -Path $NcDumpSql -Force }
        Write-Log "Aviso: No se pudo respaldar $NextcloudDb (puede no haber sido creada aún)." "Yellow"
    }
} catch {
    Write-Log "Aviso al respaldar base de datos Nextcloud: $_" "Yellow"
}

# 4. Respaldo de Archivos y Configuración
try {
    Write-Log "3/4: Respaldando configuraciones de despliegue..." "Yellow"
    $ConfigZip = Join-Path $CurrentBackupFolder "config_$($Timestamp).zip"
    $FilesToZip = @()

    if (Test-Path $FullEnvPath) { $FilesToZip += $FullEnvPath }
    if (Test-Path "deploy") { $FilesToZip += (Resolve-Path "deploy").Path }
    if (Test-Path "docker-compose.prod.yml") { $FilesToZip += (Resolve-Path "docker-compose.prod.yml").Path }

    if ($FilesToZip.Count -gt 0) {
        Compress-Archive -Path $FilesToZip -DestinationPath $ConfigZip -Force
        Write-Log "Archivos de configuración respaldados." "Green"
    }
} catch {
    Write-Log "Aviso al respaldar configuraciones: $_" "Yellow"
}

# 5. Generar Checksums SHA256
try {
    Write-Log "4/4: Generando sumas de comprobación SHA256..." "Yellow"
    $ChecksumFile = Join-Path $CurrentBackupFolder "SHA256SUMS.txt"
    $Hashes = Get-ChildItem -Path $CurrentBackupFolder -Filter "*.zip" | Get-FileHash -Algorithm SHA256
    $Hashes | ForEach-Object { "$($_.Hash)  $($_.Path | Split-Path -Leaf)" } | Out-File -FilePath $ChecksumFile -Encoding utf8
    Write-Log "Checksums calculados correctamente." "Green"
} catch {
    Write-Log "Aviso al calcular hashes: $_" "Yellow"
}

# 6. Depuración de Respaldos Antiguos (> RetentionDays)
try {
    Write-Log "Comprobando política de retención ($RetentionDays días)..." "Yellow"
    $LimitDate = (Get-Date).AddDays(-$RetentionDays)
    $OldFolders = Get-ChildItem -Path $BackupDir -Directory | Where-Object { $_.CreationTime -lt $LimitDate }

    foreach ($folder in $OldFolders) {
        Write-Log "Eliminando copia de seguridad expirada: $($folder.FullName)" "Yellow"
        Remove-Item -Path $folder.FullName -Recurse -Force
    }
} catch {
    Write-Log "Aviso durante la depuración de copias antiguas: $_" "Yellow"
}

Write-Host "=============================================================================" -ForegroundColor Green
Write-Host "   ¡Copia de seguridad completada exitosamente en $CurrentBackupFolder!      " -ForegroundColor Green
Write-Host "=============================================================================" -ForegroundColor Green
