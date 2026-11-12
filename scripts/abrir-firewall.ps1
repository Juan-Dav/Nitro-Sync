# ========================================================
# NITRO SYNC - Permitir el puerto 8081 en el firewall
# ========================================================
#
# Ejecuta:  npm run firewall
#
# (Se pedirá permiso de administrador automáticamente.)
#
# Windows Firewall puede bloquear las conexiones entrantes
# del celular hacia Metro (puerto 8081). Esta regla permite
# ese puerto en redes privadas (tu Wi-Fi de casa).
# ========================================================

$nombre = 'Expo/Metro - puerto 8081 (entrante)'

$esAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator
)

if (-not $esAdmin) {
  Write-Host 'Se necesitan permisos de administrador.' -ForegroundColor Yellow
  Write-Host 'Se abrirá una ventana nueva y te pedirá permiso...' -ForegroundColor Yellow
  Start-Process powershell -Verb RunAs -ArgumentList @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', "`"$PSCommandPath`""
  )
  exit
}

if (Get-NetFirewallRule -DisplayName $nombre -ErrorAction SilentlyContinue) {
  Write-Host "La regla '$nombre' ya existe. No se hace nada." -ForegroundColor Green
} else {
  New-NetFirewallRule `
    -DisplayName $nombre `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 8081 `
    -Action Allow `
    -Profile Private | Out-Null

  Write-Host "Regla creada: se permite el puerto 8081 en redes privadas." -ForegroundColor Green
}

Write-Host 'Listo. Puedes cerrar esta ventana.' -ForegroundColor Green
