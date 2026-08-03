"use client";

import type React from "react";
import { useRef, useState } from "react";
import {
  ArrowUp,
  BookOpen,
  BrainCircuit,
  Code,
  FileText,
  Mic,
  PenTool,
  Plus,
  Search,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

type CommandCategory = "learn" | "code" | "write";
type Message = { role: "user" | "assistant"; text: string };

const commandSuggestions: Record<CommandCategory, string[]> = {
  learn: [
    "Explain the Big Bang theory in one dry sentence",
    "How does photosynthesis work?",
    "What are black holes?",
    "Explain quantum computing",
    "How does the human brain work?",
  ],
  code: [
    "Create a React component for a todo list",
    "Write a Python function to sort a list",
    "How to implement authentication in Next.js",
    "Explain async/await in JavaScript",
    "Create a CSS animation for a button",
  ],
  write: [
    "Write a professional email to a client",
    "Create a product description for a smartphone",
    "Draft a blog post about AI",
    "Write a creative story about space exploration",
    "Create a social media post about sustainability",
  ],
};

const categoryMeta: Record<CommandCategory, { label: string; icon: React.ReactNode }> = {
  learn: { label: "Learn", icon: <BookOpen className="h-4 w-4" /> },
  code: { label: "Code", icon: <Code className="h-4 w-4" /> },
  write: { label: "Write", icon: <PenTool className="h-4 w-4" /> },
};

function AssistantLogo() {
  return (
    <div className="ai-logo" aria-hidden="true">
      <span className="ai-logo-orbit" />
      <span className="ai-logo-core" />
    </div>
  );
}

export function AIAssistantInterface() {
  const [inputValue, setInputValue] = useState("");
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [deepResearchEnabled, setDeepResearchEnabled] = useState(false);
  const [reasonEnabled, setReasonEnabled] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [showUploadAnimation, setShowUploadAnimation] = useState(false);
  const [activeCommandCategory, setActiveCommandCategory] = useState<CommandCategory | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addUploadedFiles = (names: string[]) => {
    setShowUploadAnimation(true);
    window.setTimeout(() => {
      setUploadedFiles((previous) => [...previous, ...names]);
      setShowUploadAnimation(false);
    }, 650);
  };

  const handleUploadFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const names = Array.from(event.target.files ?? []).map((file) => file.name);
    if (names.length > 0) addUploadedFiles(names);
    event.target.value = "";
  };

  const handleCommandSelect = (command: string) => {
    setInputValue(command);
    setActiveCommandCategory(null);
    inputRef.current?.focus();
  };

  async function handleSendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = inputValue.trim();
    if (!prompt || isSending) return;

    setInputValue("");
    setActiveCommandCategory(null);
    setMessages((current) => [
      ...current,
      { role: "user", text: prompt },
      { role: "assistant", text: "" },
    ]);
    setIsSending(true);
    window.dispatchEvent(new CustomEvent("facility:demo-start"));

    try {
      const response = await fetch("/api/demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!response.ok || !response.body) throw new Error("Demo unavailable");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const eventChunk of events) {
          const dataLine = eventChunk.split("\n").find((line) => line.startsWith("data: "));
          if (!dataLine) continue;
          const payload = JSON.parse(dataLine.slice(6)) as { token?: string };
          if (payload.token) {
            setMessages((current) => {
              const next = [...current];
              const last = next[next.length - 1];
              if (last?.role === "assistant") next[next.length - 1] = { ...last, text: last.text + payload.token };
              return next;
            });
          }
        }
      }
    } catch {
      setMessages((current) => {
        const next = [...current];
        const last = next[next.length - 1];
        if (last?.role === "assistant") {
          next[next.length - 1] = {
            ...last,
            text: "The facility declined to hallucinate. That is, technically, a good sign.",
          };
        }
        return next;
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="ai-assistant-shell">
      <div className="ai-assistant-inner">
        <div className="ai-assistant-kicker">
          <span className="eyebrow text-[#e7ff49]">04 / PROOF CONSOLE</span>
          <span className="ai-kicker-status"><span className="status-dot" /> edge fallback / no key</span>
        </div>

        <div className="mb-7 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.86 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="mb-5"
          >
            <AssistantLogo />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <h2 className="ai-assistant-title">Ready to assist<br /><em>your premise.</em></h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-white/50">
              Ask a short question. The facility will stream an answer, spike
              its fictional load, and disclose the route underneath.
            </p>
          </motion.div>
        </div>

        <form className="ai-input-card" onSubmit={handleSendMessage}>
          <div className="ai-input-row">
            <span className="ai-input-prompt" aria-hidden="true">›</span>
            <input
              ref={inputRef}
              type="text"
              maxLength={180}
              placeholder="Ask the facility something…"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              aria-label="Ask the AI facility a question"
            />
            <button className="ai-send-button" type="submit" disabled={!inputValue.trim() || isSending} aria-label="Send message">
              {isSending ? <Sparkles className="h-4 w-4 animate-pulse" /> : <ArrowUp className="h-4 w-4" />}
            </button>
          </div>

          <AnimatePresence initial={false}>
            {uploadedFiles.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="ai-files-row">
                {uploadedFiles.map((file, index) => (
                  <div className="ai-file-chip" key={`${file}-${index}`}>
                    <FileText className="h-3 w-3" />
                    <span>{file}</span>
                    <button type="button" aria-label={`Remove ${file}`} onClick={() => setUploadedFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}>
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="ai-tools-row">
            <div className="ai-tool-toggles">
              <button type="button" onClick={() => setSearchEnabled((current) => !current)} className={searchEnabled ? "ai-tool active" : "ai-tool"} aria-pressed={searchEnabled}>
                <Search className="h-3.5 w-3.5" /> Search
              </button>
              <button type="button" onClick={() => setDeepResearchEnabled((current) => !current)} className={deepResearchEnabled ? "ai-tool active" : "ai-tool"} aria-pressed={deepResearchEnabled}>
                <BookOpen className="h-3.5 w-3.5" /> Deep research
              </button>
              <button type="button" onClick={() => setReasonEnabled((current) => !current)} className={reasonEnabled ? "ai-tool active" : "ai-tool"} aria-pressed={reasonEnabled}>
                <BrainCircuit className="h-3.5 w-3.5" /> Reason
              </button>
            </div>
            <button className="ai-mic-button" type="button" aria-label="Voice input unavailable in public preview"><Mic className="h-4 w-4" /></button>
          </div>

          <div className="ai-upload-row">
            <input ref={fileInputRef} type="file" className="hidden" multiple onChange={handleFileChange} />
            <button type="button" onClick={handleUploadFile} className="ai-upload-button">
              {showUploadAnimation ? <span className="ai-upload-dots"><i /><i /><i /></span> : <Plus className="h-4 w-4" />}
              <span>Upload files</span>
            </button>
            <span>{inputValue.length} / 180 · 3 requests / day</span>
          </div>
        </form>

        <div className="ai-command-grid">
          {(Object.keys(categoryMeta) as CommandCategory[]).map((category) => (
            <motion.button
              key={category}
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveCommandCategory((current) => current === category ? null : category)}
              className={activeCommandCategory === category ? "ai-command-button active" : "ai-command-button"}
            >
              {categoryMeta[category].icon}
              <span>{categoryMeta[category].label}</span>
            </motion.button>
          ))}
        </div>

        <AnimatePresence>
          {activeCommandCategory && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="ai-suggestions">
              <div className="ai-suggestions-heading">{categoryMeta[activeCommandCategory].label} suggestions</div>
              {commandSuggestions[activeCommandCategory].map((suggestion, index) => (
                <motion.button key={suggestion} type="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.03 }} onClick={() => handleCommandSelect(suggestion)}>
                  {categoryMeta[activeCommandCategory].icon}
                  <span>{suggestion}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {messages.length > 0 && (
            <motion.div className="ai-message-feed" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              {messages.slice(-4).map((message, index) => (
                <div className={message.role === "user" ? "ai-message user" : "ai-message assistant"} key={`${message.role}-${index}-${message.text.slice(0, 12)}`}>
                  <span>{message.role === "user" ? "you" : "route / fallback"}</span>
                  <p>{message.text || "…"}{isSending && index === messages.slice(-4).length - 1 && <i className="ai-message-caret">▋</i>}</p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="ai-assistant-footnote">
          <span>truth layer: enabled · no account · no history</span>
          <span>processed locally in the public preview</span>
        </div>
      </div>
    </div>
  );
}
