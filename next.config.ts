import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export → deploys as plain files on classic Firebase Hosting (Spark,
  // free, no billing account). New articles appear via a rebuild triggered by
  // the Sanity webhook (see .github/workflows/deploy.yml).
  output: "export",
  trailingSlash: true,
};

export default nextConfig;
