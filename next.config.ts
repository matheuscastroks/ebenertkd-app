import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
  }
};

export default nextConfig;
