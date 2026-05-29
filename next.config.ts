import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sql.js ships a .wasm that must be loaded from node_modules at runtime,
  // so keep it out of the server bundle.
  serverExternalPackages: ["sql.js"],
};

export default nextConfig;
