import type { MetadataRoute } from "next";
import { getAcademyIdentity } from "@/features/academy/config-service";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const identity = await getAcademyIdentity();
  return {
    id: "/",
    name: identity.short_name,
    short_name: identity.short_name,
    description: "PWA de gestão para academia de taekwondo com área do aluno e painel admin.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f2f2f7",
    theme_color: identity.theme_color,
    lang: "pt-BR",
    icons: [
      {
        src: "/brand-icon.png",
        sizes: "96x96",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
