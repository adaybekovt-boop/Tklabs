import type { Metadata } from "next";

import { LanguageProvider } from "@/components/providers/LanguageProvider";

import "./globals.css";
import "./ai.css";
import "./chat.css";
import "./chat-launch.css";

export const metadata: Metadata = {
  title: "Imaginary Intelligence — вымышленный AI-объект",
  description: "Сатирический AI-объект с театральной телеметрией, честным раскрытием и отдельными AI-чатами.",
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
