# TKlab Telegram Bot

Telegram-бот для мониторинга `https://tklabs.uk`. Работает в Cloudflare Workers.

## Возможности

- проверяет сайт по расписанию Cloudflare Cron;
- сообщает об аварии после нескольких неудачных проверок и отправляет сообщение о восстановлении;
- принимает команды через Telegram webhook;
- хранит состояние мониторинга и историю диалога в Durable Object;
- ограничивает доступ по Telegram ID.

## Команды

- `/start`, `/help` — список команд;
- `/status` — проверка главной страницы;
- `/health` — проверка основных endpoint'ов сайта;
- `/commits [N]` — последние коммиты репозитория;
- `/reset` — очистить историю диалога.

## Деплой

Деплой выполняется GitHub Actions при push в `main`.

GitHub Environment: `TELEGRAM_BOT_TOKEN`

Обязательные секреты:

- `TELEGRAM_BOT_TOKEN`;
- `TELEGRAM_ALLOWED_USER_IDS`;
- `CLOUDFLARE_API_TOKEN`.

Дополнительные секреты:

- `REPO_GITHUB_TOKEN` — нужен для доступа к приватному репозиторию;
- `CLODEX_API_KEY` — нужен для AI-ответов.

После деплоя workflow автоматически загружает секреты Worker, регистрирует webhook Telegram и проверяет его состояние.

## Локальный запуск

```bash
npm ci
npm run check
npm run dev
```

Для локального запуска секреты можно указать в `.dev.vars`. Файл `.dev.vars` не добавляется в Git.
