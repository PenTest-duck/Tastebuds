import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "qtlnrmzdibikcgrmjvnr.supabase.co",
        port: "",
        pathname: "/storage/**",
      }
    ]
  }
};

export default nextConfig;
