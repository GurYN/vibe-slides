import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Transpile xterm packages for proper CSS handling
  transpilePackages: [
    "@xterm/xterm",
    "@xterm/addon-fit",
    "@xterm/addon-web-links",
  ],
};

export default nextConfig;
