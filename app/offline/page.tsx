import Link from "next/link";
import { ArrowUpRight, WifiOff } from "lucide-react";

import { getLocale } from "@/lib/locale";

export const metadata = {
  title: "TK Lab — Offline",
  robots: { index: false, follow: false },
};

export default async function OfflinePage() {
  const locale = await getLocale();
  const text = locale === "ru"
    ? {
        eyebrow: "Режим без сети",
        title: "Подключение отсутствует",
        description: "Статические элементы приложения доступны из локального кэша. AI-запросы, авторизация и данные аккаунта требуют подключения к интернету.",
        retry: "Попробовать снова",
        updates: "Открыть сохранённые обновления",
        note: "Незавершённые черновики AI-чата остаются в этом браузере.",
      }
    : {
        eyebrow: "Offline mode",
        title: "No network connection",
        description: "Static application assets remain available from the local cache. AI requests, authentication, and account data require an internet connection.",
        retry: "Try again",
        updates: "Open cached updates",
        note: "Unfinished AI chat drafts remain in this browser.",
      };

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-surface px-5 py-10 text-primary">
      <section className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-outline-variant bg-surface-container-lowest p-6 shadow-[0_28px_90px_rgba(0,0,0,.12)] sm:p-10">
        <span className="grid size-12 place-items-center rounded-2xl bg-primary text-on-primary">
          <WifiOff size={20} aria-hidden="true" />
        </span>
        <p className="label-caps mt-7 text-secondary">{text.eyebrow}</p>
        <h1 className="mt-3 font-serif text-[40px] leading-[1.05] sm:text-[52px]">{text.title}</h1>
        <p className="mt-6 text-[16px] leading-[1.75] text-on-surface-variant">{text.description}</p>
        <p className="mt-4 rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-sm leading-[1.6] text-on-surface-variant">{text.note}</p>
        <div className="mt-7 grid gap-2 sm:grid-cols-2">
          <Link href="/" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-on-primary">
            {text.retry}<ArrowUpRight size={15} aria-hidden="true" />
          </Link>
          <Link href="/patch-notes" className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 text-center text-sm font-medium text-primary">
            {text.updates}
          </Link>
        </div>
      </section>
    </main>
  );
}
