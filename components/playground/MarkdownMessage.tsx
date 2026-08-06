"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      urlTransform={safeUrlTransform}
      components={{
        a: ({ href, children }) => href ? <a href={href} target="_blank" rel="noreferrer noopener" className="underline decoration-outline-variant underline-offset-4 hover:text-chat-accent">{children}</a> : <>{children}</>,
        pre: ({ children }) => <pre className="my-3 max-w-full overflow-x-auto rounded-2xl bg-surface-container-low p-4 text-[13px] leading-[1.6]">{children}</pre>,
        code: ({ className, children, ...props }) => <code className={cn("rounded bg-surface-container-low px-1.5 py-0.5 text-[0.9em]", className)} {...props}>{children}</code>,
        table: ({ children }) => <div className="my-3 max-w-full overflow-x-auto"><table className="min-w-full border-collapse text-left text-[13px]">{children}</table></div>,
        th: ({ children }) => <th className="border-b border-outline-variant px-3 py-2 font-semibold">{children}</th>,
        td: ({ children }) => <td className="border-b border-outline-variant px-3 py-2 align-top">{children}</td>,
      }}
    >
      {content}
    </Markdown>
  );
}
