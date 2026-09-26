import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Ebener TKD",
    short_name: "Ebener TKD",
    description: "PWA de gestão para academia de taekwondo com área do aluno e painel admin.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#fffaf3",
    theme_color: "#F98E03",
    lang: "pt-BR",
    icons: [
      {
        src: "/brand-icon.png",
        sizes: "96x96",
        type: "image/png",
        purpose: "any"
      }
    ]
  };
}
