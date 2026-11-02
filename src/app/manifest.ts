import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NSC1 — Note Spese Cologno 1",
    short_name: "NSC1",
    description: "Note Spese del Gruppo Scout Cologno 1",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#1e293b",
    theme_color: "#1e293b",
    lang: "it",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
