import { useRef, useState } from "react";

import { saveSession, type ArchivedMessage } from "@/lib/local-archive";

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);
}

function titleFrom(prompt: string) {
  const normalized = prompt
    .replace(/```[\s\S]*?```/g, " code ")
    .replace(/https?:\/\/\S+/g, " link ")
    .replace(/[#>*_`~\[\](){}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const firstSentence = normalized.split(/(?<=[.!?])\s/)[0]?.trim() || normalized;
  const title = firstSentence.slice(0, 56).trim();
  return title.length < firstSentence.length ? `${title}…` : title || "New conversation";
}

export function useConversationArchive() {
  const [sessionId, setSessionIdState] = useState(uid);
  const sessionIdRef = useRef(sessionId);

  function reset() {
    const id = uid();
    sessionIdRef.current = id;
    setSessionIdState(id);
    return id;
  }

  function setSessionId(id: string) {
    sessionIdRef.current = id;
    setSessionIdState(id);
  }

  function save(prompt: string, model: string, messages: ArchivedMessage[]) {
    saveSession({
      id: sessionIdRef.current,
      title: titleFrom(prompt),
      model,
      updatedAt: Date.now(),
      messages,
    });
  }

  return { sessionId, sessionIdRef, reset, setSessionId, save };
}
