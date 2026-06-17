import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
   productionBrowserSourceMaps: false,
   // Allow LAN devices (e.g. a phone testing the dashboard) to reach Next.js
   // dev resources like hot-module-reload. Dev-only; ignored in production.
   allowedDevOrigins: ["192.168.1.73"],
};

export default nextConfig;
