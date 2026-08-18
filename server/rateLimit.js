// Ограничение частоты обращений к платным ИИ-эндпоинтам (/api/transcribe и /api/generate).
// Без него любой POST извне получает Whisper и Claude за счёт владельца ключа OpenRouter.
//
// Это же место — будущая точка учёта платной квоты по пользователям (см. раздел 4
// документа plans/2026-08-18-color-btn-analiz-i-platnye-funkcii.md): resolveIdentity()
// сменит источник личности с IP на проверенный telegram-id из initData, а consume()
// получит тариф. Формат ответа ({ allowed, retryAfterSec, scope }) при этом не меняется.
//
// Счётчики живут в памяти процесса и обнуляются при рестарте. Это осознанно:
// PM2 запускает knopki-ai-api одним процессом в режиме fork (deploy/ecosystem.config.cjs,
// ни instances, ни exec_mode не заданы), поэтому Map — общая на весь сервис.
// Появится второй экземпляр — лимит умножится на их число, и счётчики придётся
// вынести в SQLite рядом с аналитикой.

// Пределы выведены из худшего честного сценария, а не наугад. Одна диктовка — это
// 1 запрос распознавания + 1 генерация; запись ограничена 90 секундами, поэтому чаще
// одного распознавания в полторы минуты не выходит физически. Зато на вкладке «Текст»
// человек правит расшифровку и жмёт генерацию повторно, не перезаписывая голос,
// то есть нормально видеть 1 распознавание и много генераций подряд.
// Худшая честная минута — около 2 распознаваний и 8 генераций; берём тройной запас.
const WINDOW_MS = 60_000;
const WINDOW_MAX = 30;

// Суточный предел на один адрес — потолок для случая, когда лимит минуты
// выбирают ровно по расписанию: 30 в минуту дало бы 43 тысячи запросов в сутки.
const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_MAX = 300;

// Общий предохранитель на весь сервис: защищает кошелёк, когда адреса меняются
// (ботнет, прокси, мобильный NAT). Значение — заведомо выше любой реальной
// суммарной нагрузки текущей аудитории, но ниже суммы, за которую обидно платить.
const GLOBAL_WINDOW_MS = 60 * 60 * 1000;
const GLOBAL_MAX = 600;

// Потолок числа отслеживаемых адресов: перебор адресов не должен разрастить Map.
const MAX_TRACKED_IDENTITIES = 5000;

const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/** @type {Map<string, { hits: number[], dayStart: number, dayCount: number, lastSeen: number }>} */
const identities = new Map();

/** @type {number[]} */
let globalHits = [];

const rejected = { window: 0, day: 0, global: 0 };

/**
 * Кто обратился. Node слушает только 127.0.0.1, наружу смотрит nginx, поэтому
 * настоящий адрес приходит заголовком. Берём X-Real-IP — nginx выставляет его
 * из $remote_addr и затирает присланное клиентом; X-Forwarded-For для этого не
 * годится, там первое значение пишет сам клиент. Заголовку верим только когда
 * соединение действительно пришло с петлевого адреса, то есть от своего nginx.
 */
export function resolveIdentity(req) {
  const socketAddress = req.socket?.remoteAddress ?? '';
  if (LOOPBACK_ADDRESSES.has(socketAddress)) {
    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string' && realIp.trim()) {
      return `ip:${realIp.trim()}`;
    }
  }
  return `ip:${socketAddress || 'unknown'}`;
}

function pruneOlderThan(timestamps, cutoff) {
  let firstFresh = 0;
  while (firstFresh < timestamps.length && timestamps[firstFresh] <= cutoff) {
    firstFresh += 1;
  }
  return firstFresh === 0 ? timestamps : timestamps.slice(firstFresh);
}

/** Ленивая уборка при обращении — дешевле постоянного setInterval на живом процессе. */
function evictStale(now) {
  if (identities.size < MAX_TRACKED_IDENTITIES) return;
  for (const [key, entry] of identities) {
    if (now - entry.lastSeen > DAY_MS) identities.delete(key);
  }
  // Если после уборки просроченных всё ещё тесно — выкидываем самых давних.
  // Map хранит порядок вставки, а запись пересоздаётся при каждом обращении
  // (см. consume), поэтому в начале лежат те, кого дольше всех не было.
  while (identities.size >= MAX_TRACKED_IDENTITIES) {
    const oldestKey = identities.keys().next().value;
    if (oldestKey === undefined) break;
    identities.delete(oldestKey);
  }
}

function secondsUntil(timestamp, now) {
  return Math.max(1, Math.ceil((timestamp - now) / 1000));
}

/**
 * Резервирует одно обращение к ИИ. Счётчик увеличивается сразу, до похода в
 * OpenRouter: проверка «сначала спросили, потом записали после ответа» пропускает
 * любое число одновременных запросов, потому что все они успевают спросить раньше,
 * чем первый ответит.
 *
 * @returns {{ allowed: boolean, retryAfterSec: number, scope: 'window' | 'day' | 'global' | null }}
 */
export function consume(identity, cost = 1) {
  const now = Date.now();

  globalHits = pruneOlderThan(globalHits, now - GLOBAL_WINDOW_MS);
  if (globalHits.length + cost > GLOBAL_MAX) {
    rejected.global += 1;
    return { allowed: false, retryAfterSec: secondsUntil(globalHits[0] + GLOBAL_WINDOW_MS, now), scope: 'global' };
  }

  evictStale(now);

  const existing = identities.get(identity);
  const entry = existing ?? { hits: [], dayStart: now, dayCount: 0, lastSeen: now };
  entry.hits = pruneOlderThan(entry.hits, now - WINDOW_MS);
  if (now - entry.dayStart >= DAY_MS) {
    entry.dayStart = now;
    entry.dayCount = 0;
  }

  // Пересоздаём запись в конце Map, чтобы порядок вставки отражал давность обращения.
  identities.delete(identity);
  identities.set(identity, entry);
  entry.lastSeen = now;

  if (entry.hits.length + cost > WINDOW_MAX) {
    rejected.window += 1;
    return { allowed: false, retryAfterSec: secondsUntil(entry.hits[0] + WINDOW_MS, now), scope: 'window' };
  }
  if (entry.dayCount + cost > DAY_MAX) {
    rejected.day += 1;
    return { allowed: false, retryAfterSec: secondsUntil(entry.dayStart + DAY_MS, now), scope: 'day' };
  }

  for (let i = 0; i < cost; i += 1) {
    entry.hits.push(now);
    globalHits.push(now);
  }
  entry.dayCount += cost;

  return { allowed: true, retryAfterSec: 0, scope: null };
}

/**
 * Сводка для /api/analytics/stats. Логов у процесса нет (console.log в проекте
 * запрещён), поэтому это единственный способ увидеть, что по серверу кто-то стучит:
 * ненулевые отказы при нулевой посещаемости означают чужой интерес к эндпоинтам.
 */
export function getRateLimitStats() {
  const now = Date.now();
  globalHits = pruneOlderThan(globalHits, now - GLOBAL_WINDOW_MS);
  return {
    aiRequestsLastHour: globalHits.length,
    aiTrackedIdentities: identities.size,
    aiRejected: { ...rejected },
  };
}
