"use client";

import { useRouter } from "next/navigation";
import { Activity, Boxes, FlaskConical, Newspaper } from "lucide-react";
import { MenuBar } from "@/components/ui/glow-menu";

export type GlowNavLabels = {
  chat: string;
  models: string;
  updates: string;
  status: string;
};

export function GlowNav({ active, labels }: { active?: string; labels: GlowNavLabels }) {
  const router = useRouter();
  const items = [
    { icon: FlaskConical, label: labels.chat, href: "/playground", activeKey: "laboratory", gradient: "radial-gradient(circle, rgba(249,115,22,0.18) 0%, rgba(234,88,12,0.07) 50%, rgba(194,65,12,0) 100%)", iconColor: "text-orange-500" },
    { icon: Boxes, label: labels.models, href: "/models", activeKey: "models", gradient: "radial-gradient(circle, rgba(168,85,247,0.18) 0%, rgba(147,51,234,0.07) 50%, rgba(126,34,206,0) 100%)", iconColor: "text-purple-500" },
    { icon: Newspaper, label: labels.updates, href: "/patch-notes", activeKey: "patch-notes", gradient: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, rgba(79,70,229,0.07) 50%, rgba(67,56,202,0) 100%)", iconColor: "text-indigo-500" },
    { icon: Activity, label: labels.status, href: "/status", activeKey: "status", gradient: "radial-gradient(circle, rgba(239,68,68,0.18) 0%, rgba(220,38,38,0.07) 50%, rgba(185,28,28,0) 100%)", iconColor: "text-red-500" },
  ];
  const activeLabel = items.find((item) => item.activeKey === active)?.label ?? "";

  return (
    <MenuBar
      items={items.map(({ icon, label, href, gradient, iconColor }) => ({ icon, label, href, gradient, iconColor }))}
      activeItem={activeLabel}
      onItemClick={(label) => {
        const item = items.find((entry) => entry.label === label);
        if (item) router.push(item.href);
      }}
    />
  );
}
