"use client";

import { useSyncExternalStore } from "react";
import { loadWorkspaceRuns, subscribeWorkspaceRuns } from "@/lib/workspace/store";

const empty: ReturnType<typeof loadWorkspaceRuns> = [];
export function useWorkspaceRuns() { return useSyncExternalStore(subscribeWorkspaceRuns, loadWorkspaceRuns, () => empty); }
