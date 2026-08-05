"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MenuItem {
  icon: LucideIcon | React.FC;
  label: string;
  href: string;
  gradient: string;
  iconColor: string;
}

interface MenuBarProps extends React.HTMLAttributes<HTMLDivElement> {
  items: MenuItem[];
  activeItem?: string;
  onItemClick?: (label: string) => void;
}

const glowVariants = {
  initial: { opacity: 0, scale: 0.6 },
  hover: {
    opacity: 1,
    scale: 1.8,
    transition: {
      opacity: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
      scale: { duration: 0.5, type: "spring", stiffness: 300, damping: 25 },
    },
  },
};

const navGlowVariants = {
  initial: { opacity: 0 },
  hover: {
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

function useTkTheme() {
  const [theme, setTheme] = React.useState<"light" | "dark">("light");

  React.useEffect(() => {
    const el = document.documentElement;
    const update = () => setTheme(el.dataset.theme === "dark" ? "dark" : "light");
    update();
    const observer = new MutationObserver(update);
    observer.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return { theme };
}

export const MenuBar = React.forwardRef<HTMLDivElement, MenuBarProps>(
  ({ className, items, activeItem, onItemClick, ...props }, ref) => {
    const { theme } = useTkTheme();
    const isDarkTheme = theme === "dark";

    return (
      <motion.nav
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-b from-surface/90 to-surface/50 p-1.5 shadow-md backdrop-blur-lg",
          className
        )}
        initial="initial"
        whileHover="hover"
        {...props}
      >
        <motion.div
          className="pointer-events-none absolute -inset-2 z-0 rounded-3xl"
          style={{
            background: isDarkTheme
              ? "radial-gradient(circle, rgba(96,165,250,0.18) 0%, rgba(167,139,250,0.18) 50%, rgba(248,113,113,0.18) 100%)"
              : "radial-gradient(circle, rgba(59,130,246,0.12) 0%, rgba(147,51,234,0.12) 50%, rgba(239,68,68,0.12) 100%)",
          }}
          variants={navGlowVariants}
        />
        <ul className="relative z-10 flex items-center gap-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = item.label === activeItem;

            return (
              <motion.li key={item.label} className="relative">
                <button
                  onClick={() => onItemClick?.(item.label)}
                  className="block w-full"
                  type="button"
                >
                  <motion.div
                    className="group relative flex flex-col items-center justify-center rounded-xl px-2.5 py-1.5 md:px-3 md:py-2"
                    whileHover="hover"
                    initial="initial"
                  >
                    <motion.div
                      className="pointer-events-none absolute inset-0 z-0 rounded-xl"
                      variants={glowVariants}
                      animate={isActive ? "hover" : "initial"}
                      style={{
                        background: item.gradient,
                        opacity: isActive ? 1 : 0,
                      }}
                    />
                    <span
                      className={cn(
                        "relative z-10 transition-colors duration-300",
                        isActive ? item.iconColor : "text-primary",
                        `group-hover:${item.iconColor}`
                      )}
                    >
                      <Icon className="h-4 w-4 md:h-[18px] md:w-[18px]" />
                    </span>
                    <span
                      className={cn(
                        "relative z-10 mt-0.5 text-[10px] font-medium leading-tight tracking-tight transition-colors",
                        isActive
                          ? "text-primary"
                          : "text-secondary group-hover:text-primary"
                      )}
                    >
                      {item.label}
                    </span>
                  </motion.div>
                </button>
              </motion.li>
            );
          })}
        </ul>
      </motion.nav>
    );
  }
);

MenuBar.displayName = "MenuBar";
