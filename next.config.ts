import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/login",
        destination: "/auth/login",
        permanent: false,
      },
      {
        source: "/sign-in",
        destination: "/auth/login",
        permanent: false,
      },
      {
        source: "/register",
        destination: "/auth/register",
        permanent: false,
      },
      {
        source: "/signup",
        destination: "/auth/register",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
