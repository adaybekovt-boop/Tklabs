import type { ArchivedMessageVersion } from "@/lib/local-archive";
import type { ChatMessage } from "@/components/playground/MessageList";
import type { ChatInputSubmitAttachment } from "@/components/ui/ai-chat-input";
import type { WorkspaceMode } from "@/lib/workspace/run";

export type ChatTone = "professional" | "character" | "erma";
export type ChatRequestStatus =
  | "idle"
  | "connecting"
  | "analyzing"
  | "generating"
  | "completed"
  | "error"
  | "stopped";

export type ChatContextStats = {
  estimatedTokens: number;
  messages: number;
  attachments: number;
  limit: number;
  compacted: boolean;
};

export type RequestState = {
  status: ChatRequestStatus;
  requestId: string | null;
  assistantId: string | null;
};

export type RequestAction =
  | { type: "start"; requestId: string; assistantId: string }
  | { type: "connected" }
  | { type: "delta" }
  | { type: "completed" }
  | { type: "error" }
  | { type: "stopped" }
  | { type: "reset" };

export type ActiveConversation = {
  prompt: string;
  model: string;
  assistantId: string;
  requestId: string;
  sessionId: string;
  context?: WorkspaceSubmitContext;
};

export type WorkspaceSubmitContext = { mode?: WorkspaceMode; artifactId?: string; expectedArtifactContent?: string; attachments?: ChatInputSubmitAttachment[] };

export type RunConfiguration = {
  historyOverride?: ChatMessage[];
  reuseAssistantId?: string;
  previousVersions?: ArchivedMessageVersion[];
};
