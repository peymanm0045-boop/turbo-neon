import type { NextConfig } from "next";

// BUILD_STATIC=1 -> static export (out/) for the Android APK build (Capacitor)
// default -> standalone server (normal web hosting)
const isStatic = process.env.BUILD_STATIC === "1";

const nextConfig: NextConfig = {
  output: isStatic ? "export" : "standalone",
  images: { unoptimized: true },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
