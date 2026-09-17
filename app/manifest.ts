import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Haven Admin",
    short_name: "Haven Admin",
    description: "Haven moderation and admin dashboard",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0d0d0d",
    theme_color: "#e378ac",
    icons: [
      { src: "/icon", sizes: "32x32",   type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  }
}
