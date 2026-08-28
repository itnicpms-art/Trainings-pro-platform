import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/", destination: "/ro", permanent: false },
      { source: "/login", destination: "/ro/login", permanent: false },
      { source: "/register", destination: "/ro/register", permanent: false },
      { source: "/app", destination: "/ro/app", permanent: false },
      { source: "/app/profiles", destination: "/ro/app/profiles", permanent: false },
      { source: "/app/settings", destination: "/ro/app/settings", permanent: false },
      { source: "/admin", destination: "/ro/admin", permanent: false },
      { source: "/admin/settings", destination: "/ro/admin/settings", permanent: false },
    ];
  },
};

export default nextConfig;
