const path = require('path');
const os = require('os');

const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
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
