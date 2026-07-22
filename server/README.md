# knopki-ai-api

Бэкенд ИИ-диктовки (голос → раскладка кнопок / размеченный текст) и внутренней
статистики использования конструктора для telegram-keyboard-constructor. Живёт
отдельно от фронтенда — на сервере `server-main` (72.56.77.253), под PM2, за
nginx-реверс-прокси с TLS. Никакого фреймворка: `index.js` (роутинг и ИИ-диктовка) +
`db.js` (SQLite-хранилище аналитики) + зависимость `dotenv`.

Фронтенд (GitHub Pages + Vercel-зеркало) стучится сюда по адресу
`https://knopki.assaru.space/api/...` (см. `src/utils/aiClient.ts` и `src/utils/analytics.ts`).

## Эндпоинты

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/api/health` | публичный | проверка живости процесса |
| POST | `/api/transcribe` | публичный | распознавание речи (OpenRouter Whisper) |
| POST | `/api/generate` | публичный | генерация раскладки/текста (OpenRouter Claude) |
| POST | `/api/analytics/event` | публичный | приём батча событий (pageview/click) от фронтенда |
| GET | `/api/analytics/stats` | `Authorization: Bearer <ANALYTICS_ADMIN_TOKEN>` | агрегаты для скрытой вкладки «Аналитика» (`?admin=1`) |

Статистика хранится в SQLite (`node:sqlite`, встроен в Node 22.5+, без нативной
компиляции) — файл `server/data/analytics.db`, директория создаётся при старте
автоматически и не коммитится (`.gitignore`).

## Первичная установка (server-main)

```bash
ssh server-main

# 1. Клонировать репозиторий
git clone https://github.com/Roman72-186/color_butten.git /opt/knopki-ai
cd /opt/knopki-ai/server
npm install --omit=dev

# 2. Секреты — вручную, не через git
cp .env.example .env
nano .env   # вписать OPENROUTER_API_KEY и ANALYTICS_ADMIN_TOKEN

# 3. nginx (домен должен уже резолвиться на этот сервер — см. deploy/*.nginx.conf)
cp deploy/knopki.assaru.space.nginx.conf /etc/nginx/sites-available/knopki.assaru.space
ln -s ../sites-available/knopki.assaru.space /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d knopki.assaru.space

# 4. Запуск через PM2
pm2 start deploy/ecosystem.config.cjs
pm2 save

# 5. Проверка
curl -s https://knopki.assaru.space/api/health   # -> {"status":"ok"}
pm2 logs knopki-ai-api --lines 50 --nostream
```

## Обновление после изменений в репозитории

```bash
ssh server-main
cd /opt/knopki-ai && git pull --ff-only origin main
cd server && npm install --omit=dev   # только если менялись зависимости
pm2 restart knopki-ai-api
pm2 logs knopki-ai-api --lines 50 --nostream
```

`.env` в `/opt/knopki-ai/server/` не в git и не трогается при `git pull`.

## Проверка аналитики curl'ом

```bash
# событие (публичный эндпоинт, шлёт сам фронтенд через sendBeacon)
curl -s -X POST https://knopki.assaru.space/api/analytics/event \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test-session","events":[{"type":"pageview","page":"keyboard:telegram"}]}'
# -> {"ok":true}

# статистика без токена — 401
curl -s -i https://knopki.assaru.space/api/analytics/stats | head -1
# -> HTTP/1.1 401 ...

# статистика с токеном
curl -s https://knopki.assaru.space/api/analytics/stats \
  -H "Authorization: Bearer <ANALYTICS_ADMIN_TOKEN>"
```
