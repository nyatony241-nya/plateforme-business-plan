import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components reste désactivé : l'application lit la session dans les cookies
  // sur la plupart des pages. À réévaluer quand les pages publiques se multiplieront.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
