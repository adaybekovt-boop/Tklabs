"use client";

import { useRouter } from "next/navigation";
import {
  Home,
  Boxes,
  KeyRound,
  FlaskConical,
  Activity,
  FileText,
  Code2,
  Newspaper,
} from "lucide-react";
import { MenuBar } from "@/components/ui/glow-menu";

const navItems = [
  {
    icon: Home,
    label: "Home",
    href: "/",
    gradient:
      "radial-gradient(circle, rgba(59,130,246,0.18) 0%, rgba(37,99,235,0.07) 50%, rgba(29,78,216,0) 100%)",
    iconColor: "text-blue-500",
  },
  {
    icon: Boxes,
    label: "Models",
    href: "/models",
    gradient:
      "radial-gradient(circle, rgba(168,85,247,0.18) 0%, rgba(147,51,234,0.07) 50%, rgba(126,34,206,0) 100%)",
    iconColor: "text-purple-500",
  },
  {
    icon: KeyRound,
    label: "Access",
    href: "/access",
    gradient:
      "radial-gradient(circle, rgba(34,197,94,0.18) 0%, rgba(22,163,74,0.07) 50%, rgba(21,128,61,0) 100%)",
    iconColor: "text-green-500",
  },
  {
    icon: FlaskConical,
    label: "Lab",
    href: "/playground",
    gradient:
      "radial-gradient(circle, rgba(249,115,22,0.18) 0%, rgba(234,88,12,0.07) 50%, rgba(194,65,12,0) 100%)",
    iconColor: "text-orange-500",
  },
  {
    icon: Activity,
    label: "Status",
    href: "/status",
    gradient:
      "radial-gradient(circle, rgba(239,68,68,0.18) 0%, rgba(220,38,38,0.07) 50%, rgba(185,28,28,0) 100%)",
    iconColor: "text-red-500",
  },
  {
    icon: FileText,
    label: "Docs",
    href: "/documentation",
    gradient:
      "radial-gradient(circle, rgba(14,165,233,0.18) 0%, rgba(2,132,199,0.07) 50%, rgba(3,105,161,0) 100%)",
    iconColor: "text-sky-500",
  },
  {
    icon: Code2,
    label: "Devs",
    href: "/developers",
    gradient:
      "radial-gradient(circle, rgba(236,72,153,0.18) 0%, rgba(219,39,119,0.07) 50%, rgba(190,24,93,0) 100%)",
    iconColor: "text-pink-500",
  },
  {
    icon: Newspaper,
    label: "Patch",
    href: "/patch-notes",
    gradient:
      "radial-gradient(circle, rgba(99,102,241,0.18) 0%, rgba(79,70,229,0.07) 50%, rgba(67,56,202,0) 100%)",
    iconColor: "text-indigo-500",
  },
];

const labelToKey: Record<string, string> = {
  Home: "home",
  Models: "models",
  Access: "access",
  Lab: "laboratory",
  Status: "status",
  Docs: "documentation",
  Devs: "developers",
  Patch: "patch-notes",
};

export function GlowNav({ active }: { active?: string }) {
  const router = useRouter();

  const activeLabel =
    Object.entries(labelToKey).find(([, v]) => v === active)?.[0] || "";

  return (
    <MenuBar
      items={navItems}
      activeItem={activeLabel}
      onItemClick={(label) => {
        const item = navItems.find((i) => i.label === label);
        if (item) router.push(item.href);
      }}
    />
  );
}
