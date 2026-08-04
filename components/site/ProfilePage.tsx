"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, KeyRound, Search, ShieldCheck, Sparkles } from "lucide-react";

import { SignOutButton } from "@/components/auth/SignOutButton";
import type { ClodexAccessStatus } from "@/lib/clodex-access";
import { CLODEX_MODELS } from "@/lib/clodex-models";

import styles from "./ProfilePage.module.css";

export type ProfileAccount = {
  name: string;
  email: string;
  image: string | null;
};

type AccessPayload = ClodexAccessStatus & { error?: string };

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "II";
}

function resetLabel(resetAt: number | null) {
  if (!resetAt) return "полный лимит доступен";
  const minutes = Math.max(1, Math.ceil((resetAt - Date.now()) / 60_000));
  return `сброс через ${minutes} мин.`;
}

export function ProfilePage({ account }: { account: ProfileAccount }) {
  const [access, setAccess] = useState<ClodexAccessStatus | null>(null);
  const [code, setCode] = useState("");
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRedeeming, setIsRedeeming] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/profile/access", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as AccessPayload | null;
        if (!cancelled && response.ok && payload) setAccess(payload);
        if (!cancelled && !response.ok) setFeedback(payload?.error ?? "Не удалось проверить доступ.");
      } catch {
        if (!cancelled) setFeedback("Не удалось проверить доступ.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function redeem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code.trim() || isRedeeming) return;

    setIsRedeeming(true);
    setFeedback("");
    try {
      const response = await fetch("/api/profile/access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const payload = (await response.json().catch(() => null)) as AccessPayload | null;
      if (!response.ok || !payload) {
        setFeedback(payload?.error ?? "Не удалось активировать доступ.");
        return;
      }
      setAccess(payload);
      setCode("");
      setFeedback("Доступ активирован для этого Google-аккаунта.");
    } catch {
      setFeedback("Не удалось активировать доступ.");
    } finally {
      setIsRedeeming(false);
    }
  }

  const models = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? CLODEX_MODELS.filter((model) => model.id.toLowerCase().includes(query)) : CLODEX_MODELS;
  }, [search]);

  const accessActive = access?.active === true;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.back} href="/ai-chats"><ArrowLeft size={15} aria-hidden="true" /> К чатам</Link>
        <div className={styles.headerActions}>
          <Link className={styles.chatLink} href="/ai-chats">AI Chats</Link>
          <SignOutButton label="Выйти" />
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.avatar} aria-hidden="true">
          {account.image ? <Image src={account.image} alt="" width={64} height={64} unoptimized referrerPolicy="no-referrer" /> : initials(account.name)}
        </div>
        <div>
          <span className={styles.eyebrow}>АККАУНТ / GOOGLE</span>
          <h1>{account.name}</h1>
          <p>{account.email}</p>
        </div>
      </section>

      <section className={styles.accessCard} aria-labelledby="model-access-title">
        <div className={styles.cardHeading}>
          <span className={styles.cardIcon}><KeyRound size={18} aria-hidden="true" /></span>
          <div>
            <span className={styles.eyebrow}>ДОСТУП</span>
            <h2 id="model-access-title">Модели Clodex</h2>
          </div>
          {accessActive && <span className={styles.activeBadge}><ShieldCheck size={13} /> активно</span>}
        </div>

        {isLoading ? <p className={styles.muted}>Проверяем доступ…</p> : accessActive ? (
          access?.unlimited ? (
            <div className={styles.limitRow}>
              <div><strong>∞</strong><span>безлимитный доступ</span></div>
              <p>Привилегированный Google-аккаунт: лимит запросов и кодогенерация разрешены.</p>
            </div>
          ) : (
            <div className={styles.limitRow}>
              <div><strong>{access?.remaining} / {access?.limit}</strong><span>запросов доступно</span></div>
              <p>Лимит: {access?.limit} запросов за 15 минут; {resetLabel(access?.resetAt ?? null)}</p>
            </div>
          )
        ) : (
          <>
            <p className={styles.muted}>Введите выданный код доступа. Он проверяется на сервере и привязывается только к этому Google-аккаунту.</p>
            <form className={styles.redeemForm} onSubmit={redeem}>
              <label htmlFor="access-code">Код доступа</label>
              <div>
                <input
                  id="access-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="Введите код"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={isRedeeming}
                />
                <button type="submit" disabled={isRedeeming || !code.trim()}>{isRedeeming ? "Проверяем…" : "Активировать"}</button>
              </div>
            </form>
          </>
        )}
        {feedback && <p className={feedback.includes("активирован") ? styles.success : styles.feedback} role="status">{feedback}</p>}
      </section>

      {accessActive && (
        <section className={styles.catalog} aria-labelledby="catalog-title">
          <div className={styles.catalogHeading}>
            <div><span className={styles.eyebrow}>КАТАЛОГ</span><h2 id="catalog-title">Доступные модели</h2></div>
            <label className={styles.search}><Search size={15} aria-hidden="true" /><span className="sr-only">Поиск моделей</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по моделям" /></label>
          </div>
          <p className={styles.catalogNote}><Sparkles size={14} /> Модели будут доступны в селекторе AI Chats. {access?.unlimited ? "Для этого аккаунта лимит не применяется." : "Лимит применяется сервером к каждому запросу."}</p>
          <div className={styles.modelGrid}>
            {models.map((model) => <article className={styles.model} key={model.key}><span>Clodex</span><strong>{model.id}</strong></article>)}
          </div>
          {!models.length && <p className={styles.muted}>Совпадений нет.</p>}
        </section>
      )}
    </main>
  );
}
