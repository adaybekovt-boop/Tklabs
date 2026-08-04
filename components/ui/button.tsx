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
        "inline-flex items-center justify-center gap-2 border font-mono text-xs uppercase tracking-[0.1em] rounded-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] disabled:pointer-events-none disabled:opacity-50",
        variant === "default" &&
          "border-[color:var(--primary)] bg-[color:var(--primary)] px-4 py-3 text-[color:var(--background)] hover:bg-transparent hover:text-[color:var(--primary)]",
        variant === "outline" &&
          "border-white/25 bg-transparent px-4 py-3 text-white hover:border-[color:var(--primary)] hover:text-[color:var(--primary)]",
        variant === "ghost" &&
          "border-transparent bg-transparent px-2 py-2 text-white/76 hover:text-[color:var(--primary)]",
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { Button };
