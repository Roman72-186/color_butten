import { useState, useCallback, useMemo } from 'react';
import type { ButtonConfig } from '../types';
import { Preview } from './Preview';
import styles from '../styles/RequestBuilder.module.css';

// ─── Types ──────────────────────────────────────────────────────────────────

type MaxButtonType = 'callback' | 'message' | 'link' | 'request_contact' | 'request_geo_location';

type MaxMethod =
  | 'sendMessage'
  | 'editMessage'
  | 'deleteMessage'
  | 'getMe'
  | 'getChats'
  | 'getChat'
  | 'editChat'
  | 'getChatMembers'
  | 'getChatMember'
  | 'addChatMember'
  | 'kickChatMember'
  | 'leaveChat'
  | 'pinMessage'
  | 'unpinMessage';

interface MaxButtonItem {
  id: string;
  type: MaxButtonType;
  text: string;
  payload: string;
  url: string;
  row: number;
}

interface MaxImageItem {
  id: string;
  url: string;
}

interface MaxFormState {
  method: MaxMethod;
  // sendMessage / editMessage target
  targetType: 'user' | 'chat';
  targetId: string;
  // message content
  text: string;
  format: '' | 'markdown';
  images: MaxImageItem[];
  buttons: MaxButtonItem[];
  // message_id (editMessage / deleteMessage / pinMessage)
  messageId: string;
  // chat_id (most chat methods)
  chatId: string;
  // user_id (addChatMember / kickChatMember)
  userId: string;
  // editChat
  chatTitle: string;
  // pagination (getChats / getChatMembers)
  count: string;
  // pinMessage
  pinNotify: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

interface MaxMethodConfig {
  id: MaxMethod;
  label: string;
  description: string;
  category: 'messages' | 'chats' | 'bot';
  httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
}

const MAX_METHODS: MaxMethodConfig[] = [
  { id: 'sendMessage',    label: 'Отправить сообщение',    description: 'Отправить сообщение пользователю или в чат/канал', category: 'messages', httpMethod: 'POST'   },
  { id: 'editMessage',    label: 'Редактировать сообщение', description: 'Редактировать отправленное сообщение',            category: 'messages', httpMethod: 'PUT'    },
  { id: 'deleteMessage',  label: 'Удалить сообщение',      description: 'Удалить сообщение',                               category: 'messages', httpMethod: 'DELETE' },
  { id: 'getMe',          label: 'Информация о боте',      description: 'Информация о боте и его настройки',               category: 'bot',      httpMethod: 'GET'    },
  { id: 'getChats',       label: 'Список чатов',           description: 'Список чатов и каналов, где состоит бот',         category: 'chats',    httpMethod: 'GET'    },
  { id: 'getChat',        label: 'Информация о чате',      description: 'Информация о конкретном чате или канале',         category: 'chats',    httpMethod: 'GET'    },
  { id: 'editChat',       label: 'Изменить название чата', description: 'Изменить название чата',                          category: 'chats',    httpMethod: 'PATCH'  },
  { id: 'getChatMembers', label: 'Участники чата',         description: 'Список участников чата с пагинацией',             category: 'chats',    httpMethod: 'GET'    },
  { id: 'getChatMember',  label: 'Найти участника',        description: 'Проверить конкретного пользователя в чате',       category: 'chats',    httpMethod: 'GET'    },
  { id: 'addChatMember',  label: 'Добавить участника',     description: 'Добавить пользователя в чат',                    category: 'chats',    httpMethod: 'POST'   },
  { id: 'kickChatMember', label: 'Удалить из чата',        description: 'Удалить участника из чата',                      category: 'chats',    httpMethod: 'DELETE' },
  { id: 'leaveChat',      label: 'Покинуть чат',           description: 'Бот покидает чат',                               category: 'chats',    httpMethod: 'DELETE' },
  { id: 'pinMessage',     label: 'Закрепить сообщение',    description: 'Закрепить сообщение в чате или канале',          category: 'chats',    httpMethod: 'POST'   },
  { id: 'unpinMessage',   label: 'Открепить сообщение',    description: 'Открепить закреплённое сообщение',               category: 'chats',    httpMethod: 'DELETE' },
];

const CATEGORY_LABELS: Record<string, string> = {
  messages: 'Сообщения',
  bot: 'Бот',
  chats: 'Чаты и каналы',
};

const HTTP_METHOD_COLORS: Record<string, string> = {
  GET:    'var(--success)',
  POST:   'var(--accent)',
  PUT:    'var(--warning)',
  PATCH:  'var(--warning)',
  DELETE: 'var(--danger)',
};

const MAX_BUTTON_TYPES: { value: MaxButtonType; label: string }[] = [
  { value: 'callback',             label: 'Callback (событие)' },
  { value: 'message',              label: 'Команда (message)' },
  { value: 'link',                 label: 'Ссылка (link)' },
  { value: 'request_contact',      label: 'Запрос контакта' },
  { value: 'request_geo_location', label: 'Запрос геолокации' },
];

const BASE_URL = 'https://platform-api.max.ru';
const MAX_PER_ROW = 3;

// ─── Row selector ─────────────────────────────────────────────────────────────

function MaxRowSelector({
  buttons,
  currentId,
  currentRow,
  onChange,
}: {
  buttons: MaxButtonItem[];
  currentId: string;
  currentRow: number;
  onChange: (row: number) => void;
}) {
  const existingRows = Array.from(new Set(buttons.map(b => b.row))).sort((a, b) => a - b);
  const nextRow = existingRows.length > 0 ? existingRows[existingRows.length - 1] + 1 : 1;

  return (
    <div>
      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Строка в клавиатуре
      </label>
      <select value={currentRow} onChange={e => onChange(Number(e.target.value))}>
        {existingRows.map(row => {
          const count = buttons.filter(b => b.row === row && b.id !== currentId).length;
          const isFull = count >= MAX_PER_ROW;
          const free = MAX_PER_ROW - count;
          return (
            <option key={row} value={row} disabled={isFull}>
              Строка {row}{isFull ? ' (заполнена)' : ` · свободно ${free} из ${MAX_PER_ROW}`}
            </option>
          );
        })}
        <option value={nextRow}>+ Новая строка {nextRow}</option>
      </select>
    </div>
  );
}

// ─── Preview conversion ───────────────────────────────────────────────────────

function maxButtonsToPreviewRows(buttons: MaxButtonItem[]): ButtonConfig[][] {
  const rowMap = new Map<number, MaxButtonItem[]>();
  for (const btn of buttons) {
    const row = rowMap.get(btn.row) ?? [];
    row.push(btn);
    rowMap.set(btn.row, row);
  }
  return Array.from(rowMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([, row]) =>
      row.map(btn => ({
        id: btn.id,
        text: btn.text || '...',
        style: 'default' as const,
        actionType: 'callback_data' as const,
        actionValue: btn.payload,
        row: btn.row,
        iconCustomEmojiId: '',
      }))
    );
}

// ─── ID factory ──────────────────────────────────────────────────────────────

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `max_${Date.now()}_${idCounter}`;
}

// ─── Default state ───────────────────────────────────────────────────────────

function createDefaultButton(row: number): MaxButtonItem {
  return { id: nextId(), type: 'callback', text: '', payload: '', url: '', row };
}

function createDefaultImage(): MaxImageItem {
  return { id: nextId(), url: '' };
}

function createDefaultForm(): MaxFormState {
  return {
    method: 'sendMessage',
    targetType: 'user',
    targetId: '{{max_id}}',
    text: '',
    format: '',
    images: [],
    buttons: [],
    messageId: '{{message_id}}',
    chatId: '{{max_chat_id}}',
    userId: '{{max_id}}',
    chatTitle: '',
    count: '50',
    pinNotify: true,
  };
}

// ─── Request builder ─────────────────────────────────────────────────────────

function buildButtonRows(buttons: MaxButtonItem[]): object[][] {
  const rowMap = new Map<number, MaxButtonItem[]>();
  for (const btn of buttons) {
    const row = rowMap.get(btn.row) ?? [];
    row.push(btn);
    rowMap.set(btn.row, row);
  }
  return Array.from(rowMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([, row]) =>
      row.map(btn => {
        if (btn.type === 'link') return { type: btn.type, text: btn.text, url: btn.url };
        if (btn.type === 'request_contact' || btn.type === 'request_geo_location') return { type: btn.type, text: btn.text };
        return { type: btn.type, text: btn.text, payload: btn.payload };
      })
    );
}

function buildMessageAttachments(images: MaxImageItem[], buttons: MaxButtonItem[]): object[] {
  const attachments: object[] = [];
  for (const img of images) {
    if (img.url.trim()) attachments.push({ type: 'image', payload: { url: img.url.trim() } });
  }
  if (buttons.length > 0) {
    attachments.push({ type: 'inline_keyboard', payload: { buttons: buildButtonRows(buttons) } });
  }
  return attachments;
}

interface BuildResult {
  httpMethod: string;
  endpoint: string;
  body: object | null;
}

function buildRequest(form: MaxFormState): BuildResult {
  const chatId = form.chatId || '{{max_chat_id}}';
  const userId = form.userId || '{{max_id}}';
  const messageId = form.messageId || '{{message_id}}';

  switch (form.method) {
    case 'sendMessage': {
      const query = form.targetType === 'user'
        ? `user_id=${form.targetId || '{{max_id}}'}`
        : `chat_id=${form.targetId || '{{max_chat_id}}'}`;
      const body: Record<string, unknown> = { text: form.text || 'text' };
      if (form.format) body.format = form.format;
      const att = buildMessageAttachments(form.images, form.buttons);
      if (att.length > 0) body.attachments = att;
      return { httpMethod: 'POST', endpoint: `${BASE_URL}/messages?${query}`, body };
    }
    case 'editMessage': {
      const body: Record<string, unknown> = { text: form.text || 'text' };
      if (form.format) body.format = form.format;
      const att = buildMessageAttachments(form.images, form.buttons);
      if (att.length > 0) body.attachments = att;
      return { httpMethod: 'PUT', endpoint: `${BASE_URL}/messages?message_id=${messageId}`, body };
    }
    case 'deleteMessage':
      return { httpMethod: 'DELETE', endpoint: `${BASE_URL}/messages?message_id=${messageId}`, body: null };
    case 'getMe':
      return { httpMethod: 'GET', endpoint: `${BASE_URL}/me`, body: null };
    case 'getChats':
      return { httpMethod: 'GET', endpoint: `${BASE_URL}/chats?count=${form.count || '50'}`, body: null };
    case 'getChat':
      return { httpMethod: 'GET', endpoint: `${BASE_URL}/chats/${chatId}`, body: null };
    case 'editChat':
      return { httpMethod: 'PATCH', endpoint: `${BASE_URL}/chats/${chatId}`, body: { title: form.chatTitle || 'Новое название' } };
    case 'getChatMembers':
      return { httpMethod: 'GET', endpoint: `${BASE_URL}/chats/${chatId}/members?count=${form.count || '50'}`, body: null };
    case 'getChatMember':
      return { httpMethod: 'GET', endpoint: `${BASE_URL}/chats/${chatId}/members?user_ids=${userId}`, body: null };
    case 'addChatMember':
      return { httpMethod: 'POST', endpoint: `${BASE_URL}/chats/${chatId}/members`, body: { user_ids: [userId] } };
    case 'kickChatMember':
      return { httpMethod: 'DELETE', endpoint: `${BASE_URL}/chats/${chatId}/members/${userId}`, body: null };
    case 'leaveChat':
      return { httpMethod: 'DELETE', endpoint: `${BASE_URL}/chats/${chatId}/members/me`, body: null };
    case 'pinMessage': {
      const body: Record<string, unknown> = { message_id: messageId };
      if (form.pinNotify) body.notify = true;
      return { httpMethod: 'POST', endpoint: `${BASE_URL}/chats/${chatId}/pin`, body };
    }
    case 'unpinMessage':
      return { httpMethod: 'DELETE', endpoint: `${BASE_URL}/chats/${chatId}/pin`, body: null };
  }
}

// ─── Field visibility helpers ────────────────────────────────────────────────

const NEEDS_TARGET   = new Set<MaxMethod>(['sendMessage']);
const NEEDS_MSG_BODY = new Set<MaxMethod>(['sendMessage', 'editMessage']);
const NEEDS_MSG_ID   = new Set<MaxMethod>(['editMessage', 'deleteMessage', 'pinMessage']);
const NEEDS_CHAT_ID  = new Set<MaxMethod>(['getChat', 'editChat', 'getChatMembers', 'getChatMember', 'addChatMember', 'kickChatMember', 'leaveChat', 'pinMessage', 'unpinMessage']);
const NEEDS_USER_ID  = new Set<MaxMethod>(['getChatMember', 'addChatMember', 'kickChatMember']);
const NEEDS_COUNT    = new Set<MaxMethod>(['getChats', 'getChatMembers']);
const NEEDS_TITLE    = new Set<MaxMethod>(['editChat']);
const NEEDS_PIN_OPT  = new Set<MaxMethod>(['pinMessage']);

// ─── Component ───────────────────────────────────────────────────────────────

export function MaxRequestBuilder() {
  const [form, setForm] = useState<MaxFormState>(createDefaultForm);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [copiedBody, setCopiedBody]         = useState(false);

  const methodCfg    = useMemo(() => MAX_METHODS.find(m => m.id === form.method)!, [form.method]);
  const request      = useMemo(() => buildRequest(form), [form]);
  const bodyText     = useMemo(() => request.body ? JSON.stringify(request.body, null, 2) : null, [request]);
  const previewRows  = useMemo(() => maxButtonsToPreviewRows(form.buttons), [form.buttons]);

  function updateField<K extends keyof MaxFormState>(key: K, value: MaxFormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  const handleMethodChange = useCallback((method: MaxMethod) => {
    setForm(prev => ({ ...prev, method }));
  }, []);

  const addButton = useCallback(() => {
    setForm(prev => {
      // find first row with fewer than MAX_PER_ROW buttons, otherwise open a new row
      const rowCounts = new Map<number, number>();
      for (const btn of prev.buttons) {
        rowCounts.set(btn.row, (rowCounts.get(btn.row) ?? 0) + 1);
      }
      const existingRows = Array.from(new Set(prev.buttons.map(b => b.row))).sort((a, b) => a - b);
      const maxRow = existingRows.length > 0 ? existingRows[existingRows.length - 1] : 0;
      let targetRow = maxRow + 1;
      for (const r of existingRows) {
        if ((rowCounts.get(r) ?? 0) < MAX_PER_ROW) {
          targetRow = r;
          break;
        }
      }
      return { ...prev, buttons: [...prev.buttons, createDefaultButton(targetRow)] };
    });
  }, []);

  const removeButton = useCallback((id: string) => {
    setForm(prev => ({ ...prev, buttons: prev.buttons.filter(b => b.id !== id) }));
  }, []);

  const updateButton = useCallback((id: string, patch: Partial<MaxButtonItem>) => {
    setForm(prev => ({ ...prev, buttons: prev.buttons.map(b => b.id === id ? { ...b, ...patch } : b) }));
  }, []);

  const addImage = useCallback(() => {
    setForm(prev => ({ ...prev, images: [...prev.images, createDefaultImage()] }));
  }, []);

  const removeImage = useCallback((id: string) => {
    setForm(prev => ({ ...prev, images: prev.images.filter(i => i.id !== id) }));
  }, []);

  const updateImage = useCallback((id: string, url: string) => {
    setForm(prev => ({ ...prev, images: prev.images.map(i => i.id === id ? { ...i, url } : i) }));
  }, []);

  const handleCopyEndpoint = useCallback(() => {
    navigator.clipboard.writeText(request.endpoint).then(() => {
      setCopiedEndpoint(true);
      setTimeout(() => setCopiedEndpoint(false), 1800);
    }).catch(() => undefined);
  }, [request.endpoint]);

  const handleCopyBody = useCallback(() => {
    if (!bodyText) return;
    navigator.clipboard.writeText(bodyText).then(() => {
      setCopiedBody(true);
      setTimeout(() => setCopiedBody(false), 1800);
    }).catch(() => undefined);
  }, [bodyText]);

  const handleReset = useCallback(() => {
    setForm(createDefaultForm());
    setCopiedEndpoint(false);
    setCopiedBody(false);
  }, []);

  const usedRows = Array.from(new Set(form.buttons.map(b => b.row))).sort((a, b) => a - b);

  // Group methods by category for the select
  const categories = ['messages', 'bot', 'chats'] as const;

  return (
    <div className={styles.builder}>
      {/* Info banner */}
      <div className={styles.notice}>
        <div className={styles.noticeTitle}>MAX API — платформа MAX (business.max.ru)</div>
        <div className={styles.noticeText}>
          Base URL: <code className={styles.inlineCode}>https://platform-api.max.ru</code>.
          Заголовок: <code className={styles.inlineCode}>Authorization: {'{{ $max_token }}'}</code>.
          Лимит: 30 запросов/сек.
        </div>
      </div>

      {/* Method selector */}
      <div className={styles.card}>
        <div className={styles.inlineHeader}>
          <div>
            <div className={styles.sectionTitle}>Метод</div>
            <div className={styles.sectionText}>{methodCfg.description}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              className={styles.badge}
              style={{ color: HTTP_METHOD_COLORS[methodCfg.httpMethod] }}
            >
              {methodCfg.httpMethod}
            </span>
            <button className={styles.secondaryBtn} onClick={handleReset}>Сбросить</button>
          </div>
        </div>

        <div className={styles.grid}>
          <div className={styles.fieldFull}>
            <label className={styles.label}>method</label>
            <select
              value={form.method}
              onChange={e => handleMethodChange(e.target.value as MaxMethod)}
            >
              {categories.map(cat => {
                const methods = MAX_METHODS.filter(m => m.category === cat);
                return (
                  <optgroup key={cat} label={CATEGORY_LABELS[cat]}>
                    {methods.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* sendMessage: target */}
      {NEEDS_TARGET.has(form.method) && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Получатель</div>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label className={styles.label}>Тип получателя</label>
              <select
                value={form.targetType}
                onChange={e => {
                  const t = e.target.value as 'user' | 'chat';
                  updateField('targetType', t);
                  updateField('targetId', t === 'user' ? '{{max_id}}' : '{{max_chat_id}}');
                }}
              >
                <option value="user">user_id</option>
                <option value="chat">chat_id</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{form.targetType === 'user' ? 'max_id' : 'max_chat_id'}</label>
              <input
                type="text"
                value={form.targetId}
                placeholder={form.targetType === 'user' ? '{{max_id}}' : '{{max_chat_id}}'}
                onChange={e => updateField('targetId', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* chat_id */}
      {NEEDS_CHAT_ID.has(form.method) && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Чат / канал</div>
          <div className={styles.grid}>
            <div className={styles.fieldFull}>
              <label className={styles.label}>chat_id</label>
              <input
                type="text"
                value={form.chatId}
                placeholder="{{max_chat_id}}"
                onChange={e => updateField('chatId', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* message_id */}
      {NEEDS_MSG_ID.has(form.method) && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Сообщение</div>
          <div className={styles.grid}>
            <div className={styles.fieldFull}>
              <label className={styles.label}>message_id</label>
              <input
                type="text"
                value={form.messageId}
                placeholder="{{message_id}}"
                onChange={e => updateField('messageId', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* user_id */}
      {NEEDS_USER_ID.has(form.method) && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Пользователь</div>
          <div className={styles.grid}>
            <div className={styles.fieldFull}>
              <label className={styles.label}>user_id</label>
              <input
                type="text"
                value={form.userId}
                placeholder="{{max_id}}"
                onChange={e => updateField('userId', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* count (pagination) */}
      {NEEDS_COUNT.has(form.method) && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Пагинация</div>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label className={styles.label}>count</label>
              <input
                type="number"
                min={1}
                max={100}
                value={form.count}
                onChange={e => updateField('count', e.target.value)}
              />
              <div className={styles.fieldHint}>Максимум 100.</div>
            </div>
          </div>
        </div>
      )}

      {/* editChat: title */}
      {NEEDS_TITLE.has(form.method) && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Параметры</div>
          <div className={styles.grid}>
            <div className={styles.fieldFull}>
              <label className={styles.label}>title</label>
              <input
                type="text"
                value={form.chatTitle}
                placeholder="Новое название"
                onChange={e => updateField('chatTitle', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* pinMessage: notify */}
      {NEEDS_PIN_OPT.has(form.method) && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Параметры</div>
          <div className={styles.grid}>
            <div className={styles.fieldFull}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.pinNotify}
                  onChange={e => updateField('pinNotify', e.target.checked)}
                />
                <span>notify — уведомить участников о закреплении</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Message body (sendMessage / editMessage) */}
      {NEEDS_MSG_BODY.has(form.method) && (
        <>
          <div className={styles.card}>
            <div className={styles.sectionTitle}>Текст сообщения</div>
            <div className={styles.grid}>
              <div className={styles.fieldFull}>
                <label className={styles.label}>text</label>
                <textarea
                  className={styles.textarea}
                  rows={4}
                  value={form.text}
                  placeholder="Текст сообщения"
                  onChange={e => updateField('text', e.target.value)}
                />
              </div>
              <div className={styles.fieldFull}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={form.format === 'markdown'}
                    onChange={e => updateField('format', e.target.checked ? 'markdown' : '')}
                  />
                  <span>format: markdown</span>
                </label>
              </div>
            </div>
          </div>

          {/* Images */}
          <div className={styles.card}>
            <div className={styles.inlineHeader}>
              <div>
                <div className={styles.sectionTitle}>Изображения</div>
                <div className={styles.sectionText}>До 5 изображений.</div>
              </div>
              <button
                className={styles.secondaryBtn}
                onClick={addImage}
                disabled={form.images.length >= 5}
              >
                + Фото
              </button>
            </div>
            {form.images.length > 0 && (
              <div className={styles.albumList}>
                {form.images.map((img, i) => (
                  <div key={img.id} className={styles.albumCard}>
                    <div className={styles.albumHeader}>
                      <span className={styles.albumTitle}>Фото {i + 1}</span>
                      <button className={styles.linkBtn} onClick={() => removeImage(img.id)}>Удалить</button>
                    </div>
                    <input
                      type="text"
                      value={img.url}
                      placeholder="https://example.com/photo.jpg"
                      style={{ marginTop: 8 }}
                      onChange={e => updateImage(img.id, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inline keyboard */}
          <div className={styles.card}>
            <div className={styles.inlineHeader}>
              <div>
                <div className={styles.sectionTitle}>Кнопки inline_keyboard</div>
                <div className={styles.sectionText}>Одинаковый номер строки = один ряд.</div>
              </div>
              <button className={styles.secondaryBtn} onClick={addButton}>+ Кнопка</button>
            </div>
            {form.buttons.length > 0 && (
              <div className={styles.albumList}>
                {usedRows.map(row => (
                  <div key={row}>
                    <div className={styles.fieldHint} style={{ marginBottom: 6 }}>Строка {row}</div>
                    {form.buttons.filter(b => b.row === row).map((btn, i) => (
                      <div key={btn.id} className={styles.albumCard} style={{ marginBottom: 8 }}>
                        <div className={styles.albumHeader}>
                          <span className={styles.albumTitle}>Кнопка {i + 1}</span>
                          <button className={styles.linkBtn} onClick={() => removeButton(btn.id)}>Удалить</button>
                        </div>
                        <div className={styles.grid}>
                          <div className={styles.field}>
                            <label className={styles.label}>type</label>
                            <select
                              value={btn.type}
                              onChange={e => updateButton(btn.id, { type: e.target.value as MaxButtonType })}
                            >
                              {MAX_BUTTON_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                              ))}
                            </select>
                          </div>
                          <div className={styles.fieldFull}>
                            <MaxRowSelector
                              buttons={form.buttons}
                              currentId={btn.id}
                              currentRow={btn.row}
                              onChange={row => updateButton(btn.id, { row })}
                            />
                          </div>
                          <div className={styles.fieldFull}>
                            <label className={styles.label}>text</label>
                            <input
                              type="text"
                              value={btn.text}
                              placeholder="Текст кнопки"
                              onChange={e => updateButton(btn.id, { text: e.target.value })}
                            />
                          </div>
                          {btn.type === 'link' && (
                            <div className={styles.fieldFull}>
                              <label className={styles.label}>url</label>
                              <input
                                type="text"
                                value={btn.url}
                                placeholder="https://example.com"
                                onChange={e => updateButton(btn.id, { url: e.target.value })}
                              />
                            </div>
                          )}
                          {(btn.type === 'callback' || btn.type === 'message') && (
                            <div className={styles.fieldFull}>
                              <label className={styles.label}>payload</label>
                              <input
                                type="text"
                                value={btn.payload}
                                placeholder={btn.type === 'message' ? '/menu' : 'my_callback'}
                                onChange={e => updateButton(btn.id, { payload: e.target.value })}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {form.buttons.length > 0 && (
              <Preview rows={previewRows} />
            )}
          </div>
        </>
      )}

      {/* Result */}
      <div className={styles.card}>
        <div className={styles.inlineHeader}>
          <div className={styles.sectionTitle}>Результат</div>
          <span
            className={styles.badge}
            style={{ color: HTTP_METHOD_COLORS[request.httpMethod] }}
          >
            {request.httpMethod}
          </span>
        </div>

        <div className={styles.outputBlock}>
          <div className={styles.outputHeader}>
            <div className={styles.outputTitle}>Endpoint</div>
            <button
              className={`${styles.primaryBtn} ${copiedEndpoint ? styles.copiedBtn : ''}`}
              onClick={handleCopyEndpoint}
            >
              {copiedEndpoint ? 'Скопировано' : 'Скопировать URL'}
            </button>
          </div>
          <pre className={styles.pre}>{request.endpoint}</pre>
        </div>

        {bodyText && (
          <div className={styles.outputBlock}>
            <div className={styles.outputHeader}>
              <div className={styles.outputTitle}>Тело запроса</div>
              <button
                className={`${styles.primaryBtn} ${copiedBody ? styles.copiedBtn : ''}`}
                onClick={handleCopyBody}
              >
                {copiedBody ? 'Скопировано' : 'Скопировать body'}
              </button>
            </div>
            <pre className={styles.pre}>{bodyText}</pre>
          </div>
        )}

        {!bodyText && (
          <div className={styles.fieldHint} style={{ marginTop: 10 }}>
            Этот метод не требует тела запроса.
          </div>
        )}
      </div>
    </div>
  );
}
