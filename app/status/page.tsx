import type { Metadata } from "next";

import { StatusPage } from "@/components/site/StatusPage";

export const metadata: Metadata = {
  title: "Статус — Imaginary Intelligence",
  description: "Публичная история инцидентов вымышленного AI-объекта.",
};

export default function StatusRoute() {
  return <StatusPage />;
}
