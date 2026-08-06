"use client";

import { Maximize2, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { ChatOverlay } from "@/components/playground/ChatOverlay";
import { cn } from "@/lib/utils";

function safeUrlTransform(url: string) {
  try {
    const parsed = new URL(url, "https://tklabs.uk");
    if (parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "mailto:") return url;
  } catch {
    // Invalid links are rendered as text by react-markdown.
  }
  return "";
}

function FullscreenCodeBlock({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="group relative my-3 max-w-full">
        <pre className="max-w-full overflow-x-auto rounded-2xl bg-surface-container-low p-4 pr-12 text-[13px] leading-[1.6]">{children}</pre>
        <button type="button" onClick={() => setOpen(true)} className="absolute right-2 top-2 grid size-9 place-items-center rounded-xl border border-outline-variant bg-surface-container-lowest text-on-secondary-container opacity-80 hover:text-primary sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100" aria-label="Open code fullscreen"><Maximize2 size={14} /></button>
      </div>
      <ChatOverlay open={open} onClose={() => setOpen(false)} labelledBy="fullscreen-code-title" position="sheet" className="inset-2 max-h-none rounded-3xl p-0 md:inset-5 md:max-w-none" closeLabel="Close code">
        <div className="flex h-[calc(100dvh-1rem)] min-h-0 flex-col md:h-[calc(100dvh-2.5rem)]">
          <div className="flex min-h-14 items-center justify-between gap-3 border-b border-outline-variant px-4"><h2 id="fullscreen-code-title" className="text-sm font-medium text-primary">Code</h2><button type="button" onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-full text-primary hover:bg-surface-container-low" aria-label="Close code"><X size={16} /></button></div>
          <pre className="min-h-0 flex-1 overflow-auto bg-surface-container-low p-5 text-[13px] leading-[1.7] text-primary">{children}</pre>
        </div>
      </ChatOverlay>
    </>
  );
}

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      urlTransform={safeUrlTransform}
      components={{
        a: ({ href, children }) => href ? <a href={href} target="_blank" rel="noreferrer noopener" className="underline decoration-outline-variant underline-offset-4 hover:text-chat-accent">{children}</a> : <>{children}</>,
        pre: ({ children }) => <FullscreenCodeBlock>{children}</FullscreenCodeBlock>,
        code: ({ className, children, ...props }) => <code className={cn("rounded bg-surface-container-low px-1.5 py-0.5 text-[0.9em]", className)} {...props}>{children}</code>,
        table: ({ children }) => <div className="my-3 max-w-full overflow-x-auto overscroll-x-contain"><table className="min-w-max border-collapse text-left text-[13px]">{children}</table></div>,
        th: ({ children }) => <th className="border-b border-outline-variant px-3 py-2 font-semibold">{children}</th>,
        td: ({ children }) => <td className="border-b border-outline-variant px-3 py-2 align-top">{children}</td>,
      }}
    >
      {content}
    </Markdown>
  );
}
