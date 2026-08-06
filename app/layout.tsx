import type { Metadata, Viewport } from "next";

import "@/app/globals.css";
import { getLocale } from "@/lib/locale";

const THEME_INIT_SCRIPT = `try {
  const theme = window.localStorage.getItem("tklabs-theme");
  if (theme === "dark" || theme === "light") document.documentElement.dataset.theme = theme;
} catch {}`;

const SITE_ICONS = {
  icon: "/images/brand/tk-logo.png",
  shortcut: "/images/brand/tk-logo.png",
  apple: "/images/brand/tk-logo.png",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9f9f9" },
    { media: "(prefers-color-scheme: dark)", color: "#101010" },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return locale === "en"
    ? {
        title: "TK Lab — Quiet Luxury",
        description: "A calm, precise AI laboratory for focused work.",
        icons: SITE_ICONS,
        manifest: "/manifest.webmanifest",
        appleWebApp: { capable: true, title: "TK Lab", statusBarStyle: "black-translucent" },
      }
    : {
        title: "TK Lab — Тихая точность",
        description: "Спокойная AI-лаборатория для сосредоточенной работы.",
        icons: SITE_ICONS,
        manifest: "/manifest.webmanifest",
        appleWebApp: { capable: true, title: "TK Lab", statusBarStyle: "black-translucent" },
      };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
