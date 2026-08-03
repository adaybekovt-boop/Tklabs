import type { Metadata } from "next";

import { LoginPage } from "@/components/auth/LoginPage";

export const metadata: Metadata = {
  title: "Вход через Google — Imaginary Intelligence",
  description: "Безопасный вход, чтобы открыть AI-чаты Imaginary Intelligence.",
};

export default function LoginRoute() {
  return <LoginPage />;
}
