import type { RequestAction, RequestState } from "./contracts";

export const INITIAL_REQUEST_STATE: RequestState = {
  status: "idle",
  requestId: null,
  assistantId: null,
};

export function requestReducer(state: RequestState, action: RequestAction): RequestState {
  switch (action.type) {
    case "start":
      return { status: "connecting", requestId: action.requestId, assistantId: action.assistantId };
    case "connected":
      return { ...state, status: "analyzing" };
    case "delta":
      return { ...state, status: "generating" };
    case "completed":
      return { ...state, status: "completed", requestId: null, assistantId: null };
    case "error":
      return { ...state, status: "error", requestId: null, assistantId: null };
    case "stopped":
      return { ...state, status: "stopped", requestId: null, assistantId: null };
    case "reset":
      return INITIAL_REQUEST_STATE;
  }
}

export function isRequestPending(state: RequestState) {
  return state.status === "connecting" || state.status === "analyzing" || state.status === "generating";
}
