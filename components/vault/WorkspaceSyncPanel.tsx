"use client";

import { CloudDownload, CloudUpload, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import type { Locale } from "@/lib/i18n";
import { applyWorkspaceSnapshot, collectWorkspaceSnapshot, fetchRemoteWorkspaceSnapshot, type RemoteWorkspaceSnapshot, uploadWorkspaceSnapshot } from "@/lib/workspace-sync-client";

export function WorkspaceSyncPanel({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const [available, setAvailable] = useState<boolean | null>(null);
  const [remote, setRemote] = useState<RemoteWorkspaceSnapshot | null>(null);
  const [staged, setStaged] = useState<RemoteWorkspaceSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);
  const [notice, setNotice] = useState("");

  async function refresh() {
    setBusy(true);
    setNotice("");
    setArmed(false);
    try {
      const result = await fetchRemoteWorkspaceSnapshot();
      setAvailable(result.available);
      setRemote(result.snapshot);
      setStaged(null);
    } catch {
      setNotice(ru ? "Не удалось проверить sync." : "Unable to check sync.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void fetchRemoteWorkspaceSnapshot()
      .then((result) => {
        if (cancelled) return;
        setAvailable(result.available);
        setRemote(result.snapshot);
        setStaged(null);
      })
      .catch(() => {
        if (!cancelled) setNotice(ru ? "Не удалось проверить sync." : "Unable to check sync.");
      });
    return () => { cancelled = true; };
  }, [ru]);

  async function upload() {
    setBusy(true);
    setNotice("");
    setArmed(false);
    try {
      const payload = collectWorkspaceSnapshot();
      const result = await uploadWorkspaceSnapshot(payload, remote?.revision ?? 0);
      setAvailable(result.available);
      if (!result.available || !result.snapshot) {
        setNotice(ru ? "Sync не настроен на сервере." : "Sync is not configured on the server.");
        return;
      }
      setRemote({ ...result.snapshot, payload });
      setNotice(ru ? "Зашифрованный snapshot обновлён." : "Encrypted snapshot updated.");
    } catch (error) {
      setNotice(error instanceof Error && error.message === "workspace_sync_conflict"
        ? (ru ? "Snapshot изменился на другом устройстве. Обновите состояние." : "The snapshot changed on another device. Refresh first.")
        : (ru ? "Не удалось загрузить snapshot." : "Unable to upload snapshot."));
    } finally {
      setBusy(false);
    }
  }

  async function stageDownload() {
    setBusy(true);
    setNotice("");
    setArmed(false);
    try {
      const result = await fetchRemoteWorkspaceSnapshot();
      setAvailable(result.available);
      setRemote(result.snapshot);
      setStaged(result.snapshot);
      if (!result.snapshot) setNotice(ru ? "Облачного snapshot пока нет." : "There is no remote snapshot yet.");
    } catch {
      setNotice(ru ? "Не удалось получить snapshot." : "Unable to download snapshot.");
    } finally {
      setBusy(false);
    }
  }

  function apply() {
    if (!staged) return;
    if (!armed) {
      setArmed(true);
      setNotice(ru ? "Повторное нажатие применит snapshot к этому устройству." : "Press again to apply the snapshot to this device.");
      return;
    }
    try {
      const count = applyWorkspaceSnapshot(staged.payload);
      setNotice(ru ? `Восстановлено записей: ${count}. Перезагружаю интерфейс…` : `Restored ${count} entries. Reloading the interface…`);
      window.setTimeout(() => window.location.reload(), 250);
    } catch {
      setNotice(ru ? "Snapshot не прошёл локальную проверку." : "The snapshot failed local validation.");
      setArmed(false);
    }
  }

  return (
    <section className="mt-8 rounded-3xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-7" data-workspace-sync-panel aria-labelledby="workspace-sync-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-primary"><ShieldCheck size={18} /><p className="label-caps">{ru ? "ОПЦИОНАЛЬНЫЙ SYNC" : "OPTIONAL SYNC"}</p></div>
          <h2 id="workspace-sync-title" className="mt-3 font-serif text-2xl text-primary">{ru ? "Зашифрованный snapshot между устройствами" : "Encrypted snapshot across devices"}</h2>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">{ru ? "Local-first остаётся стандартом. Синхронизация запускается только вручную: сервер хранит AES-GCM ciphertext, revision и checksum. Vault-экспорт остаётся отдельной резервной копией." : "Local-first remains the default. Sync runs only when you ask for it: the server stores AES-GCM ciphertext, revision, and checksum. Vault export remains a separate backup path."}</p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={busy} className="grid size-11 shrink-0 place-items-center rounded-full border border-outline-variant text-primary disabled:opacity-40" aria-label={ru ? "Обновить состояние sync" : "Refresh sync state"}><RefreshCw size={16} className={busy ? "animate-spin" : ""} /></button>
      </div>

      <div className="mt-5 rounded-2xl bg-surface-container-low p-4 text-xs leading-5 text-on-surface-variant">
        {available === false ? (ru ? "Sync сейчас недоступен: WORKSPACE_SYNC_SECRET или хранилище не настроены. Локальные данные не изменены." : "Sync is currently unavailable: WORKSPACE_SYNC_SECRET or storage is not configured. Local data is unchanged.") : remote ? `${ru ? "Последний snapshot" : "Latest snapshot"}: ${new Date(remote.updatedAt).toLocaleString()} · rev ${remote.revision}` : (ru ? "Удалённого snapshot пока нет." : "No remote snapshot yet.")}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <button type="button" onClick={() => void upload()} disabled={busy || available === false} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-on-primary disabled:opacity-40"><CloudUpload size={16} />{ru ? "Загрузить это устройство" : "Upload this device"}</button>
        <button type="button" onClick={() => void stageDownload()} disabled={busy || available === false} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 text-sm font-medium text-primary disabled:opacity-40"><CloudDownload size={16} />{ru ? "Получить snapshot" : "Fetch snapshot"}</button>
        <button type="button" onClick={apply} disabled={!staged || busy} className="min-h-11 rounded-xl border border-outline-variant px-4 text-sm font-medium text-primary disabled:opacity-35">{armed ? (ru ? "Подтвердить восстановление" : "Confirm restore") : (ru ? "Применить к устройству" : "Apply to device")}</button>
      </div>
      <p className="mt-3 min-h-5 text-xs text-on-surface-variant" role="status" aria-live="polite">{notice}</p>
    </section>
  );
}
