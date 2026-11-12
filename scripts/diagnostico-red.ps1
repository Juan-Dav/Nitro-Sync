# ========================================================
# NITRO SYNC - Diagnóstico de red (PC <-> celular)
# ========================================================
#
# USO:
#     npm run net:check
#
# Revisa, sin cambiar nada:
#   1. Las IP del PC y cuál se usaría en el QR.
#   2. La ruta por defecto (Internet) y el perfil de red.
#   3. La regla del firewall para el puerto 8081.
#   4. Si el puerto 8081 está escuchando.
#   5. Si la detección automática de Expo funcionaría.
#
# No requiere administrador (solo lee información).
# ========================================================

$ErrorActionPreference = 'SilentlyContinue'
$puerto = 8081

function Test-IpUtilizable([string]$ip) {
  if (-not $ip) { return $false }
  if ($ip -like '127.*') { return $false }
  if ($ip -like '169.254.*') { return $false }
  if ($ip -eq '0.0.0.0') { return $false }
  if ($ip -like '192.168.56.*') { return $false }
  if ($ip -like '192.168.99.*') { return $false }
  return $true
}

Write-Host ''
Write-Host '=== 1. Direcciones IPv4 del PC ===' -ForegroundColor Cyan
Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -ne '127.0.0.1' } |
  Select-Object InterfaceAlias, IPAddress, PrefixOrigin |
  Format-Table -AutoSize | Out-String | Write-Host

$ipQr = $null

$wifi = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.InterfaceAlias -match 'Wi-?Fi|Wireless|WLAN' -and (Test-IpUtilizable $_.IPAddress) } |
  Select-Object -First 1

if ($wifi) {
  $ipQr = $wifi.IPAddress
  Write-Host "IP que usará el QR (Wi-Fi): $ipQr" -ForegroundColor Green
} else {
  $rutas = Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Sort-Object RouteMetric, InterfaceMetric
  foreach ($ruta in $rutas) {
    $ip = Get-NetIPAddress -InterfaceIndex $ruta.InterfaceIndex -AddressFamily IPv4 |
      Where-Object { Test-IpUtilizable $_.IPAddress } | Select-Object -First 1
    if ($ip) { $ipQr = $ip.IPAddress; break }
  }

  if ($ipQr) {
    Write-Host "IP que usará el QR (ruta por defecto): $ipQr" -ForegroundColor Green
  } else {
    Write-Host 'No se encontró una IP válida para el QR.' -ForegroundColor Red
  }
}

Write-Host ''
Write-Host '=== 2. Ruta por defecto e interfaz ===' -ForegroundColor Cyan
Get-NetRoute -DestinationPrefix '0.0.0.0/0' |
  Sort-Object RouteMetric, InterfaceMetric |
  Select-Object -First 3 InterfaceAlias, NextHop, RouteMetric, InterfaceMetric |
  Format-Table -AutoSize | Out-String | Write-Host

Write-Host '=== 3. Perfil de red (debe ser Private) ===' -ForegroundColor Cyan
Get-NetConnectionProfile |
  Select-Object Name, InterfaceAlias, NetworkCategory |
  Format-Table -AutoSize | Out-String | Write-Host

Write-Host '=== 4. Firewall (puerto 8081) ===' -ForegroundColor Cyan
$regla = Get-NetFirewallRule -DisplayName '*8081*'
if ($regla) {
  $regla | Select-Object DisplayName, Enabled, Direction, Action, Profile |
    Format-Table -AutoSize | Out-String | Write-Host
  Write-Host 'Regla presente.' -ForegroundColor Green
} else {
  Write-Host 'NO hay regla para el puerto 8081. Ejecuta: npm run firewall' -ForegroundColor Yellow
}

Write-Host ''
Write-Host "=== 5. ¿Está escuchando el puerto $puerto? ===" -ForegroundColor Cyan
$escucha = Get-NetTCPConnection -State Listen -LocalPort $puerto
if ($escucha) {
  Write-Host ("Sí, alguien escucha en el puerto " + $puerto + ":") -ForegroundColor Green
  $escucha | Select-Object LocalAddress, LocalPort, State | Format-Table -AutoSize | Out-String | Write-Host
} else {
  Write-Host "No. Arranca el servidor con:  npm run start:lan" -ForegroundColor Yellow
}

Write-Host '=== 6. Detección automática de Expo (lan-network) ===' -ForegroundColor Cyan
try {
  node -e "const g=require('lan-network').lanNetworkSync(); console.log('Detección de Expo: '+g.address+' ('+g.iname+')')"
} catch {
  Write-Host 'No se pudo comprobar (lan-network no disponible).' -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'RECORDATORIO:' -ForegroundColor Cyan
Write-Host '  - El celular debe estar en la MISMA red Wi-Fi que el PC.' -ForegroundColor White
Write-Host '  - Arranca siempre con:  npm run start:lan  (calcula la IP actual).' -ForegroundColor White
Write-Host '  - Si cambias de red, vuelve a ejecutar npm run start:lan.' -ForegroundColor White
Write-Host ''
