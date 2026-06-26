# Красим кнопки

React/Vite-приложение для сборки inline-клавиатур, Bot API/MAX API-запросов, форматирования текста, JSON и LEADTEH API. Приложение работает в двух режимах:

- **Mini App** — production для Telegram открывается с GitHub Pages: `https://roman72-186.github.io/color_butten/`
- **Web** — обычная браузерная версия, например на Vercel: `https://telegram-keyboard-constructor.vercel.app`

## Команды

```bash
npm run dev            # локальный запуск
npm run build:web      # сборка для обычного сайта с base=/
npm run build:miniapp  # сборка для GitHub Pages с base=/color_butten/
npm run lint
npm run preview
npm run deploy         # production для Telegram Mini App на GitHub Pages
```

`npm run deploy` оставлен единственным production-деплоем для Mini App: он собирает проект с `--base=/color_butten/` и публикует `dist` в `gh-pages`.

## Web-режим

При открытии вне Telegram Mini App приложение показывает web-шапку и использует обычный root-base `/`. При запуске из Telegram Mini App контекст определяется по `tgWebApp*` параметрам или `window.Telegram.WebApp`, поэтому Mini App остаётся компактным.

Для web-публикации на Vercel достаточно `git push origin main`: Vercel подтянет репозиторий сам. Ручной `vercel --prod` для этого проекта не нужен.
