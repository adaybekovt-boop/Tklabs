import { useRef } from "react";

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
  const sessionIdRef = useRef(uid());

  function reset() {
    sessionIdRef.current = uid();
  }

  function setSessionId(id: string) {
    sessionIdRef.current = id;
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

  return { sessionIdRef, reset, setSessionId, save };
}
