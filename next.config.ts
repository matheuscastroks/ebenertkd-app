import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  // Permite validar o build sem disputar os artefatos do servidor de desenvolvimento.
  distDir: process.env.NEXT_BUILD_DIR || ".next",
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
  onDemandEntries: {
    // Mantém rotas compiladas em memória no dev para evitar recompilação ao alternar telas.
    maxInactiveAge: 10 * 60 * 1000,
    pagesBufferLength: 30
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "radix-ui", "date-fns", "motion", "motion/react", "recharts"],
    // Documentos de inscrição e matrícula chegam até 5 MB (mais o multipart).
    serverActions: { bodySizeLimit: "6mb" }
  }
};

export default nextConfig;
