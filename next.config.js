const path = require('path');
const os = require('os');

const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'chinese-days': path.resolve(
        __dirname,
        'node_modules/chinese-days/dist/index.min.js'
      )
    };

    return config;
  }
};

module.exports = nextConfig;
