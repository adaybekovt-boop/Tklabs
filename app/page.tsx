import type { Metadata } from "next";

import { HomePage } from "@/components/site/HomePage";

export const metadata: Metadata = {
  title: "Imaginary Intelligence — вымышленный AI-объект",
  description: "Сатирический AI-объект с театральной телеметрией, честным раскрытием и отдельными AI-чатами.",
};

export default function Home() {
  return <HomePage />;
}
