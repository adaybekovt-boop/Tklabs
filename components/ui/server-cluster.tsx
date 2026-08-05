"use client";

import { cn } from "@/lib/utils";

interface ServerClusterProps {
  className?: string;
}

function ServerUnit({
  delay,
  active,
  className,
}: {
  delay: number;
  active?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      {/* Server body */}
      <div className="relative w-12 overflow-hidden rounded-lg border border-primary/20 bg-surface-container-low px-1 py-2 shadow-sm md:w-14 md:py-3">
        {/* Top vent */}
        <div className="mb-1.5 flex justify-center gap-[3px]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[2px] w-2 rounded-full bg-primary/10" />
          ))}
        </div>
        {/* Drive bays */}
        <div className="space-y-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div
                className={cn(
                  "h-[3px] flex-1 rounded-full transition-colors",
                  i === 1 && active ? "bg-green-500/70" : "bg-primary/8"
                )}
                style={{
                  animation:
                    i === 1 && active
                      ? `serverBlink 2s ease-in-out ${delay + i * 0.15}s infinite`
                      : "none",
                }}
              />
              <div
                className={cn(
                  "h-1 w-1 rounded-full",
                  i === 0 && active ? "bg-blue-400/80" : "bg-primary/10"
                )}
                style={{
                  animation:
                    i === 0 && active
                      ? `serverPulse 1.5s ease-in-out ${delay}s infinite`
                      : "none",
                }}
              />
            </div>
          ))}
        </div>
        {/* Bottom vent */}
        <div className="mt-1.5 flex justify-center gap-[3px]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[2px] w-2 rounded-full bg-primary/10" />
          ))}
        </div>
      </div>
      {/* Status light below */}
      <div
        className="mt-2 h-[5px] w-[5px] rounded-full bg-green-500/60"
        style={{
          animation: `serverPulse 2.5s ease-in-out ${delay}s infinite`,
        }}
      />
    </div>
  );
}

export function ServerCluster({ className }: ServerClusterProps) {
  return (
    <div
      className={cn(
        "relative flex items-end justify-center gap-4 md:gap-6",
        className
      )}
    >
      {/* Connection lines — SVG overlay */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ zIndex: 0 }}
        preserveAspectRatio="none"
      >
        <line
          x1="35%"
          y1="45%"
          x2="50%"
          y2="55%"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeDasharray="3 3"
          className="text-primary/10"
          style={{ animation: "serverDash 3s linear infinite" }}
        />
        <line
          x1="65%"
          y1="45%"
          x2="50%"
          y2="55%"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeDasharray="3 3"
          className="text-primary/10"
          style={{ animation: "serverDash 3s linear 1.5s infinite" }}
        />
        <line
          x1="35%"
          y1="45%"
          x2="65%"
          y2="45%"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeDasharray="2 4"
          className="text-primary/8"
          style={{ animation: "serverDash 4s linear 0.5s infinite reverse" }}
        />
      </svg>

      {/* Server 1 */}
      <ServerUnit delay={0} active className="relative z-10" />

      {/* Server 2 — middle, taller */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative w-12 overflow-hidden rounded-lg border border-primary/20 bg-surface-container-low px-1 py-3 shadow-sm md:w-14 md:py-4">
          <div className="mb-1.5 flex justify-center gap-[3px]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[2px] w-2 rounded-full bg-primary/10" />
            ))}
          </div>
          <div className="space-y-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div
                  className={cn(
                    "h-[3px] flex-1 rounded-full",
                    i === 2 ? "bg-green-500/70" : "bg-primary/8"
                  )}
                  style={{
                    animation:
                      i === 2
                        ? "serverBlink 1.8s ease-in-out 0.3s infinite"
                        : "none",
                  }}
                />
                <div
                  className={cn(
                    "h-1 w-1 rounded-full",
                    i === 0 ? "bg-blue-400/80" : "bg-primary/10"
                  )}
                  style={{
                    animation:
                      i === 0
                        ? "serverPulse 1.2s ease-in-out 0.1s infinite"
                        : "none",
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex justify-center gap-[3px]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[2px] w-2 rounded-full bg-primary/10" />
            ))}
          </div>
        </div>
        <div
          className="mt-2 h-[5px] w-[5px] rounded-full bg-blue-400/60"
          style={{ animation: "serverPulse 2s ease-in-out 0.2s infinite" }}
        />
      </div>

      {/* Server 3 */}
      <ServerUnit delay={0.5} active className="relative z-10" />
    </div>
  );
}
