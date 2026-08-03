import type { Metadata } from "next";

import { StatusPage } from "@/components/site/StatusPage";

export const metadata: Metadata = {
  title: "Status — Imaginary Intelligence",
  description: "The public incident history of a fictional AI facility.",
};

export default function StatusRoute() {
  return <StatusPage />;
}
