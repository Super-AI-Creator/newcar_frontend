/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { typedRoutes: false },
  webpack(config, { dev }) {
    // Vercel can log "Skipped not serializable cache item ... PostCSSSyntaxError"
    // when webpack persistent cache attempts to serialize PostCSS errors.
    // Disabling cache avoids noisy/fragile deploy builds.
    //
    // Dev: persistent cache on Windows often causes missing `./vendor-chunks/*.js` and
    // PackFileCacheStrategy ENOENT after interrupted compiles — disable in dev too.
    config.cache = false;
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.pexels.com"
      },
      {
        protocol: "https",
        hostname: "newcarsuperstore.com"
      }
    ]
  },
  async rewrites() {
    const backend = process.env.API_BASE_URL || "http://127.0.0.1:8000";
    return [
      {
        source: "/backend/:path*",
        destination: `${backend}/:path*`
      }
    ];
  },
  async redirects() {
    return [{ source: "/terms", destination: "/privacy", permanent: true }];
  },
  async headers() {
    return [
      {
        // Avoid stale HTML after deploys causing chunk mismatches on client browsers.
        // Static hashed assets under /_next keep their immutable caching behavior.
        source: "/:path((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate"
          },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
