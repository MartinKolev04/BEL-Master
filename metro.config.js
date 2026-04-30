const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Firebase JS SDK v10 ships an incomplete `exports` field that confuses
// Metro's new package-exports resolver. Disable it and allow CJS so the
// `firebase/auth` component registration loads correctly under Hermes.
config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, { input: './global.css' });
