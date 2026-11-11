<#
.SYNOPSIS
  Menjalankan server PostgreSQL untuk pengembangan LabOps.

.DESCRIPTION
  Memakai instalasi PostgreSQL 18 di Program Files dengan cluster terpisah
  di %LOCALAPPDATA%\LabOps\pgsql18 (port 5433). Instance PostgreSQL utama
  di port 5432 tidak disentuh.

  Jalankan skrip ini setelah restart Windows untuk menyalakan database.
#>
$ErrorActionPreference = 'Stop'

$pgBin = 'C:\Program Files\PostgreSQL\18\bin'
$pgData = Join-Path $env:LOCALAPPDATA 'LabOps\pgsql18\data'
$logOut = Join-Path $pgData 'server.log'

if (-not (Test-Path (Join-Path $pgBin 'pg_ctl.exe'))) {
  Write-Error "PostgreSQL tidak ditemukan di $pgBin"
  exit 1
}
if (-not (Test-Path (Join-Path $pgData 'PG_VERSION'))) {
  Write-Error "Data directory cluster belum ada di $pgData"
  exit 1
}

$running = Get-NetTCPConnection -State Listen -LocalPort 5433 -ErrorAction SilentlyContinue
if ($running) {
  Write-Host "PostgreSQL sudah berjalan di port 5433 (PID $($running.OwningProcess))."
  exit 0
}

& (Join-Path $pgBin 'pg_ctl.exe') -D $pgData -l $logOut start
if ($LASTEXITCODE -ne 0) {
  Write-Error "Gagal menjalankan PostgreSQL. Lihat $logOut"
  exit 1
}
Write-Host "PostgreSQL berjalan di port 5433."
Write-Host "Log: $logOut"
