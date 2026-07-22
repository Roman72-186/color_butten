// knopki-ai-api — бэкенд ИИ-диктовки (голос → раскладка кнопок / размеченный текст)
// для telegram-keyboard-constructor. Живёт на VPS под PM2 (см. deploy/), а не на Vercel:
// два эндпоинта, оба проксируют в OpenRouter (Whisper + Claude), без фреймворка.
import 'dotenv/config';
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT) || 8788;
const HOST = process.env.HOST || '127.0.0.1';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1';
const MODEL = 'anthropic/claude-sonnet-4.5';

// Ограничение на длину base64-аудио и тела запроса в целом — не даёт наговорить
// многоминутный монолог и держит память процесса под контролем.
const MAX_BODY_BYTES = 8_000_000;
const MAX_INPUT_CHARS = 4000;

const ALLOWED_ORIGINS = new Set([
  'https://roman72-186.github.io',
  'https://telegram-keyboard-constructor.vercel.app',
]);

function isAllowedOrigin(origin) {
  return ALLOWED_ORIGINS.has(origin) || origin.endsWith('.vercel.app');
}

const SYSTEM_PROMPTS = {
  'telegram-keyboard': `Ты помогаешь собрать inline-клавиатуру Telegram Bot API по описанию пользователя на русском языке. Текст получен из голосовой диктовки — в нём могут быть оговорки и распознанные с ошибкой слова, исправляй их по смыслу.

Верни СТРОГО валидный JSON-массив кнопок без пояснений, без markdown-обрамления \`\`\`, без комментариев. Каждый элемент массива:
{
  "text": string,
  "style": "default" | "primary" | "success" | "danger",
  "actionType": "callback_data" | "url" | "web_app" | "switch_inline_query" | "switch_inline_query_current_chat",
  "actionValue": string,
  "row": number,
  "col": number
}

Правила:
- actionValue: для callback_data — латиница/snake_case slug по смыслу текста кнопки; для url/web_app — сама ссылка; для switch_inline_query и switch_inline_query_current_chat допустима пустая строка;
- одинаковый row у нескольких кнопок = они в одной строке клавиатуры (сортируются по col), разный row = разные строки;
- не повторяй пары row+col;
- если пользователь не назвал стиль — "default"; если не назвал тип действия — "callback_data";
- если перечислены кнопки подряд без указания расположения — размести по одной строке на кнопку, если явно не попросили "в один ряд"/"рядом";
- row и col — целые числа от 1 до 7 (сетка максимум 7×7).`,

  'max-keyboard': `Ты помогаешь собрать клавиатуру MAX Bot API по описанию пользователя на русском языке. Текст получен из голосовой диктовки — в нём могут быть оговорки и распознанные с ошибкой слова, исправляй их по смыслу.

Верни СТРОГО валидный JSON-массив кнопок без пояснений, без markdown-обрамления \`\`\`, без комментариев. Каждый элемент массива:
{
  "type": "callback" | "message" | "link" | "open_app" | "clipboard" | "request_contact" | "request_geo_location",
  "text": string,
  "payload": string,
  "url": string,
  "row": number,
  "col": number
}

Правила:
- payload — callback_data для "callback", текст сообщения для "message", текст для копирования для "clipboard", необязательный startapp для "open_app"; для остальных типов — пустая строка;
- url — ссылка для "link", bot_username или URL Mini App для "open_app"; для остальных типов — пустая строка;
- одинаковый row у нескольких кнопок = они в одной строке (сортируются по col), разный row = разные строки;
- не повторяй пары row+col;
- если тип действия не назван явно — "callback";
- row и col — целые числа от 1 до 7 (сетка максимум 7×7).`,

  'text-html': `Ты помогаешь оформить текст сообщения Telegram (parse_mode=HTML) по надиктованному описанию на русском языке. В тексте могут быть оговорки и ошибки распознавания речи — исправляй их по смыслу.

Разрешены только теги: <b>, <i>, <u>, <s>, <tg-spoiler>, <code>, <pre>, <a href="URL">. Никаких других тегов и markdown-синтаксиса.
Верни СТРОГО JSON-объект без пояснений и без markdown-обрамления: {"result": "готовый HTML-текст"}.`,

  'text-markdown': `Ты помогаешь оформить текст сообщения Telegram (parse_mode=MarkdownV2) по надиктованному описанию на русском языке. В тексте могут быть оговорки и ошибки распознавания речи — исправляй их по смыслу.

Синтаксис: *жирный*, _курсив_, __подчёркнутый__, ~зачёркнутый~, ||спойлер||, \`код\`, тройные обратные кавычки для блока кода, [текст](url) для ссылки. Экранируй обратным слэшем служебные символы MarkdownV2 (_ * [ ] ( ) ~ \` > # + - = | { } . !), которые встречаются вне разметки как обычная пунктуация.
Верни СТРОГО JSON-объект без пояснений и без markdown-обрамления: {"result": "готовый текст в MarkdownV2"}.`,

  'text-rich-html': `Ты помогаешь оформить rich-сообщение Telegram Bot API 10.1 (rich_message.html) по надиктованному описанию на русском языке. В тексте могут быть оговорки и ошибки распознавания речи — исправляй их по смыслу.

Доступные теги: <b> <i> <u> <s> <mark> <tg-spoiler> <code> <pre> <sub> <sup> <tg-math> (LaTeX-формула), <h1>-<h6>, <p>, <blockquote>, <aside>, <footer>, <hr/>, <ul><li>, <ol><li>, чеклист через <ul><li><input type="checkbox" [checked]>текст</li></ul>, <a href="URL">, <a name="якорь"></a>, <tg-reference name="имя">. Перенос строки — <br>, новый абзац — <br><br>.
Верни СТРОГО JSON-объект без пояснений и без markdown-обрамления: {"result": "готовый rich HTML-текст"}.`,

  'text-rich-markdown': `Ты помогаешь оформить rich-сообщение Telegram Bot API 10.1 (rich_message.markdown, GitHub-style markdown) по надиктованному описанию на русском языке. В тексте могут быть оговорки и ошибки распознавания речи — исправляй их по смыслу.

Синтаксис: **жирный**, *курсив*, <u>подчёркнутый</u>, ~~зачёркнутый~~, ==выделение==, ||спойлер||, \`код\`, тройные обратные кавычки для блока кода, <sub>/<sup>, $формула$, [текст](url), <tg-reference name="имя">, <a name="якорь"></a>. Заголовки — # ## ### #### ##### ######, абзац — пустая строка между блоками, цитата — "> ", <aside>, <footer>, разделитель — "---", маркированный список — "- пункт", нумерованный — "1. пункт", чеклист — "- [ ] задача" / "- [x] выполнено". Перенос строки — <br>.
Верни СТРОГО JSON-объект без пояснений и без markdown-обрамления: {"result": "готовый rich Markdown-текст"}.`,
};

const JSON_ARRAY_MODES = new Set(['telegram-keyboard', 'max-keyboard']);

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(json);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('payload too large'));
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on('end', () => {
      if (!data) return resolve(null);
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve(null);
      }
    });
    req.on('error', reject);
  });
}

function stripCodeFence(raw) {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
}

async function handleTranscribe(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    send(res, 413, { error: 'Тело запроса слишком большое' });
    return;
  }

  const audio = body?.audio;
  const format = typeof body?.format === 'string' && body.format ? body.format : 'webm';

  if (typeof audio !== 'string' || !audio) {
    send(res, 400, { error: 'Поле audio (base64) обязательно' });
    return;
  }

  try {
    const upstream = await fetch(`${OPENROUTER_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/whisper-large-v3',
        language: 'ru',
        input_audio: { data: audio, format },
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      send(res, upstream.status, { error: data?.error?.message ?? 'Ошибка распознавания речи' });
      return;
    }

    send(res, 200, { text: (data.text ?? '').trim() });
  } catch {
    send(res, 502, { error: 'Не удалось связаться с сервисом распознавания речи' });
  }
}

async function handleGenerate(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    send(res, 413, { error: 'Тело запроса слишком большое' });
    return;
  }

  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  const mode = typeof body?.mode === 'string' ? body.mode : '';
  const systemPrompt = SYSTEM_PROMPTS[mode];

  if (!text) {
    send(res, 400, { error: 'Поле text обязательно' });
    return;
  }
  if (!systemPrompt) {
    send(res, 400, { error: 'Неизвестный mode' });
    return;
  }
  if (text.length > MAX_INPUT_CHARS) {
    send(res, 413, { error: 'Слишком длинный текст' });
    return;
  }

  try {
    const upstream = await fetch(`${OPENROUTER_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      send(res, upstream.status, { error: data?.error?.message ?? 'Ошибка генерации' });
      return;
    }

    const raw = data?.choices?.[0]?.message?.content ?? '';
    const cleaned = stripCodeFence(raw);

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      send(res, 502, { error: 'ИИ вернул невалидный JSON, попробуйте ещё раз' });
      return;
    }

    if (JSON_ARRAY_MODES.has(mode)) {
      if (!Array.isArray(parsed)) {
        send(res, 502, { error: 'ИИ вернул не массив кнопок, попробуйте ещё раз' });
        return;
      }
      send(res, 200, { result: parsed });
      return;
    }

    if (typeof parsed?.result !== 'string') {
      send(res, 502, { error: 'ИИ вернул некорректный ответ, попробуйте ещё раз' });
      return;
    }
    send(res, 200, { result: parsed.result });
  } catch {
    send(res, 502, { error: 'Не удалось связаться с сервисом генерации' });
  }
}

const server = createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/health') {
    send(res, 200, { status: 'ok' });
    return;
  }

  if (req.method !== 'POST') {
    send(res, 405, { error: 'Method Not Allowed' });
    return;
  }

  if (!OPENROUTER_API_KEY) {
    send(res, 500, { error: 'OPENROUTER_API_KEY не настроен на сервере' });
    return;
  }

  if (url.pathname === '/api/transcribe') {
    await handleTranscribe(req, res);
    return;
  }
  if (url.pathname === '/api/generate') {
    await handleGenerate(req, res);
    return;
  }

  send(res, 404, { error: 'Not Found' });
});

server.listen(PORT, HOST, () => {
  console.log(`knopki-ai-api listening on ${HOST}:${PORT}`);
});
