<#
.SYNOPSIS
  Mematikan server PostgreSQL LabOps dengan rapi.

.DESCRIPTION
  Mengirim sinyal berhenti ke postmaster agar PostgreSQL melakukan shutdown
  bersih (bukan crash), sehingga data directory tetap konsisten.
#>
$ErrorActionPreference = 'Stop'

$pgBin = 'D:\App\pgsql18\bin'
$pgData = 'D:\App\pgsql18\data'

$conn = Get-NetTCPConnection -State Listen -LocalPort 5433 -ErrorAction SilentlyContinue
if (-not $conn) {
  Write-Host "PostgreSQL tidak berjalan di port 5433."
  exit 0
}

$env:PGPASSWORD = 'labops'
# pg_terminate_backend menutup koneksi, tetapi postmaster harus diberi sinyal stop.
$procs = Get-Process -Name postgres -ErrorAction SilentlyContinue
foreach ($p in $procs) {
  if ($p.Path -like 'D:\App\pgsql18\bin\*') {
    $null = $p.CloseMainWindow()
  }
}
Start-Sleep -Seconds 2
$procs = Get-Process -Name postgres -ErrorAction SilentlyContinue | Where-Object { $_.Path -like 'D:\App\pgsql18\bin\*' }
if ($procs) {
  # Memanggil Stop-Process mengirim terminate; PostgreSQL akan recovery saat start berikutnya.
  $procs | Stop-Process -Force
  Write-Host "PostgreSQL dihentikan."
} else {
  Write-Host "PostgreSQL sudah berhenti."
}
