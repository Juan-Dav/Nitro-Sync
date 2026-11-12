# ========================================================
# NITRO SYNC - Arrancar Expo con la IP correcta
# ========================================================
#
# USO:
#     npm run start:lan        (red local / Wi-Fi, recomendado)
#     npm run start:tunnel     (túnel, para redes restringidas)
#
# ¿Por qué existe este script?
#   Expo calcula la IP que anuncia en el QR con la librería
#   interna "lan-network". En este PC esa detección devuelve
#   127.0.0.1 (interfaz de bucle local), por lo que el QR
#   quedaría apuntando a 127.0.0.1 y el celular no podría
#   descargar el bundle:
#       java.io.IOException: Failed to download remote update
#
#   Este script detecta la IP real en el momento (prefiere la
#   interfaz Wi-Fi, que es donde está el celular) y se la pasa
#   a Expo con REACT_NATIVE_PACKAGER_HOSTNAME. Al calcularse en
#   cada arranque, nunca se conserva una IP antigua cuando
#   cambias de red.
# ========================================================

param(
  [switch]$Tunnel,
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Rest
)

$ErrorActionPreference = 'SilentlyContinue'
$puerto = 8081

# ¿La IP sirve para que el celular llegue al PC?
function Test-IpUtilizable([string]$ip) {
  if (-not $ip) { return $false }
  if ($ip -like '127.*') { return $false }        # bucle local
  if ($ip -like '169.254.*') { return $false }    # APIPA (sin red)
  if ($ip -eq '0.0.0.0') { return $false }
  # Tarjetas virtuales (VirtualBox / VMware) que NO llegan al celular.
  if ($ip -like '192.168.56.*') { return $false } # VirtualBox Host-Only
  if ($ip -like '192.168.99.*') { return $false } # VMware / Docker
  return $true
}

function Get-IpDeLan {
  # 1) Preferimos la Wi-Fi: es la misma red del celular.
  $wifi = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
      $_.InterfaceAlias -match 'Wi-?Fi|Wireless|WLAN' -and
      (Test-IpUtilizable $_.IPAddress)
    } |
    Sort-Object -Property InterfaceIndex |
    Select-Object -First 1

  if ($wifi) { return $wifi.IPAddress }

  # 2) Si no hay Wi-Fi, la interfaz con ruta por defecto
  #    (la que sale a Internet).
  $rutas = Get-NetRoute -DestinationPrefix '0.0.0.0/0' |
    Sort-Object RouteMetric, InterfaceMetric

  foreach ($ruta in $rutas) {
    $ip = Get-NetIPAddress -InterfaceIndex $ruta.InterfaceIndex -AddressFamily IPv4 |
      Where-Object { Test-IpUtilizable $_.IPAddress } |
      Select-Object -First 1

    if ($ip) { return $ip.IPAddress }
  }

  return $null
}

# Avisos útiles (firewall / perfil de red) para el mismo Wi-Fi.
function Show-AvisosDeRed([string]$ip) {
  # Perfil de red: en "Pública" el firewall bloquea la entrada.
  $perfil = Get-NetConnectionProfile |
    Where-Object { $_.InterfaceAlias -match 'Wi-?Fi|Wireless|WLAN' } |
    Select-Object -First 1

  if ($perfil -and $perfil.NetworkCategory -ne 'Private') {
    Write-Host "Aviso: tu red Wi-Fi ($($perfil.Name)) está como '$($perfil.NetworkCategory)'." -ForegroundColor Yellow
    Write-Host "       Windows puede bloquear al celular. Ponla como 'Privada' o corre: npm run firewall" -ForegroundColor Yellow
  }

  if (-not (Get-NetFirewallRule -DisplayName '*8081*' -ErrorAction SilentlyContinue)) {
    Write-Host 'Aviso: no hay regla de firewall para el puerto 8081.' -ForegroundColor Yellow
    Write-Host '       Si el celular no conecta, ejecuta:  npm run firewall' -ForegroundColor Yellow
  }
}

if ($Tunnel) {
  Write-Host 'Iniciando con TUNEL (usa Internet, evita problemas de red local)...' -ForegroundColor Cyan
  & npx expo start --tunnel @Rest
} else {
  $ip = Get-IpDeLan

  if ($ip) {
    $env:REACT_NATIVE_PACKAGER_HOSTNAME = $ip
    Write-Host "IP de este PC detectada: $ip" -ForegroundColor Green
    Write-Host "El QR debe mostrar:      exp://${ip}:${puerto}" -ForegroundColor Green
    Write-Host 'Conéctate desde el celular a ESTA misma red Wi-Fi.' -ForegroundColor Green
    Show-AvisosDeRed $ip
    Write-Host ''
  } else {
    Write-Host 'No se pudo detectar una IP Wi-Fi válida.' -ForegroundColor Yellow
    Write-Host 'Revisa que el Wi-Fi esté conectado, o usa:  npm run start:tunnel' -ForegroundColor Yellow
    Write-Host ''
  }

  & npx expo start --lan --port $puerto @Rest
}
