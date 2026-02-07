import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Note: esmExternals: "loose" is needed for @react-pdf/renderer compatibility
  // but shows a warning. This is expected and can be ignored.
  experimental: {
    esmExternals: "loose",
  },
  webpack: (config) => {
    // Handle @react-pdf/renderer canvas dependency
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
  // Exclude @react-pdf/renderer from server-side bundling
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
