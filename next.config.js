/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    GIT_COMMIT: process.env.GIT_COMMIT || process.env.NEXT_PUBLIC_GIT_COMMIT || '',
  },
  typescript: {
    // Next.js type checking during build is disabled to avoid redundant compilation
    // because `npx tsc --noEmit` already gates every CI workflow before `next build` starts.
    ignoreBuildErrors: true,
  },
  turbopack: {},
  // Vehicle photo background removal (lib/vehicle/cutout.ts) runs a WebAssembly model on the server.
  // Keep these packages out of the bundle and ship the .wasm files with the standalone build.
  serverExternalPackages: ['onnxruntime-web', 'sharp'],
  outputFileTracingIncludes: {
    // vehicle picture routes (cut-outs on the server, and the runtime the picture library sends to the browser)
    '/api/vehicle/**': [
      // cutout.ts imports the runtime at run time (hidden from the bundler), so ship what Node needs to
      // resolve it: the package manifest, its Node entry, the .wasm, and its one runtime dependency
      './node_modules/onnxruntime-web/package.json',
      './node_modules/onnxruntime-web/dist/ort.node.min.*',
      './node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs',
      './node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm',
      './node_modules/onnxruntime-web/dist/ort.wasm.min.mjs',
      './node_modules/onnxruntime-common/**/*',
    ],
  },
  generateBuildId: async () => {
    return process.env.GIT_COMMIT || process.env.NEXT_PUBLIC_GIT_COMMIT || 'production';
  },
  // R3: Disable on-the-fly image optimization to eliminate Sharp/libvips CPU spikes on Hostinger
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '30mb',
    },
    agentUpgrade: 'security',
    // Build workers. Next defaults to (CPU count - 1): 63 on the shared Hostinger server, which
    // exhausts the account's thread limit ("OS can't spawn worker thread", os error 11), aborts the
    // build and leaves the live app unable to spawn (503) while it runs. Override with NEXT_BUILD_CPUS.
    cpus: Number(process.env.NEXT_BUILD_CPUS) || 2,
  },
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.watchOptions = {
        poll: false,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        source: '/((?!_next/static|_next/image|favicon.ico|dashboards/[a-z0-9-]+/static/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ico)$).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'no-store',
          },
          {
            key: 'Surrogate-Control',
            value: 'no-store',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
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
            value: 'camera=(self), microphone=(self), geolocation=(), browsing-topics=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
