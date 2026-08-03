import * as React from "react";

import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "outline";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 border font-mono text-xs uppercase tracking-[0.18em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e7ff49] disabled:pointer-events-none disabled:opacity-50",
        variant === "default" &&
          "border-[#e7ff49] bg-[#e7ff49] px-4 py-3 text-[#090a0b] hover:bg-[#f3ff9a]",
        variant === "outline" &&
          "border-white/25 bg-transparent px-4 py-3 text-white hover:border-[#e7ff49] hover:text-[#e7ff49]",
        variant === "ghost" &&
          "border-transparent bg-transparent px-2 py-2 text-white/70 hover:text-[#e7ff49]",
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { Button };
