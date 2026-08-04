import type { Metadata } from "next";

import "@/app/globals.css";
import { getLocale } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return locale === "en"
    ? {
        title: "TK Lab — Quiet Luxury",
        description: "A calm, precise AI laboratory for focused work.",
      }
    : {
        title: "TK Lab — Тихая точность",
        description: "Спокойная AI-лаборатория для сосредоточенной работы.",
      };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}