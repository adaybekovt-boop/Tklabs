import { useRef, useState } from "react";

import { saveSession, type ArchivedMessage } from "@/lib/local-archive";

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);
}

function titleFrom(prompt: string) {
  return prompt.length > 48 ? prompt.slice(0, 48) + "…" : prompt;
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
