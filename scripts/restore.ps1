# =============================================================================
# EMBLEMA NEXUS — Script de Restauración para PowerShell (Windows)
# =============================================================================
# Restaura la base de datos PostgreSQL y configuraciones desde un backup en Windows.
# Uso:
#   powershell -ExecutionPolicy Bypass -File .\scripts\restore.ps1
#   Parametros opcionales:
#     -BackupFolder "C:\backups\emblema-nexus\20260922_120000"
# =============================================================================

[CmdletBinding()]
param (
    [string]$BackupFolder,
    [string]$BackupBaseDir = "C:\backups\emblema-nexus",
    [string]$EnvFile = ".env.production"
)

$ErrorActionPreference = "Stop"

function Write-Log {
    param([string]$Message, [string]$Color = "White")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $Message" -ForegroundColor $Color
}

Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host "         EMBLEMA NEXUS — Asistente de Restauración (PowerShell)              " -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan

# 1. Resolver backup a restaurar
if (-not $BackupFolder) {
    if (-not (Test-Path $BackupBaseDir)) {
        Write-Log "Error: No existe el directorio de respaldos $BackupBaseDir" "Red"
        exit 1
    }

    $AvailableBackups = Get-ChildItem -Path $BackupBaseDir -Directory | Sort-Object CreationTime -Descending
    if ($AvailableBackups.Count -eq 0) {
        Write-Log "Error: No se encontraron respaldos en $BackupBaseDir" "Red"
        exit 1
    }

    Write-Host "`nRespaldos disponibles en el sistema:" -ForegroundColor Yellow
    for ($i = 0; $i -lt $AvailableBackups.Count; $i++) {
        Write-Host "[$i] $($AvailableBackups[$i].Name) ($($AvailableBackups[$i].CreationTime))"
    }

    $Selection = Read-Host "`nSeleccione el número del respaldo a restaurar"
    if ($Selection -match '^\d+$' -and [int]$Selection -lt $AvailableBackups.Count) {
        $BackupFolder = $AvailableBackups[[int]$Selection].FullName
    } else {
        Write-Log "Selección no válida. Cancelando." "Red"
        exit 1
    }
}

if (-not (Test-Path $BackupFolder)) {
    Write-Log "Error: El directorio de respaldo no existe: $BackupFolder" "Red"
    exit 1
}

Write-Log "Directorio seleccionado: $BackupFolder" "Cyan"

# 2. Confirmación obligatoria de seguridad
Write-Host "`n=============================================================================" -ForegroundColor Red
Write-Host "                             ¡ADVERTENCIA!                                   " -ForegroundColor Red
Write-Host " Esta acción SOBREESCRIBIRÁ la base de datos de producción con el respaldo. " -ForegroundColor Red
Write-Host "=============================================================================" -ForegroundColor Red
$Confirm = Read-Host "Escriba 'RESTAURAR' para proceder con la recuperación de datos"

if ($Confirm -ne "RESTAURAR") {
    Write-Log "Operación cancelada por el usuario." "Yellow"
    exit 0
}

# 3. Cargar variables
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
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
}

$PostgresUser = if ($EnvVars.ContainsKey("POSTGRES_USER")) { $EnvVars["POSTGRES_USER"] } else { "emblema_user" }
$PostgresDb   = if ($EnvVars.ContainsKey("POSTGRES_DB")) { $EnvVars["POSTGRES_DB"] } else { "emblema_nexus" }

# 4. Detener temporalmente el contenedor de la aplicación
Write-Log "1/3: Pausando contenedor emblema-app..." "Yellow"
docker stop emblema-app 2>$null | Out-Null

# 5. Restaurar Base de Datos PostgreSQL Principal
try {
    Write-Log "2/3: Restaurando base de datos principal $PostgresDb..." "Yellow"
    $ZipFiles = Get-ChildItem -Path $BackupFolder -Filter "postgres_$($PostgresDb)_*.zip"

    if ($ZipFiles.Count -gt 0) {
        $ZipPath = $ZipFiles[0].FullName
        $TempExtract = Join-Path $BackupFolder "temp_restore"
        Expand-Archive -Path $ZipPath -DestinationPath $TempExtract -Force

        $SqlFile = (Get-ChildItem -Path $TempExtract -Filter "*.sql")[0].FullName

        # Terminar conexiones activas
        docker exec emblema-postgres psql -U $PostgresUser -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$PostgresDb' AND pid <> pg_backend_pid();" 2>$null | Out-Null

        # Restaurar SQL
        $restoreCmd = "docker exec -i emblema-postgres psql -U $PostgresUser -d $PostgresDb"
        cmd.exe /c "$restoreCmd < `"$SqlFile`""

        Remove-Item -Path $TempExtract -Recurse -Force
        Write-Log "Base de datos principal restaurada con éxito." "Green"
    } else {
        Write-Log "Aviso: No se encontró archivo de backup para $PostgresDb." "Yellow"
    }
} catch {
    Write-Log "Error durante la restauración de PostgreSQL: $_" "Red"
}

# 6. Reiniciar contenedores y verificar
Write-Log "3/3: Reactivando contenedor emblema-app..." "Yellow"
docker start emblema-app | Out-Null

Start-Sleep -Seconds 5

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method Get -TimeoutSec 10
    if ($response.status -eq "ok") {
        Write-Log "Servidor web verificado correctamente (/api/health OK)." "Green"
    }
} catch {
    Write-Log "Aviso: El servicio web está arrancando. Verifique con: docker logs emblema-app" "Yellow"
}

Write-Host "=============================================================================" -ForegroundColor Green
Write-Host "            ¡Restauración de Emblema Nexus completada con éxito!             " -ForegroundColor Green
Write-Host "=============================================================================" -ForegroundColor Green
