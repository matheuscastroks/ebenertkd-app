import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: "/(.*)",
      headers: securityHeaders(process.env.NODE_ENV === "production", process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    }];
  },
  async redirects() {
    return [
      { source: "/admin/alunos/:path*", destination: "/admin/matriculas/:path*", permanent: true },
      { source: "/matricula", destination: "/aluno/matricula", permanent: true },
      { source: "/menor", destination: "/aluno", permanent: true }
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      }
    ]
  },
  devIndicators: false,
  
};

export default nextConfig;
