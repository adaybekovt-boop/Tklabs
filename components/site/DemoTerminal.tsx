"use client";

import { FormEvent, useState } from "react";
import { ArrowUpRight, LoaderCircle, Send, ShieldCheck } from "lucide-react";

interface DemoMeta {
  model: string;
  latencyMs: number;
  cost: string;
}

function RouteBadge({ meta }: { meta: DemoMeta }) {
  return (
    <div className="route-badge">
      <ShieldCheck size={15} aria-hidden="true" />
      <span>route verified</span>
      <strong>{meta.model}</strong>
      <span>{meta.latencyMs}ms</span>
      <span>{meta.cost}</span>
    </div>
  );
}

export function DemoTerminal() {
  const [prompt, setPrompt] = useState("Give the facility one honest sentence.");
  const [output, setOutput] = useState("");
  const [meta, setMeta] = useState<DemoMeta | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function runDemo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || status === "loading") return;

    setStatus("loading");
    setOutput("");
    setMeta(null);
    window.dispatchEvent(new CustomEvent("facility:demo-start"));

    try {
      const response = await fetch("/api/demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: trimmedPrompt }),
      });

      if (!response.ok || !response.body) throw new Error("Demo unavailable");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const messages = buffer.split("\n\n");
        buffer = messages.pop() ?? "";

        for (const message of messages) {
          const line = message.split("\n").find((part) => part.startsWith("data: "));
          if (!line) continue;
          const payload = JSON.parse(line.slice(6)) as {
            token?: string;
            done?: boolean;
            meta?: DemoMeta;
          };
          if (payload.token) setOutput((current) => current + payload.token);
          if (payload.done && payload.meta) setMeta(payload.meta);
        }
      }

      setStatus("done");
    } catch {
      setStatus("error");
      setOutput("The facility declined to hallucinate. That is, technically, a good sign.");
    }
  }

  return (
    <div className="proof-terminal">
      <div className="terminal-topbar">
        <div className="terminal-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <span>proof-console / public route</span>
        <span className="terminal-lock">edge sandbox</span>
      </div>
      <div className="terminal-body">
        <div className="terminal-intro">
          <span className="eyebrow">04 / PROOF</span>
          <h2>Ask the machine<br /><em>one thing.</em></h2>
          <p>
            This is the only live action on the page. Your prompt enters a
            guarded edge route, the theatre load spikes, and the badge tells
            you exactly what happened.
          </p>
        </div>
        <form className="terminal-form" onSubmit={runDemo}>
          <label htmlFor="demo-prompt">prompt / max 180 chars</label>
          <div className="terminal-input-wrap">
            <span className="terminal-caret" aria-hidden="true">›</span>
            <input
              id="demo-prompt"
              maxLength={180}
              onChange={(event) => setPrompt(event.target.value)}
              value={prompt}
              aria-describedby="demo-help"
            />
            <button
              type="submit"
              aria-label="Send prompt"
              disabled={status === "loading"}
            >
              {status === "loading" ? <LoaderCircle className="animate-spin" size={17} /> : <Send size={17} />}
            </button>
          </div>
          <div className="terminal-form-meta" id="demo-help">
            <span>{prompt.length} / 180</span>
            <span>three requests / day</span>
          </div>
        </form>
        <div className={`terminal-output ${status === "error" ? "terminal-output-error" : ""}`} aria-live="polite">
          <div className="terminal-output-heading">
            <span>output / stream</span>
            {status === "loading" && <span className="streaming-label"><span className="status-dot" /> streaming</span>}
          </div>
          <p>{output || "Awaiting a prompt from the public."}{status === "loading" && <span className="blinking-caret" aria-hidden="true">▋</span>}</p>
          {meta && <RouteBadge meta={meta} />}
        </div>
      </div>
      <div className="terminal-footnote">
        <span>truth layer: enabled</span>
        <a href="/truth">How this works <ArrowUpRight size={13} aria-hidden="true" /></a>
      </div>
    </div>
  );
}
