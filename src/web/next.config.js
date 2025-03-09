const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
    NEXT_PUBLIC_WEBSOCKET_PROTOCOL: 'wss',
    NEXT_PUBLIC_WEBSOCKET_PATH: '/socket.io',
    NEXT_PUBLIC_ENCRYPTION_ENABLED: 'true',
    NEXT_PUBLIC_LOCAL_STORAGE_ONLY: 'true',
  },
  images: {
    domains: ['lh3.googleusercontent.com'],
    formats: ['image/avif', 'image/webp'],
  },
  headers: async () => {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
          },
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-eval' https://apis.google.com;
              connect-src 'self' https://*.googleapis.com https://api.openai.com wss://*.aiagentnetwork.com;
              img-src 'self' https://lh3.googleusercontent.com data:;
              style-src 'self' 'unsafe-inline';
              font-src 'self';
              frame-src 'self' https://accounts.google.com;
              object-src 'none';
            `.replace(/\s{2,}/g, ' ').trim(),
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer, dev }) => {
    // SQLite wasm file loading configuration
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    // Optimize bundle size in production
    if (!dev) {
      // Enable tree shaking
      config.optimization.usedExports = true;

      // Split chunks for better caching
      config.optimization.splitChunks = {
        chunks: 'all',
        maxInitialRequests: 25,
        minSize: 20000,
        cacheGroups: {
          default: false,
          vendors: false,
          framework: {
            name: 'framework',
            test: /[\/\\]node_modules[\/\\](@next|next|react|react-dom)[\/\\]/,
            priority: 40,
            chunks: 'all',
          },
          lib: {
            test: /[\/\\]node_modules[\/\\]/,
            priority: 30,
            chunks: 'all',
            name(module) {
              const match = module.context.match(/[\/\\]node_modules[\/\\](.*?)(?:[\/\\]|$)/);
              if (!match) return 'lib';
              const name = match[1].replace('@', '');
              return `lib-${name}`;
            },
          },
          encryption: {
            test: /[\/\\]node_modules[\/\\](crypto-js|libsodium-wrappers|jose)[\/\\]/,
            priority: 50,
            chunks: 'all',
            name: 'encryption',
          },
          storage: {
            test: /[\/\\]node_modules[\/\\](idb|sql\.js)[\/\\]/,
            priority: 50,
            chunks: 'all',
            name: 'storage',
          },
        },
      };
    }

    // Handle WebAssembly files for sql.js
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });

    return config;
  },
});