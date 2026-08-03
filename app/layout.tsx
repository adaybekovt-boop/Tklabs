import type { Metadata } from "next";

import { LanguageProvider } from "@/components/providers/LanguageProvider";

import "./globals.css";
import "./ai.css";
import "./chat.css";
import "./chat-launch.css";

export const metadata: Metadata = {
  title: "Imaginary Intelligence вЂ” РІС‹РјС‹С€Р»РµРЅРЅС‹Р№ AI-РѕР±СЉРµРєС‚",
  description: "РЎР°С‚РёСЂРёС‡РµСЃРєРёР№ AI-РѕР±СЉРµРєС‚ СЃ С‚РµР°С‚СЂР°Р»СЊРЅРѕР№ С‚РµР»РµРјРµС‚СЂРёРµР№, С‡РµСЃС‚РЅС‹Рј СЂР°СЃРєСЂС‹С‚РёРµРј Рё РѕС‚РґРµР»СЊРЅС‹РјРё AI-С‡Р°С‚Р°РјРё.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
