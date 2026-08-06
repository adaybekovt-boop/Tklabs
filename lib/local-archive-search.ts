"use client";

import { loadArchive } from "@/lib/local-archive";

/**
 * Builds a small ephemeral index for the read-only search_local_archive tool.
 * The full archive never leaves localStorage and this snapshot is sent only
 * with the current AI request.
 */
export function buildLocalArchiveSearchIndex() {
  return loadArchive().slice(0, 20).map((session) => {
    const excerpt = session.messages
      .slice(-4)
      .map((message) => message.content.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join(" ")
      .slice(0, 600);
    return {
      id: session.id,
      title: session.title,
      ...(session.project ? { project: session.project } : {}),
      updatedAt: session.updatedAt,
      excerpt,
    };
  });
}
