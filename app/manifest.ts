import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TK Lab",
    short_name: "TK Lab",
    description: "Private AI workspace for focused, verifiable work.",
    start_url: "/",
    display: "standalone",
    background_color: "#f9f9f9",
    theme_color: "#101010",
    orientation: "any",
    icons: [
      {
        src: "/images/brand/tk-logo.png",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/brand/tk-logo.png",
        sizes: "any",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
