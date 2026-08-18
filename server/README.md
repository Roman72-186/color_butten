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
| POST | `/api/transcribe` | публичный, с лимитом частоты | распознавание речи (OpenRouter Whisper) |
| POST | `/api/generate` | публичный, с лимитом частоты | генерация раскладки/текста (OpenRouter Claude) |
| POST | `/api/analytics/event` | публичный | приём батча событий (pageview/click) от фронтенда |
| GET | `/api/analytics/stats` | `Authorization: Bearer <ANALYTICS_ADMIN_TOKEN>` | агрегаты для скрытой вкладки «Аналитика» (открывается тройным кликом по версии в подвале) |

Статистика хранится в SQLite (`node:sqlite`, встроен в Node 22.5+, без нативной
компиляции) — файл `server/data/analytics.db`, директория создаётся при старте
автоматически и не коммитится (`.gitignore`).

## Лимит частоты на ИИ-эндпоинтах

`rateLimit.js` — счётчики в памяти процесса, проверяются в маршрутизации до разбора
тела запроса. Пределы захардкожены в исходнике (как и `ALLOWED_ORIGINS`), переменных
окружения под них нет: 30 обращений в минуту и 300 в сутки с одного адреса плюс общий
предохранитель 600 в час на весь сервис. Отказ — 429 с заголовком `Retry-After` и
русским текстом ошибки, который фронтенд показывает как есть.

Личность — IP из заголовка `X-Real-IP` (его выставляет nginx, см. `deploy/*.nginx.conf`);
заголовку доверяем только когда соединение пришло с петлевого адреса, то есть от своего
же nginx. Это то место, куда потом ляжет платная квота по пользователям: сменится
источник личности в `resolveIdentity()`, всё остальное останется.

Счётчики держатся в памяти и обнуляются при `pm2 restart`. Это допустимо, пока PM2
запускает процесс в одном экземпляре в режиме fork (`deploy/ecosystem.config.cjs`).
Появится кластер — лимит умножится на число процессов, и счётчики придётся перенести
в SQLite рядом с аналитикой.

Логов у процесса нет (`console.log` в проекте запрещён), поэтому число отказов
подмешано в ответ `/api/analytics/stats`: поля `aiRequestsLastHour`,
`aiTrackedIdentities`, `aiRejected`. Панель «Аналитика» их не показывает, смотреть
curl'ом. Ненулевые отказы при пустой посещаемости означают, что эндпоинты кто-то щупает.

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

## О чём помнить при работе с этим сервером

Записано по итогам сессии 22.07.2026, когда бэкенд поднимали. Не разовые заметки, а то, что всплывёт снова.

- **Список разрешённых доменов задан прямо в коде.** `ALLOWED_ORIGINS` — обычный `Set` в `server/index.js:26`, плюс правило «любой поддомен `.vercel.app`». Отдельного конфига нет: сменится адрес фронтенда или появится новое зеркало — править исходник и перезапускать процесс, иначе браузер будет молча получать отказ.
- **Падение процесса никто не заметит.** Мониторинга и алертов для `knopki-ai-api` нет. Если он ляжет, первым признаком будет жалоба, что кнопка «Надиктовать» не работает. Проверять руками — `pm2 list` и `curl /api/health`.
- **Место на диске.** На 22.07.2026 на `server-main` было занято 82% (свободно 7.3 ГБ), и сервер общий с другими проектами. Перед деплоем сюда смотреть `df -h`.

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
