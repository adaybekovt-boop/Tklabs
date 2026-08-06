import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "TK Lab",
    short_name: "TK Lab",
    description: "Private AI workspace for focused, verifiable work.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f9f9f9",
    theme_color: "#101010",
    orientation: "any",
    categories: ["productivity", "utilities"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/images/brand/tk-app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/images/brand/tk-app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "AI Chat",
        short_name: "Chat",
        description: "Open the TK Lab AI workspace.",
        url: "/playground",
        icons: [{ src: "/images/brand/tk-app-icon.svg", sizes: "any", type: "image/svg+xml" }],
      },
      {
        name: "Patch Notes",
        short_name: "Updates",
        description: "Open the latest TK Lab release notes.",
        url: "/patch-notes",
        icons: [{ src: "/images/brand/tk-app-icon.svg", sizes: "any", type: "image/svg+xml" }],
      },
    ],
  };
}
