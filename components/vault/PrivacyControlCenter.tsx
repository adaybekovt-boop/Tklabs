"use client";

import { useState } from "react";

import type { Locale } from "@/lib/i18n";
import { clearLocalWorkspace, collectWorkspaceSnapshot, deleteRemoteWorkspaceSnapshot } from "@/lib/workspace-sync-client";

function downloadJson(name: string, text: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  URL.revokeObjectURL(url);
}

export function PrivacyControlCenter({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const [status, setStatus] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);

  async function exportLocal() {
    try { downloadJson("tk-lab-local-workspace.json", collectWorkspaceSnapshot()); setStatus(ru ? "Локальный экспорт создан." : "Local export created."); }
    catch { setStatus(ru ? "Не удалось экспортировать локальные данные." : "Local export failed."); }
  }

  async function exportServer() {
    setBusy(true); setStatus(null);
    try { const response = await fetch("/api/account/privacy", { cache: "no-store" }); if (!response.ok) throw new Error(); downloadJson("tk-lab-server-data.json", JSON.stringify(await response.json(), null, 2)); setStatus(ru ? "Серверный экспорт создан." : "Server export created."); }
    catch { setStatus(ru ? "Серверный экспорт недоступен." : "Server export is unavailable."); } finally { setBusy(false); }
  }

  async function eraseSync() {
    setBusy(true); setStatus(null);
    try { const result = await deleteRemoteWorkspaceSnapshot(); setStatus(result.available ? (ru ? "Server Workspace Sync удалён." : "Server Workspace Sync deleted.") : (ru ? "Sync сейчас недоступен." : "Sync is currently unavailable.")); }
    catch { setStatus(ru ? "Не удалось удалить Sync." : "Could not delete Sync."); } finally { setBusy(false); }
  }

  function eraseLocal() {
    const count = clearLocalWorkspace(); setStatus(ru ? `Удалено локальных записей: ${count}.` : `Removed ${count} local records.`);
  }

  async function eraseAccount() {
    if (confirmation !== "DELETE MY TK LAB DATA") return;
    setBusy(true); setStatus(null);
    try {
      const response = await fetch("/api/account/privacy", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirmation }) });
      if (!response.ok) throw new Error();
      clearLocalWorkspace(); window.location.assign("/api/auth/signout");
    } catch { setStatus(ru ? "Удаление аккаунта не завершено. Данные не считаются удалёнными." : "Account deletion did not complete. Data is not considered deleted."); setBusy(false); }
  }

  return (
    <section className="mt-8 border border-outline-variant/40 p-5 sm:p-7" aria-labelledby="privacy-control-center-title">
      <p className="label-caps text-secondary">TK LAB · PRIVACY CONTROL CENTER</p>
      <h2 id="privacy-control-center-title" className="headline-title mt-3">{ru ? "Экспорт и удаление данных" : "Export and erase data"}</h2>
      <p className="mt-4 max-w-3xl text-sm leading-6 text-on-surface-variant">{ru ? "Локальные данные браузера и server-held данные управляются отдельно. Удаление Google-аккаунта или данных внешнего model provider не выполняется этой страницей." : "Browser-local and server-held data are controlled separately. This page does not delete the underlying Google account or data controlled by an external model provider."}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><button className="quiet-button" type="button" onClick={() => void exportLocal()}>{ru ? "Экспорт local" : "Export local"}</button><button className="quiet-button" type="button" disabled={busy} onClick={() => void exportServer()}>{ru ? "Экспорт server" : "Export server"}</button><button className="quiet-button" type="button" disabled={busy} onClick={() => void eraseSync()}>{ru ? "Удалить Sync" : "Delete Sync"}</button><button className="quiet-button" type="button" onClick={eraseLocal}>{ru ? "Очистить local" : "Clear local"}</button></div>
      <div className="mt-8 border-t border-outline-variant/40 pt-6"><p className="font-medium">{ru ? "Закрытие TK LAB account data" : "Close TK LAB account data"}</p><p className="mt-2 text-sm leading-6 text-on-surface-variant">{ru ? "Удаляет D1 account record, Workspace Sync и application legal ledger после явного подтверждения. Бounded anti-abuse state может сохраняться до истечения своего security window; доступ отзывается." : "Deletes the D1 account record, Workspace Sync, and application legal ledger after explicit confirmation. Bounded anti-abuse state can remain until its security window expires; access is revoked."}</p><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-4 w-full border border-outline-variant bg-surface px-3 py-2 text-sm" placeholder="DELETE MY TK LAB DATA" aria-label="Deletion confirmation" /><button className="quiet-button mt-3" type="button" disabled={busy || confirmation !== "DELETE MY TK LAB DATA"} onClick={() => void eraseAccount()}>{ru ? "Удалить account data" : "Delete account data"}</button></div>
      {status && <p className="mt-5 text-sm" aria-live="polite">{status}</p>}
    </section>
  );
}
