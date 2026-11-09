<#
.SYNOPSIS
  Menjalankan server PostgreSQL LabOps.

.DESCRIPTION
  pg_ctl.exe diblokir oleh Application Control di mesin ini, jadi server
  dijalankan lewat postgres.exe secara langsung. Jalankan skrip ini setelah
  restart Windows untuk menyalakan database kembali.

  Konfigurasi: D:\App\pgsql18\data (port 5433, database "labops").
#>
$ErrorActionPreference = 'Stop'

$pgBin = 'D:\App\pgsql18\bin'
$pgData = 'D:\App\pgsql18\data'
$logOut = Join-Path $pgData 'server.log'
$logErr = Join-Path $pgData 'server.err.log'

if (-not (Test-Path (Join-Path $pgBin 'postgres.exe'))) {
  Write-Error "PostgreSQL tidak ditemukan di $pgBin"
  exit 1
}

$running = Get-NetTCPConnection -State Listen -LocalPort 5433 -ErrorAction SilentlyContinue
if ($running) {
  Write-Host "PostgreSQL sudah berjalan di port 5433 (PID $($running.OwningProcess))."
  exit 0
}

$proc = Start-Process -FilePath (Join-Path $pgBin 'postgres.exe') `
  -ArgumentList '-D', $pgData `
  -RedirectStandardOutput $logOut `
  -RedirectStandardError $logErr `
  -WindowStyle Hidden `
  -PassThru

Start-Sleep -Seconds 5
if (Get-Process -Id $proc.Id -ErrorAction SilentlyContinue) {
  Write-Host "PostgreSQL berjalan. PID=$($proc.Id) port=5433"
  Write-Host "Log: $logErr"
} else {
  Write-Error "Gagal menjalankan PostgreSQL. Lihat $logErr"
  exit 1
}
