/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { typedRoutes: false },
  webpack(config, { dev }) {
    // Vercel can log "Skipped not serializable cache item ... PostCSSSyntaxError"
    // when webpack persistent cache attempts to serialize PostCSS errors.
    // Disabling cache avoids noisy/fragile deploy builds.
    if (!dev) {
      config.cache = false;
    }
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
  }
};

module.exports = nextConfig;
