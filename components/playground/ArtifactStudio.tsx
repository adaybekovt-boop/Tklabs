"use client";

import { useEffect, useState } from "react";
import { MarkdownMessage } from "./MarkdownMessage";
import { ARTIFACTS_UPDATED_EVENT, artifactFileExtension, createArtifact, duplicateArtifact, loadArtifacts, removeArtifact, restoreArtifactVersion, snapshotArtifact, updateArtifact, upsertArtifact } from "@/lib/artifacts/local-store";
import type { WorkspaceArtifact } from "@/lib/artifacts/types";
import type { Locale } from "@/lib/i18n";
import { requestWorkspaceRun } from "@/lib/workspace-events";

function download(artifact: WorkspaceArtifact) {
  const href = URL.createObjectURL(new Blob([artifact.content], { type: "text/plain;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = `${artifact.title.replace(/[^\p{L}\p{N}_-]+/gu, "-").slice(0, 108) || "artifact"}.${artifactFileExtension(artifact.kind)}`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(href), 0);
}

export function ArtifactStudio({ locale, artifactId, onRequestRevision, isRevising }: { locale: Locale; artifactId?: string; onRequestRevision?: (artifact: WorkspaceArtifact, instruction: string) => boolean; isRevising?: boolean }) {
  const ru = locale === "ru";
  const [artifacts, setArtifacts] = useState<WorkspaceArtifact[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [revision, setRevision] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    const refresh = () => setArtifacts(loadArtifacts().sort((a, b) => b.updatedAt - a.updatedAt));
    refresh();
    window.addEventListener(ARTIFACTS_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("tklabs:workspace-data-replaced", refresh);
    return () => { window.removeEventListener(ARTIFACTS_UPDATED_EVENT, refresh); window.removeEventListener("storage", refresh); window.removeEventListener("tklabs:workspace-data-replaced", refresh); };
  }, []);
  const selected = artifacts.find((entry) => entry.id === (artifactId || selectedId)) ?? artifacts[0] ?? null;
  function select(id: string) { setSelectedId(id); setEditing(false); setConfirmDelete(false); setNotice(""); }
  function saveCurrent() {
    const current = loadArtifacts().find((entry) => entry.id === selected?.id);
    if (!current) return;
    if (!upsertArtifact(updateArtifact(current, { content: draft }))) { setNotice(ru ? "Не удалось сохранить файл." : "Could not save the file."); return; }
    setEditing(false); setNotice(ru ? "Сохранено" : "Saved");
  }
  return <section className="workspace-artifacts" data-artifact-studio>
    <header><div><h3>{ru ? "Файлы" : "Files"}</h3><p>{ru ? "Материалы и сохранённые версии" : "Documents and saved versions"}</p></div><div><button type="button" aria-label={ru ? "Новый файл" : "New file"} onClick={() => { const file = createArtifact("document", ru ? "Новый файл" : "New file"); if (upsertArtifact(file)) select(file.id); }}>＋</button><button type="button" aria-label={ru ? "Скачать" : "Download"} disabled={!selected} onClick={() => selected && download(selected)}>↓</button></div></header>
    {artifacts.length ? <select value={selected?.id ?? ""} aria-label={ru ? "Выбрать файл" : "Select file"} onChange={(event) => select(event.target.value)}>{artifacts.map((file) => <option key={file.id} value={file.id}>{file.title}</option>)}</select> : <p>{ru ? "Здесь появится результат задачи. Можно создать файл вручную." : "Task results appear here. You can also create a file manually."}</p>}
    {selected && <>
      <label>{ru ? "Название" : "Title"}<input key={selected.id} defaultValue={selected.title} maxLength={120} onBlur={(event) => { const current = loadArtifacts().find((entry) => entry.id === selected.id); if (current && current.title !== event.target.value.trim()) upsertArtifact(updateArtifact(current, { title: event.target.value })); }} /></label>
      <div className="workspace-artifact-actions"><button type="button" aria-pressed={!editing} onClick={() => setEditing(false)}>{ru ? "Просмотр" : "Preview"}</button><button type="button" aria-pressed={editing} onClick={() => { setDraft(selected.content); setEditing(true); }}>{ru ? "Правка" : "Edit"}</button><span>{selected.kind}</span></div>
      {selected.sourceRunId && <button className="workspace-source-link" type="button" onClick={() => requestWorkspaceRun(selected.sourceRunId!)}>{ru ? "Открыть исходную задачу" : "Open source task"}</button>}
      {editing ? <div><textarea aria-label={ru ? "Содержимое файла" : "File content"} value={draft} maxLength={200000} onChange={(event) => setDraft(event.target.value)} rows={13} /><button type="button" onClick={saveCurrent}>{ru ? "Сохранить" : "Save"}</button></div> : <div className="workspace-artifact-preview" data-artifact-preview><MarkdownMessage content={selected.content || (ru ? "Пустой файл" : "Empty file")} /></div>}
      {onRequestRevision && <div className="workspace-revision"><label>{ru ? "Что изменить?" : "What should change?"}<textarea value={revision} onChange={(event) => setRevision(event.target.value)} rows={3} maxLength={2000} placeholder={ru ? "Добавь примеры…" : "Add examples…"} /></label><button type="button" disabled={!revision.trim() || isRevising} onClick={() => { if (onRequestRevision(selected, revision.trim())) setRevision(""); else setNotice(ru ? "Не удалось начать правку. Проверьте размер файла." : "Revision could not start. Check file size."); }}>{ru ? "Исправить через Erma" : "Revise with Erma"}</button></div>}
      <details><summary>{ru ? "Версии" : "Versions"} ({selected.versions.length})</summary><button type="button" onClick={() => upsertArtifact(snapshotArtifact(selected, ru ? "Сохранённая версия" : "Saved version"))}>{ru ? "Сохранить версию" : "Save version"}</button>{selected.versions.map((version) => <div key={version.id}>{new Date(version.createdAt).toLocaleString(ru ? "ru-RU" : "en-US")} <button type="button" onClick={() => upsertArtifact(restoreArtifactVersion(loadArtifacts().find((entry) => entry.id === selected.id) ?? selected, version.id))}>{ru ? "Восстановить" : "Restore"}</button></div>)}</details>
      <div className="workspace-artifact-actions"><button type="button" onClick={() => { const copy = duplicateArtifact(selected); delete copy.sourceRunId; if (upsertArtifact(copy)) select(copy.id); }}>{ru ? "Копия" : "Duplicate"}</button><button type="button" onClick={() => { if (!confirmDelete) { setConfirmDelete(true); return; } if (removeArtifact(selected.id)) { select(""); setConfirmDelete(false); } }}>{confirmDelete ? (ru ? "Подтвердить удаление" : "Confirm delete") : (ru ? "Удалить" : "Delete")}</button></div>
    </>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}
