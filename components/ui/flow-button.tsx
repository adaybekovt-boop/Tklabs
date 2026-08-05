"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface FlowButtonProps {
  text?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
  dark?: boolean;
}

export function FlowButton({
  text = "Modern Button",
  href,
  onClick,
  className,
  dark = false,
}: FlowButtonProps) {
  const baseClasses = cn(
    "group relative inline-flex items-center gap-1 overflow-hidden rounded-full border-[1.5px] border-primary/40 bg-transparent px-8 py-3 text-sm font-semibold text-primary cursor-pointer transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-transparent hover:text-white hover:rounded-xl active:scale-[0.95]",
    dark && "border-primary/60 bg-primary text-on-primary hover:text-primary",
    className
  );

  const inner = (
    <>
      {/* Left arrow (arr-2) */}
      <ArrowRight
        className="absolute h-4 w-4 -left-[25%] z-[9] stroke-primary fill-none transition-all duration-[800ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:left-4 group-hover:stroke-white dark:stroke-on-primary"
      />

      {/* Text */}
      <span className="relative z-[1] -translate-x-3 transition-all duration-[800ms] ease-out group-hover:translate-x-3">
        {text}
      </span>

      {/* Circle */}
      <span className="absolute top-1/2 left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary opacity-0 transition-all duration-[800ms] ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:h-[220%] group-hover:w-[220%] group-hover:opacity-100" />

      {/* Right arrow (arr-1) */}
      <ArrowRight
        className="absolute h-4 w-4 right-4 z-[9] stroke-primary fill-none transition-all duration-[800ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-right-[25%] group-hover:stroke-white dark:stroke-on-primary"
      />
    </>
  );

  if (href) {
    return (
      <Link href={href} className={baseClasses} onClick={onClick}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" className={baseClasses} onClick={onClick}>
      {inner}
    </button>
  );
}
