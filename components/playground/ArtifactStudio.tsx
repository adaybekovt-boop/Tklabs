"use client";

/* eslint-disable react-hooks/set-state-in-effect -- browser-only workspace state hydrates from localStorage. */

import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Download, FilePlus2, History, RotateCcw, Save, Trash2 } from "lucide-react";

import {
  artifactFileExtension,
  createArtifact,
  duplicateArtifact,
  loadArtifacts,
  restoreArtifactVersion,
  saveArtifacts,
  snapshotArtifact,
} from "@/lib/artifacts/local-store";
import type { ArtifactKind, WorkspaceArtifact } from "@/lib/artifacts/types";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const KINDS: ArtifactKind[] = ["document", "plan", "table", "code", "json", "csv"];

function safeFilename(title: string) {
  return title.trim().toLowerCase().replace(/[^a-z0-9а-яё_-]+/gi, "-").replace(/^-+|-+$/g, "") || "erma-artifact";
}

function downloadArtifact(artifact: WorkspaceArtifact) {
  const blob = new Blob([artifact.content], { type: "text/plain;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = `${safeFilename(artifact.title)}.${artifactFileExtension(artifact.kind)}`;
  link.click();
  URL.revokeObjectURL(href);
}

export function ArtifactStudio({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const [artifacts, setArtifacts] = useState<WorkspaceArtifact[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [deletePending, setDeletePending] = useState(false);
  const [versionLabel, setVersionLabel] = useState("");
  const [status, setStatus] = useState("");
  const hydrated = useRef(false);

  useEffect(() => {
    const loaded = loadArtifacts().sort((a, b) => b.updatedAt - a.updatedAt);
    setArtifacts(loaded);
    setSelectedId(loaded[0]?.id ?? "");
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    saveArtifacts(artifacts);
  }, [artifacts]);

  const selected = useMemo(() => artifacts.find((artifact) => artifact.id === selectedId) ?? null, [artifacts, selectedId]);

  function replaceArtifact(next: WorkspaceArtifact) {
    setArtifacts((current) => current.map((artifact) => artifact.id === next.id ? next : artifact).sort((a, b) => b.updatedAt - a.updatedAt));
  }

  function createNew(kind: ArtifactKind = "document") {
    const artifact = createArtifact(kind, ru ? "Новый артефакт" : "New artifact");
    setArtifacts((current) => [artifact, ...current].slice(0, 24));
    setSelectedId(artifact.id);
    setDeletePending(false);
    setStatus(ru ? "Артефакт создан локально." : "Artifact created locally.");
  }

  function updateSelected(update: Partial<Pick<WorkspaceArtifact, "title" | "kind" | "content">>) {
    if (!selected) return;
    replaceArtifact({ ...selected, ...update, updatedAt: Date.now() });
    setStatus(ru ? "Сохранено на устройстве" : "Saved on this device");
  }

  function createVersion() {
    if (!selected) return;
    replaceArtifact(snapshotArtifact(selected, versionLabel || (ru ? "Сохранённая версия" : "Saved version")));
    setVersionLabel("");
    setStatus(ru ? "Версия сохранена." : "Version saved.");
  }

  function duplicateSelected() {
    if (!selected) return;
    const copy = duplicateArtifact(selected);
    setArtifacts((current) => [copy, ...current].slice(0, 24));
    setSelectedId(copy.id);
    setDeletePending(false);
    setStatus(ru ? "Создана копия." : "Copy created.");
  }

  function removeSelected() {
    if (!selected) return;
    if (!deletePending) {
      setDeletePending(true);
      setStatus(ru ? "Нажмите удалить ещё раз для подтверждения." : "Press delete again to confirm.");
      return;
    }
    const remaining = artifacts.filter((artifact) => artifact.id !== selected.id);
    setArtifacts(remaining);
    setSelectedId(remaining[0]?.id ?? "");
    setDeletePending(false);
    setStatus(ru ? "Артефакт удалён." : "Artifact deleted.");
  }

  function restoreVersion(versionId: string) {
    if (!selected) return;
    replaceArtifact(restoreArtifactVersion(selected, versionId));
    setStatus(ru ? "Версия восстановлена." : "Version restored.");
  }

  return (
    <section className="grid h-full min-h-0 grid-cols-1 overflow-hidden bg-surface lg:grid-cols-[260px_minmax(0,1fr)_280px]" data-artifact-studio>
      <aside className="hidden min-h-0 flex-col border-r border-outline-variant bg-surface-container-low/70 p-4 lg:flex">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <p className="label-caps text-secondary">Artifact Studio</p>
            <p className="mt-1 text-xs text-on-surface-variant">{ru ? "Локальные рабочие материалы" : "Local working materials"}</p>
          </div>
          <button type="button" onClick={() => createNew()} className="grid size-9 place-items-center rounded-full border border-outline-variant bg-surface hover:bg-surface-container" aria-label={ru ? "Создать артефакт" : "Create artifact"}>
            <FilePlus2 className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {artifacts.map((artifact) => (
            <button
              key={artifact.id}
              type="button"
              onClick={() => { setSelectedId(artifact.id); setDeletePending(false); }}
              className={cn("w-full rounded-2xl border px-3 py-3 text-left transition-colors", artifact.id === selectedId ? "border-primary bg-primary/10" : "border-outline-variant bg-surface hover:bg-surface-container-low")}
            >
              <span className="block truncate text-sm font-medium text-on-surface">{artifact.title}</span>
              <span className="mt-1 block text-[11px] uppercase tracking-[0.14em] text-secondary">{artifact.kind}</span>
            </button>
          ))}
          {!artifacts.length ? <p className="rounded-2xl border border-dashed border-outline-variant p-4 text-sm leading-6 text-on-surface-variant">{ru ? "Создайте первый документ, план, таблицу или кодовый черновик." : "Create your first document, plan, table, or code draft."}</p> : null}
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-col">
        <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-outline-variant px-4 sm:px-6">
          <div className="min-w-0">
            <p className="label-caps text-secondary">{ru ? "Редактор" : "Editor"}</p>
            <p className="mt-1 truncate text-xs text-on-surface-variant">{status || (ru ? "Данные остаются на этом устройстве" : "Data stays on this device")}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => createNew()} className="rounded-full border border-outline-variant px-3 py-2 text-xs font-medium lg:hidden">{ru ? "Новый" : "New"}</button>
            <button type="button" disabled={!selected} onClick={() => selected && downloadArtifact(selected)} className="grid size-9 place-items-center rounded-full border border-outline-variant disabled:opacity-40" aria-label={ru ? "Экспортировать" : "Export"}><Download className="size-4" /></button>
          </div>
        </header>

        {selected ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-secondary">{ru ? "Название" : "Title"}</span>
                <input value={selected.title} onChange={(event) => updateSelected({ title: event.target.value.slice(0, 120) })} className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm outline-none focus:border-primary" />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-secondary">{ru ? "Тип" : "Type"}</span>
                <select value={selected.kind} onChange={(event) => updateSelected({ kind: event.target.value as ArtifactKind })} className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm outline-none focus:border-primary">
                  {KINDS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
                </select>
              </label>
            </div>
            <textarea
              value={selected.content}
              onChange={(event) => updateSelected({ content: event.target.value.slice(0, 200_000) })}
              placeholder={ru ? "Пишите здесь или перенесите в артефакт результат из чата…" : "Write here or move a chat result into this artifact…"}
              className="min-h-[360px] flex-1 resize-y rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 font-mono text-[14px] leading-6 text-on-surface outline-none focus:border-primary sm:p-5"
            />
            <div className="flex flex-wrap items-center gap-2">
              <input aria-label={ru ? "Название версии" : "Version label"} value={versionLabel} onChange={(event) => setVersionLabel(event.target.value.slice(0, 80))} placeholder={ru ? "Название версии" : "Version label"} className="h-10 min-w-0 flex-1 rounded-full border border-outline-variant bg-surface-container-lowest px-4 text-sm outline-none focus:border-primary" />
              <button type="button" onClick={createVersion} className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-on-primary"><Save className="size-4" />{ru ? "Сохранить версию" : "Save version"}</button>
              <button type="button" onClick={duplicateSelected} className="inline-flex h-10 items-center gap-2 rounded-full border border-outline-variant px-4 text-sm"><Copy className="size-4" />{ru ? "Копия" : "Duplicate"}</button>
              <button type="button" onClick={removeSelected} className={cn("inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm", deletePending ? "border-error bg-error/10 text-error" : "border-outline-variant")}><Trash2 className="size-4" />{deletePending ? (ru ? "Подтвердить" : "Confirm") : (ru ? "Удалить" : "Delete")}</button>
            </div>
          </div>
        ) : (
          <div className="grid flex-1 place-items-center p-6 text-center">
            <div className="max-w-md">
              <FilePlus2 className="mx-auto size-9 text-secondary" />
              <h2 className="mt-4 font-serif text-3xl text-on-surface">{ru ? "Создайте первый артефакт" : "Create your first artifact"}</h2>
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">{ru ? "Артефакты отделяют итоговый материал от переписки и сохраняют его локально с версиями." : "Artifacts separate the final material from chat and keep local versions."}</p>
              <button type="button" onClick={() => createNew()} className="mt-6 rounded-full bg-primary px-5 py-3 text-sm font-medium text-on-primary">{ru ? "Создать документ" : "Create document"}</button>
            </div>
          </div>
        )}
      </div>

      <aside className="hidden min-h-0 flex-col border-l border-outline-variant bg-surface-container-low/50 p-4 lg:flex">
        <div className="mb-4 flex items-center gap-2"><History className="size-4 text-secondary" /><p className="label-caps text-secondary">{ru ? "Версии" : "Versions"}</p></div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {selected?.versions.slice().reverse().map((version) => (
            <article key={version.id} className="rounded-2xl border border-outline-variant bg-surface p-3">
              <p className="truncate text-sm font-medium">{version.label || (ru ? "Сохранённая версия" : "Saved version")}</p>
              <p className="mt-1 text-xs text-secondary">{new Date(version.createdAt).toLocaleString(ru ? "ru-RU" : "en-US")}</p>
              <button type="button" onClick={() => restoreVersion(version.id)} className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-primary"><RotateCcw className="size-3.5" />{ru ? "Восстановить" : "Restore"}</button>
            </article>
          ))}
          {selected && !selected.versions.length ? <p className="rounded-2xl border border-dashed border-outline-variant p-4 text-sm leading-6 text-on-surface-variant">{ru ? "Сохранённые версии появятся здесь." : "Saved versions will appear here."}</p> : null}
        </div>
      </aside>
    </section>
  );
}
