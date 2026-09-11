import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "@/lib/security-headers";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
