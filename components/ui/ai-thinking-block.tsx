"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Loader } from "@/components/ui/loader";

const DEFAULT_THINKING_CONTENT = `Analyzing the request structure and intent.

Identifying key entities and relationships within the prompt.

Evaluating available models and selecting the most appropriate one for this task.

Checking context window and token budget constraints.

Formulating a coherent response strategy with proper reasoning steps.

Verifying factual consistency and logical flow.

Optimizing output for clarity and precision.

Preparing final response stream.`;

interface AIThinkingBlockProps {
  content?: string;
  label?: string;
}

export default function AIThinkingBlock({
  content = DEFAULT_THINKING_CONTENT,
  label = "AI is thinking",
}: AIThinkingBlockProps) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [timer, setTimer] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerIntervalRef.current = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (contentRef.current) {
      const scrollHeight = contentRef.current.scrollHeight;
      const clientHeight = contentRef.current.clientHeight;
      const maxScroll = Math.max(0, scrollHeight - clientHeight);

      scrollIntervalRef.current = setInterval(() => {
        setScrollPosition((prev) => {
          const newPosition = prev + 1;
          if (newPosition >= maxScroll) {
            return 0;
          }
          return newPosition;
        });
      }, 5);

      return () => {
        if (scrollIntervalRef.current) {
          clearInterval(scrollIntervalRef.current);
        }
      };
    }
  }, []);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = scrollPosition;
    }
  }, [scrollPosition]);

  return (
    <div className="flex max-w-xl flex-col p-3">
      <div className="mb-4 flex items-center justify-start gap-2">
        <Loader size="sm" />
        <span className="bg-[linear-gradient(110deg,var(--color-secondary),35%,var(--color-primary),50%,var(--color-secondary),75%,var(--color-secondary))] bg-[length:200%_100%] bg-clip-text text-base text-transparent animate-shimmer">
          {label}
        </span>
        <span className="text-sm text-secondary">{timer}s</span>
      </div>
      <Card className="relative h-[150px] overflow-hidden border border-outline-variant bg-surface-container-low p-2">
        {/* Top fade overlay */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 h-[40px] bg-gradient-to-b from-30% from-surface-container-low to-transparent" />

        {/* Bottom fade overlay */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-[40px] bg-gradient-to-t from-30% from-surface-container-low to-transparent" />

        {/* Scrolling content */}
        <div
          ref={contentRef}
          className="h-full overflow-hidden p-4 text-primary"
          style={{ scrollBehavior: "auto" }}
        >
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
        </div>
      </Card>
    </div>
  );
}
