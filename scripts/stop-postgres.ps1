<#
.SYNOPSIS
  Mematikan server PostgreSQL LabOps dengan rapi.

.DESCRIPTION
  Memakai pg_ctl sehingga postmaster melakukan shutdown bersih (bukan crash),
  dan hanya menyentuh cluster di %LOCALAPPDATA%\LabOps\pgsql18.
#>
$ErrorActionPreference = 'Stop'

$pgBin = 'C:\Program Files\PostgreSQL\18\bin'
$pgData = Join-Path $env:LOCALAPPDATA 'LabOps\pgsql18\data'

$conn = Get-NetTCPConnection -State Listen -LocalPort 5433 -ErrorAction SilentlyContinue
if (-not $conn) {
  Write-Host "PostgreSQL tidak berjalan di port 5433."
  exit 0
}

& (Join-Path $pgBin 'pg_ctl.exe') -D $pgData stop -m fast
if ($LASTEXITCODE -ne 0) {
  Write-Error "Gagal menghentikan PostgreSQL di $pgData"
  exit 1
}
Write-Host "PostgreSQL dihentikan."
