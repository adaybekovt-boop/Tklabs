import type { NextConfig } from "next";

import { assertProductionPreviewDisabled } from "./lib/local-preview";
import { SECURITY_HEADERS } from "./lib/security-headers.mjs";

assertProductionPreviewDisabled();

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.googleusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
