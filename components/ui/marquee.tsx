import * as React from "react";

import { cn } from "@/lib/utils";

interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  pauseOnHover?: boolean;
  repeat?: number;
}

export function Marquee({
  children,
  className,
  pauseOnHover = false,
  repeat = 2,
  ...props
}: MarqueeProps) {
  return (
    <div
      className={cn("marquee", pauseOnHover && "marquee-pause-on-hover", className)}
      {...props}
    >
      <div className="marquee-track">
        {Array.from({ length: Math.max(2, repeat) }, (_, index) => (
          <div className="marquee-group" aria-hidden={index > 0} key={index}>
            {children}
          </div>
        ))}
      </div>
    </div>
  );
}
