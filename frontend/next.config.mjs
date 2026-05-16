/** @type {import('next').NextConfig} */
const nextConfig = {
  // Note: removed `output: 'standalone'` — production PM2 uses `next start` which needs the
  // default server build (not the self-contained .next/standalone/server.js bundle).
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  // Send no-cache headers for ALL routes so the browser never serves a stale UI.
  // This means Cmd+Shift+R is no longer needed — every reload fetches fresh HTML/JS.
  // Trade-off: very slightly slower repeat loads on slow networks; on localhost
  // it's instant and worth it to avoid the "abhi bhi purana dikha raha hai" problem.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0' },
          { key: 'Pragma',        value: 'no-cache' },
          { key: 'Expires',       value: '0' },
        ],
      },
    ]
  },
}

export default nextConfig
