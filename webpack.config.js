const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  
  // Exclude server-side files from the webpack bundle
  config.resolve = config.resolve || {};
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "path": false,
    "fs": false,
    "crypto": false,
    "stream": false,
    "util": false,
    "os": false,
    "http": false,
    "https": false,
    "net": false,
    "child_process": false,
    "querystring": false,
    "zlib": false,
    "async_hooks": false,
  };

  // Exclude server.js and other backend files from bundling
  config.externals = config.externals || [];
  config.externals.push({
    'server.js': 'commonjs server.js',
    'setup.js': 'commonjs setup.js',
  });

  return config;
};
