// Сбор внутренней статистики использования конструктора: заходы (pageview) и клики
// по кнопкам самого приложения. Бэкенд — тот же сервер, что и ИИ-диктовка
// (см. server/README.md), эндпоинт /api/analytics/event, вызываем абсолютным URL —
// GitHub Pages отдаёт только статику.
const API_BASE = 'https://knopki.assaru.space/api';

const SESSION_STORAGE_KEY = 'analytics_session_id';
const FLUSH_INTERVAL_MS = 5000;
// Защита от неограниченного роста очереди, если сеть недоступна долгое время —
// старые события просто вытесняются новыми, для внутренней статистики это некритично.
const MAX_QUEUE_LENGTH = 200;
const LABEL_MAX_LENGTH = 40;

type AnalyticsEventType = 'pageview' | 'click';

interface AnalyticsEvent {
  type: AnalyticsEventType;
  page: string;
  label?: string;
}

let sessionId: string | null = null;
let currentPage = 'unknown';
let queue: AnalyticsEvent[] = [];
let initialized = false;

function getSessionId(): string {
  if (sessionId) return sessionId;
  const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (stored) {
    sessionId = stored;
    return stored;
  }
  const fresh = crypto.randomUUID();
  sessionStorage.setItem(SESSION_STORAGE_KEY, fresh);
  sessionId = fresh;
  return fresh;
}

function enqueue(event: AnalyticsEvent): void {
  queue.push(event);
  if (queue.length > MAX_QUEUE_LENGTH) {
    queue = queue.slice(queue.length - MAX_QUEUE_LENGTH);
  }
}

function flush(): void {
  if (queue.length === 0) return;
  const events = queue;
  queue = [];

  const payload = JSON.stringify({ sessionId: getSessionId(), events });

  if (typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([payload], { type: 'application/json' });
    const accepted = navigator.sendBeacon(`${API_BASE}/analytics/event`, blob);
    if (accepted) return;
  }

  // sendBeacon недоступен или отказал (например, превышен лимит очереди браузера) —
  // отправляем через fetch с keepalive, чтобы запрос пережил закрытие вкладки.
  void fetch(`${API_BASE}/analytics/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // сеть недоступна — событие теряется, ретраить внутреннюю статистику не критично
  });
}

function resolveLabel(el: Element): string {
  const dataId = el.getAttribute('data-analytics-id');
  if (dataId) return dataId;

  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;

  const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ');
  if (text) {
    return text.length > LABEL_MAX_LENGTH ? `${text.slice(0, LABEL_MAX_LENGTH)}…` : text;
  }

  const id = el.getAttribute('id');
  if (id) return id;

  return 'unknown';
}

function handleDocumentClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const control = target.closest('button, [role="button"]');
  if (!control) return;

  // Кнопки-имитации чужой Telegram/MAX-клавиатуры (превью раскладки пользователя)
  // помечаются data-analytics-skip на контейнере — это не элементы управления
  // самого приложения, их клики не считаем.
  if (control.closest('[data-analytics-skip]')) return;

  enqueue({ type: 'click', page: currentPage, label: resolveLabel(control) });
}

/** Регистрирует заход/переключение вкладки — page также используется как контекст для последующих кликов. */
export function trackPageview(page: string): void {
  currentPage = page;
  enqueue({ type: 'pageview', page });
}

/** Разовая настройка делегированного слушателя кликов и авто-отправки очереди — вызывать один раз при старте приложения. */
export function initAnalytics(): void {
  if (initialized) return;
  initialized = true;

  document.addEventListener('click', handleDocumentClick);

  window.setInterval(flush, FLUSH_INTERVAL_MS);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);
}
