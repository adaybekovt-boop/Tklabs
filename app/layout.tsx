import type { Metadata, Viewport } from "next";

import { LanguageProvider } from "@/components/providers/LanguageProvider";

import "./fonts.css";
import "./globals.css";
import "./ai.css";
import "./auth.css";
import "./chat.css";
import "./chat-launch.css";

export const metadata: Metadata = {
  title: "Imaginary Intelligence — вымышленный AI-объект",
  description: "Сатирический AI-объект с театральной телеметрией, честным раскрытием и отдельными AI-чатами.",
  icons: {
    icon: "/tk-logo.png",
    shortcut: "/tk-logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
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
