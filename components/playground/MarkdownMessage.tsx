"use client";

import { Maximize2, X } from "lucide-react";
import { lazy, Suspense, useState, type ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { ChatOverlay } from "@/components/playground/ChatOverlay";
import { safeMarkdownUrl } from "@/lib/safe-markdown-url";
import { cn } from "@/lib/utils";

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

const markdownComponents = {
  a: ({ href, children }: { href?: string; children?: ReactNode }) => href && href !== "#blocked-url" ? <a href={href} target="_blank" rel="noreferrer noopener" className="underline decoration-outline-variant underline-offset-4 hover:text-chat-accent">{children}</a> : <>{children}</>,
  pre: ({ children }: { children?: ReactNode }) => <FullscreenCodeBlock>{children}</FullscreenCodeBlock>,
  code: ({ className, children, ...props }: React.ComponentPropsWithoutRef<"code">) => <code className={cn("rounded bg-surface-container-low px-1.5 py-0.5 text-[0.9em]", className)} {...props}>{children}</code>,
  table: ({ children }: { children?: ReactNode }) => <div className="my-3 max-w-full overflow-x-auto overscroll-x-contain"><table className="min-w-max border-collapse text-left text-[13px]">{children}</table></div>,
  th: ({ children }: { children?: ReactNode }) => <th className="border-b border-outline-variant px-3 py-2 font-semibold">{children}</th>,
  td: ({ children }: { children?: ReactNode }) => <td className="border-b border-outline-variant px-3 py-2 align-top">{children}</td>,
};

/** Convert common model LaTeX delimiters to the delimiters remark-math parses. */
export function normalizeMathMarkdown(content: string) {
  const lines = content.split("\n");
  let fenced = false;
  return lines.map((line) => {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      return line;
    }
    if (fenced) return line;
    return line
      .replace(/\\\[/g, "$$")
      .replace(/\\\]/g, "$$")
      .replace(/\\\(/g, "$")
      .replace(/\\\)/g, "$");
  }).join("\n");
}

function BaseMarkdown({ content }: { content: string }) {
  return <Markdown remarkPlugins={[remarkGfm]} urlTransform={safeMarkdownUrl} components={markdownComponents}>{content}</Markdown>;
}

const MathMarkdown = lazy(async () => {
  const [{ default: rehypeKatex }, { default: remarkMath }] = await Promise.all([
    import("rehype-katex"),
    import("remark-math"),
  ]);

  function MathMarkdownRenderer({ content }: { content: string }) {
    return (
      <div className="chat-math-markdown max-w-full overflow-hidden">
        <Markdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false, output: "htmlAndMathml" }]]}
          urlTransform={safeMarkdownUrl}
          components={markdownComponents}
        >
          {content}
        </Markdown>
      </div>
    );
  }

  return { default: MathMarkdownRenderer };
});

function containsMath(content: string) {
  return /\$\$|(^|[^\\])\$[^$\n]+\$/m.test(content);
}

export function MarkdownMessage({ content }: { content: string }) {
  const normalized = normalizeMathMarkdown(content);
  if (!containsMath(normalized)) return <BaseMarkdown content={normalized} />;
  return <Suspense fallback={<BaseMarkdown content={normalized} />}><MathMarkdown content={normalized} /></Suspense>;
}