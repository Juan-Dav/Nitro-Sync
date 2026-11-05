/*
=======================================================
NITRO SYNC - CONFIGURACIÓN DE METRO
=======================================================

Metro (el empaquetador de Expo) solo reconoce ciertas
extensiones como "assets". El Excel de aseguradoras
(.xlsx) se entrega dentro de la app, así que se añade
esa extensión para poder importarlo con `require`.

Se parte siempre de la configuración por defecto de
Expo para no perder nada (TypeScript, web, etc.).
=======================================================
*/

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

if (!config.resolver.assetExts.includes('xlsx')) {
  config.resolver.assetExts.push('xlsx');
}

module.exports = config;
