"use client";

import { useEffect, useState } from "react";

import { Loader } from "@/components/ui/loader";

interface AIThinkingBlockProps {
  label?: string;
}

/** A small pending state for the JSON request contract; it does not fake tokens or hidden reasoning. */
export default function AIThinkingBlock({ label = "AI is thinking" }: AIThinkingBlockProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 py-2 text-on-secondary-container" role="status" aria-live="polite">
      <Loader size="sm" />
      <span>{label}</span>
      <span className="text-[12px]" aria-hidden="true">{elapsedSeconds}s</span>
    </div>
  );
}
