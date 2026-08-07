"use client";

/* eslint-disable react-hooks/set-state-in-effect -- the localStorage summary is client-only state hydrated after mount. */

import { AlertTriangle, CheckCircle2, DatabaseBackup, Download, FileArchive, HardDrive, RefreshCw, ShieldCheck, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { Locale } from "@/lib/i18n";
import { CURRENT_RELEASE_VERSION } from "@/lib/release-version";
import {
  WORKSPACE_VAULT_MAX_BYTES,
  applyWorkspaceVault,
  collectWorkspaceVaultEntries,
  createWorkspaceVault,
  parseWorkspaceVault,
  summarizeWorkspaceVault,
  workspaceVaultFilename,
  type WorkspaceVaultBundle,
  type WorkspaceVaultImportMode,
  type WorkspaceVaultSummary,
} from "@/lib/workspace-vault";

function formatBytes(bytes: number, locale: Locale) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", { maximumFractionDigits: 1 }).format(bytes / 1024)} KB`;
  return `${new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", { maximumFractionDigits: 2 }).format(bytes / (1024 * 1024))} MB`;
}

const emptySummary: WorkspaceVaultSummary = { conversations: 0, drafts: 0, artifacts: 0, flowRuns: 0, settings: 0, bytes: 0 };

export function WorkspaceVault({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [summary, setSummary] = useState<WorkspaceVaultSummary>(emptySummary);
  const [pendingBundle, setPendingBundle] = useState<WorkspaceVaultBundle | null>(null);
  const [pendingSummary, setPendingSummary] = useState<WorkspaceVaultSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [armedMode, setArmedMode] = useState<WorkspaceVaultImportMode | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error" | "neutral"; text: string } | null>(null);

  const labels = ru
    ? {
        title: "Workspace Vault",
        description: "Локальная резервная копия диалогов, черновиков, артефактов, Flow runs и настроек. Файл создаётся и проверяется прямо в браузере.",
        current: "Текущие локальные данные",
        conversations: "Диалоги",
        drafts: "Черновики",
        artifacts: "Артефакты",
        runs: "Flow runs",
        settings: "Настройки",
        size: "Размер",
        export: "Скачать резервную копию",
        exporting: "Подготовка файла…",
        import: "Выбрать Workspace Vault",
        selected: "Файл проверен",
        merge: "Объединить данные",
        replace: "Заменить локальные данные",
        confirmMerge: "Нажмите ещё раз для объединения",
        confirmReplace: "Нажмите ещё раз для полной замены",
        mergeHelp: "Существующие ключи сохраняются, ключи из файла обновляются.",
        replaceHelp: "Все поддерживаемые локальные данные сначала удаляются, затем восстанавливаются из файла.",
        integrity: "SHA-256 подтверждён",
        private: "Ничего не отправляется на сервер",
        privateHelp: "Экспорт, проверка и импорт выполняются локально. Файл может содержать полный текст ваших диалогов и материалов — храните его как приватный документ.",
        imported: "Workspace Vault восстановлен. Страница будет перезагружена.",
        exported: "Workspace Vault создан и скачан.",
        invalidFile: "Не удалось проверить файл Workspace Vault.",
        fileTooLarge: "Файл превышает допустимый размер 5 MB.",
        refresh: "Обновить сводку",
        clearSelection: "Убрать выбранный файл",
      }
    : {
        title: "Workspace Vault",
        description: "A local backup of conversations, drafts, artifacts, Flow runs, and settings. The file is created and verified entirely in your browser.",
        current: "Current local data",
        conversations: "Conversations",
        drafts: "Drafts",
        artifacts: "Artifacts",
        runs: "Flow runs",
        settings: "Settings",
        size: "Size",
        export: "Download backup",
        exporting: "Preparing file…",
        import: "Choose Workspace Vault",
        selected: "File verified",
        merge: "Merge data",
        replace: "Replace local data",
        confirmMerge: "Press again to confirm merge",
        confirmReplace: "Press again to confirm full replacement",
        mergeHelp: "Existing keys remain and keys from the file are updated.",
        replaceHelp: "All supported local workspace data is removed before the file is restored.",
        integrity: "SHA-256 verified",
        private: "Nothing is uploaded",
        privateHelp: "Export, verification, and import run locally. The file may contain the full text of your conversations and materials, so store it as a private document.",
        imported: "Workspace Vault restored. The page will reload.",
        exported: "Workspace Vault created and downloaded.",
        invalidFile: "The Workspace Vault file could not be verified.",
        fileTooLarge: "The file exceeds the 5 MB limit.",
        refresh: "Refresh summary",
        clearSelection: "Clear selected file",
      };

  function refreshSummary() {
    setSummary(summarizeWorkspaceVault(collectWorkspaceVaultEntries()));
  }

  useEffect(() => {
    refreshSummary();
  }, []);

  async function exportVault() {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const bundle = await createWorkspaceVault(CURRENT_RELEASE_VERSION);
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = workspaceVaultFilename(new Date(bundle.exportedAt));
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      setNotice({ tone: "success", text: labels.exported });
      refreshSummary();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : labels.invalidFile });
    } finally {
      setBusy(false);
    }
  }

  async function selectVault(file: File | undefined) {
    setArmedMode(null);
    setNotice(null);
    setPendingBundle(null);
    setPendingSummary(null);
    if (!file) return;
    if (file.size > WORKSPACE_VAULT_MAX_BYTES) {
      setNotice({ tone: "error", text: labels.fileTooLarge });
      return;
    }
    setBusy(true);
    try {
      const bundle = await parseWorkspaceVault(await file.text());
      setPendingBundle(bundle);
      setPendingSummary(summarizeWorkspaceVault(bundle.entries));
      setNotice({ tone: "success", text: labels.selected });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : labels.invalidFile });
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function clearSelection() {
    setPendingBundle(null);
    setPendingSummary(null);
    setArmedMode(null);
    setNotice(null);
  }

  function importVault(mode: WorkspaceVaultImportMode) {
    if (!pendingBundle || busy) return;
    if (armedMode !== mode) {
      setArmedMode(mode);
      return;
    }
    setBusy(true);
    try {
      applyWorkspaceVault(pendingBundle, mode);
      setNotice({ tone: "success", text: labels.imported });
      setArmedMode(null);
      refreshSummary();
      window.setTimeout(() => window.location.reload(), 650);
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : labels.invalidFile });
      setBusy(false);
    }
  }

  const cards = [
    [labels.conversations, summary.conversations],
    [labels.drafts, summary.drafts],
    [labels.artifacts, summary.artifacts],
    [labels.runs, summary.flowRuns],
    [labels.settings, summary.settings],
    [labels.size, formatBytes(summary.bytes, locale)],
  ];

  return (
    <section data-workspace-vault className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <article className="rounded-[1.75rem] border border-outline-variant bg-surface-container-lowest p-5 shadow-sm sm:p-7">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-on-primary"><DatabaseBackup size={22} /></span>
            <div className="min-w-0">
              <p className="label-caps text-on-secondary-container">TK LAB · LOCAL DATA</p>
              <h2 className="mt-2 font-serif text-[30px] leading-tight text-primary">{labels.title}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-on-surface-variant">{labels.description}</p>
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => void exportVault()} disabled={busy} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-medium text-on-primary disabled:opacity-50">
              {busy ? <RefreshCw size={17} className="animate-spin" /> : <Download size={17} />}{busy ? labels.exporting : labels.export}
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={busy} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-outline-variant bg-surface px-5 text-sm font-medium text-primary hover:border-primary disabled:opacity-50">
              <Upload size={17} />{labels.import}
            </button>
            <input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={(event) => void selectVault(event.target.files?.[0])} />
          </div>

          {notice && (
            <div role="status" className={`mt-4 flex items-start gap-2 rounded-2xl px-4 py-3 text-sm ${notice.tone === "error" ? "bg-error-container text-error" : notice.tone === "success" ? "bg-primary/8 text-primary" : "bg-surface-container-low text-on-surface-variant"}`}>
              {notice.tone === "error" ? <AlertTriangle size={17} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={17} className="mt-0.5 shrink-0" />}
              <span>{notice.text}</span>
            </div>
          )}
        </article>

        <aside className="rounded-[1.75rem] border border-outline-variant bg-surface p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div><p className="label-caps text-on-secondary-container">{labels.current}</p><p className="mt-2 text-sm text-primary">{CURRENT_RELEASE_VERSION}</p></div>
            <button type="button" onClick={refreshSummary} className="grid size-11 place-items-center rounded-full border border-outline-variant text-primary hover:bg-surface-container-low" aria-label={labels.refresh}><RefreshCw size={16} /></button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {cards.map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl bg-surface-container-low px-3 py-3">
                <p className="text-[10px] uppercase tracking-[0.08em] text-on-secondary-container">{label}</p>
                <p className="mt-2 text-lg font-medium text-primary">{value}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {pendingBundle && pendingSummary && (
        <article className="rounded-[1.75rem] border border-primary/30 bg-primary/5 p-5 sm:p-7" data-workspace-vault-import>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-on-primary"><FileArchive size={20} /></span>
              <div className="min-w-0">
                <p className="label-caps text-on-secondary-container">{labels.selected}</p>
                <h3 className="mt-2 text-xl font-medium text-primary">{pendingBundle.appVersion} · {new Date(pendingBundle.exportedAt).toLocaleString(locale === "ru" ? "ru-RU" : "en-US")}</h3>
                <p className="mt-2 flex items-center gap-2 text-xs text-on-secondary-container"><ShieldCheck size={14} />{labels.integrity} · <code className="truncate">{pendingBundle.digest.slice(0, 20)}…</code></p>
              </div>
            </div>
            <button type="button" onClick={clearSelection} className="min-h-10 rounded-full border border-outline-variant px-4 text-xs text-primary hover:bg-surface-container-low">{labels.clearSelection}</button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {[
              [labels.conversations, pendingSummary.conversations],
              [labels.drafts, pendingSummary.drafts],
              [labels.artifacts, pendingSummary.artifacts],
              [labels.runs, pendingSummary.flowRuns],
              [labels.settings, pendingSummary.settings],
              [labels.size, formatBytes(pendingSummary.bytes, locale)],
            ].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-surface-container-lowest px-3 py-3"><p className="text-[10px] uppercase tracking-[0.08em] text-on-secondary-container">{label}</p><p className="mt-2 text-base font-medium text-primary">{value}</p></div>)}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
              <p className="text-sm font-medium text-primary">{labels.merge}</p>
              <p className="mt-2 text-xs leading-5 text-on-surface-variant">{labels.mergeHelp}</p>
              <button type="button" onClick={() => importVault("merge")} disabled={busy} className="mt-4 min-h-11 w-full rounded-xl bg-primary px-4 text-sm font-medium text-on-primary disabled:opacity-50">{armedMode === "merge" ? labels.confirmMerge : labels.merge}</button>
            </div>
            <div className="rounded-2xl border border-error/30 bg-surface-container-lowest p-4">
              <p className="text-sm font-medium text-error">{labels.replace}</p>
              <p className="mt-2 text-xs leading-5 text-on-surface-variant">{labels.replaceHelp}</p>
              <button type="button" onClick={() => importVault("replace")} disabled={busy} className="mt-4 min-h-11 w-full rounded-xl border border-error/40 px-4 text-sm font-medium text-error hover:bg-error-container disabled:opacity-50">{armedMode === "replace" ? labels.confirmReplace : labels.replace}</button>
            </div>
          </div>
        </article>
      )}

      <article className="flex items-start gap-4 rounded-[1.5rem] border border-outline-variant bg-surface p-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-surface-container-low text-primary"><HardDrive size={19} /></span>
        <div><h3 className="text-sm font-semibold text-primary">{labels.private}</h3><p className="mt-2 max-w-4xl text-xs leading-5 text-on-surface-variant">{labels.privateHelp}</p></div>
      </article>
    </section>
  );
}
