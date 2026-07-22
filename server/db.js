// Хранилище статистики использования конструктора (заходы + клики по кнопкам
// самого приложения). Встроенный node:sqlite (Node 22.5+) — без нативной
// компиляции и без лишней зависимости, в отличие от better-sqlite3, которая
// на новых версиях Node может не иметь готового бинарника и падать при сборке.
// Модуль печатает ExperimentalWarning от Node при старте — это ожидаемо,
// API стабилен для нашего простого использования (создать таблицу, вставить, выбрать).
import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');
const DB_PATH = join(DATA_DIR, 'analytics.db');

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    page TEXT NOT NULL,
    label TEXT,
    session_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`);
db.exec('CREATE INDEX IF NOT EXISTS idx_events_type_created ON events(type, created_at)');
db.exec('CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id)');

const insertStmt = db.prepare(
  'INSERT INTO events (type, page, label, session_id, created_at) VALUES (?, ?, ?, ?, ?)'
);

/** Пишет батч событий одной сессии. Метка времени — момент получения на сервере (не доверяем часам клиента). */
export function insertEvents(events, sessionId) {
  const now = new Date().toISOString();
  for (const event of events) {
    insertStmt.run(event.type, event.page, event.label ?? null, sessionId, now);
  }
}

function countWhere(whereSql) {
  return Number(db.prepare(`SELECT COUNT(*) as c FROM events WHERE ${whereSql}`).get().c);
}

/** Агрегаты для админ-панели «Аналитика» — считается на лету, таблица небольшая (личный внутренний инструмент). */
export function getStats() {
  const totalPageviews = countWhere("type = 'pageview'");
  const todayPageviews = countWhere("type = 'pageview' AND date(created_at) = date('now')");
  const last7DaysPageviews = countWhere("type = 'pageview' AND created_at >= datetime('now', '-7 days')");
  const uniqueSessions = Number(db.prepare('SELECT COUNT(DISTINCT session_id) as c FROM events').get().c);

  const dailyRows = db.prepare(`
    SELECT date(created_at) as day, COUNT(*) as count
    FROM events
    WHERE type = 'pageview' AND created_at >= datetime('now', '-30 days')
    GROUP BY day
  `).all();
  const dailyMap = new Map(dailyRows.map(r => [String(r.day), Number(r.count)]));

  const dailyPageviews = [];
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyPageviews.push({ date: key, count: dailyMap.get(key) ?? 0 });
  }

  const topPages = db.prepare(`
    SELECT page, COUNT(*) as count FROM events
    WHERE type = 'pageview'
    GROUP BY page ORDER BY count DESC LIMIT 10
  `).all().map(r => ({ page: String(r.page), count: Number(r.count) }));

  const topButtons = db.prepare(`
    SELECT label, COUNT(*) as count FROM events
    WHERE type = 'click' AND label IS NOT NULL
    GROUP BY label ORDER BY count DESC LIMIT 15
  `).all().map(r => ({ label: String(r.label), count: Number(r.count) }));

  return {
    totalPageviews,
    todayPageviews,
    last7DaysPageviews,
    uniqueSessions,
    dailyPageviews,
    topPages,
    topButtons,
  };
}
