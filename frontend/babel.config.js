// Expo Babel configuration. The Reanimated plugin must remain last in the plugin list.
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
    ]
  };
};
