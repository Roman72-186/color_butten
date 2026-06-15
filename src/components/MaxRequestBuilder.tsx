import { useState, useCallback, useMemo } from 'react';
import type { MaxButtonItem } from '../types/max';
import { MaxKeyboardSection } from './max-request-builder/MaxKeyboardSection';
import { TextMarkupHelp } from './request-builder/TextMarkupHelp';
import styles from '../styles/RequestBuilder.module.css';

type MaxMethod =
  | 'sendMessage'
  | 'editMessage'
  | 'deleteMessage'
  | 'getMessages'
  | 'getMessage'
  | 'getVideoInfo'
  | 'answerCallback'
  | 'getMe'
  | 'getChats'
  | 'getChatByLink'
  | 'getChat'
  | 'editChat'
  | 'deleteChat'
  | 'sendChatAction'
  | 'getPinnedMessage'
  | 'getMyChatMember'
  | 'getChatAdmins'
  | 'addChatAdmin'
  | 'removeChatAdmin'
  | 'getChatMembers'
  | 'getChatMember'
  | 'addChatMember'
  | 'kickChatMember'
  | 'leaveChat'
  | 'pinMessage'
  | 'unpinMessage'
  | 'getSubscriptions'
  | 'subscribeWebhook'
  | 'unsubscribeWebhook'
  | 'getUpdates'
  | 'getUploadUrl';

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
  format: '' | 'markdown' | 'html';
  images: MaxImageItem[];
  buttons: MaxButtonItem[];
  // message_id (editMessage / getMessage / pinMessage)
  messageId: string;
  // message_ids (getMessages)
  messageIds: string;
  // video token (getVideoInfo)
  videoToken: string;
  // callback_id (answerCallback)
  callbackId: string;
  // chat_id (most chat methods)
  chatId: string;
  // public channel link (getChatByLink)
  chatLink: string;
  // user_id (addChatMember / kickChatMember)
  userId: string;
  // sendChatAction
  chatAction: 'typing_on' | 'sending_photo' | 'sending_video' | 'sending_audio' | 'sending_file';
  // kickChatMember
  blockUser: boolean;
  // admins
  adminPermissions: string;
  adminAlias: string;
  // editChat
  chatTitle: string;
  // pagination (getChats / getChatMembers)
  count: string;
  marker: string;
  timeout: string;
  updateTypes: string;
  // subscriptions
  webhookUrl: string;
  webhookSecret: string;
  // upload
  uploadType: 'image' | 'video' | 'audio' | 'file';
  // pinMessage
  pinNotify: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

interface MaxMethodConfig {
  id: MaxMethod;
  label: string;
  description: string;
  category: 'messages' | 'chats' | 'bot' | 'subscriptions' | 'upload';
  httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
}

const MAX_METHODS: MaxMethodConfig[] = [
  { id: 'sendMessage',    label: 'Отправить сообщение',    description: 'Отправить сообщение пользователю или в чат/канал', category: 'messages', httpMethod: 'POST'   },
  { id: 'editMessage',    label: 'Редактировать сообщение', description: 'Редактировать отправленное сообщение',            category: 'messages', httpMethod: 'PUT'    },
  { id: 'deleteMessage',  label: 'Удалить сообщение',       description: 'Удалить сообщение по ID',                         category: 'messages', httpMethod: 'DELETE' },
  { id: 'getMessages',    label: 'Получить сообщения',      description: 'Получить массив сообщений по chat_id или message_ids', category: 'messages', httpMethod: 'GET' },
  { id: 'getMessage',     label: 'Получить сообщение',      description: 'Получить сообщение по ID',                        category: 'messages', httpMethod: 'GET'    },
  { id: 'getVideoInfo',   label: 'Информация о видео',      description: 'Получить URL и метаданные видео по video token',   category: 'messages', httpMethod: 'GET'    },
  { id: 'answerCallback', label: 'Ответ на callback',       description: 'Ответить на нажатие callback-кнопки',              category: 'messages', httpMethod: 'POST'   },
  { id: 'getMe',          label: 'Информация о боте',      description: 'Информация о боте и его настройки',               category: 'bot',      httpMethod: 'GET'    },
  { id: 'getChats',       label: 'Список чатов (deprecated)', description: 'GET /chats больше не поддерживается с июня 2026', category: 'chats',    httpMethod: 'GET'    },
  { id: 'getChatByLink',  label: 'Канал по ссылке',        description: 'Получить информацию о канале по публичной ссылке', category: 'chats',    httpMethod: 'GET'    },
  { id: 'getChat',        label: 'Информация о чате',      description: 'Информация о конкретном чате или канале',         category: 'chats',    httpMethod: 'GET'    },
  { id: 'editChat',       label: 'Изменить название чата', description: 'Изменить название чата',                          category: 'chats',    httpMethod: 'PATCH'  },
  { id: 'deleteChat',     label: 'Удалить чат',            description: 'Удалить групповой чат',                           category: 'chats',    httpMethod: 'DELETE' },
  { id: 'sendChatAction', label: 'Действие бота',          description: 'typing_on / sending_photo / sending_video и др.', category: 'chats',    httpMethod: 'POST'   },
  { id: 'getPinnedMessage', label: 'Закреплённое сообщение', description: 'Получить закреплённое сообщение',                category: 'chats',    httpMethod: 'GET'    },
  { id: 'getMyChatMember', label: 'Членство бота',         description: 'Информация о членстве бота в чате или канале',    category: 'chats',    httpMethod: 'GET'    },
  { id: 'getChatAdmins',  label: 'Администраторы',         description: 'Список администраторов чата или канала',          category: 'chats',    httpMethod: 'GET'    },
  { id: 'addChatAdmin',   label: 'Назначить администратора', description: 'Выдать права администратора пользователю или боту', category: 'chats', httpMethod: 'POST' },
  { id: 'removeChatAdmin', label: 'Снять администратора',  description: 'Отменить права администратора',                   category: 'chats',    httpMethod: 'DELETE' },
  { id: 'getChatMembers', label: 'Участники чата',         description: 'Список участников чата с пагинацией',             category: 'chats',    httpMethod: 'GET'    },
  { id: 'getChatMember',  label: 'Найти участника',        description: 'Проверить конкретного пользователя в чате',       category: 'chats',    httpMethod: 'GET'    },
  { id: 'addChatMember',  label: 'Добавить участника',     description: 'Добавить пользователя в чат',                    category: 'chats',    httpMethod: 'POST'   },
  { id: 'kickChatMember', label: 'Удалить из чата',        description: 'Удалить участника из чата',                      category: 'chats',    httpMethod: 'DELETE' },
  { id: 'leaveChat',      label: 'Покинуть чат',           description: 'Бот покидает чат',                               category: 'chats',    httpMethod: 'DELETE' },
  { id: 'pinMessage',     label: 'Закрепить сообщение',    description: 'Закрепить сообщение в чате или канале',          category: 'chats',    httpMethod: 'PUT'    },
  { id: 'unpinMessage',   label: 'Открепить сообщение',    description: 'Открепить закреплённое сообщение',               category: 'chats',    httpMethod: 'DELETE' },
  { id: 'getSubscriptions', label: 'Webhook подписки',      description: 'Получить все Webhook-подписки',                  category: 'subscriptions', httpMethod: 'GET' },
  { id: 'subscribeWebhook', label: 'Создать Webhook',       description: 'Подписаться на обновления через Webhook',        category: 'subscriptions', httpMethod: 'POST' },
  { id: 'unsubscribeWebhook', label: 'Удалить Webhook',     description: 'Отписаться от Webhook по URL',                   category: 'subscriptions', httpMethod: 'DELETE' },
  { id: 'getUpdates',     label: 'Long Polling',           description: 'Получить обновления для dev/test',               category: 'subscriptions', httpMethod: 'GET' },
  { id: 'getUploadUrl',   label: 'URL загрузки файла',     description: 'Получить URL для загрузки image/video/audio/file', category: 'upload', httpMethod: 'POST' },
];

const CATEGORY_LABELS: Record<string, string> = {
  messages: 'Сообщения',
  bot: 'Бот',
  chats: 'Чаты и каналы',
  subscriptions: 'Webhook / Long Polling',
  upload: 'Загрузка файлов',
};

const HTTP_METHOD_COLORS: Record<string, string> = {
  GET:    'var(--success)',
  POST:   'var(--accent)',
  PUT:    'var(--warning)',
  PATCH:  'var(--warning)',
  DELETE: 'var(--danger)',
};

const BASE_URL = 'https://platform-api.max.ru';

// ─── ID factory ──────────────────────────────────────────────────────────────

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `max_${Date.now()}_${idCounter}`;
}

// ─── Default state ───────────────────────────────────────────────────────────

function createDefaultButton(row: number, col: number): MaxButtonItem {
  return { id: nextId(), type: 'callback', text: '', payload: '', url: '', row, col };
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
    messageIds: '{{message_id}}',
    videoToken: '{{video_token}}',
    callbackId: '{{callback_id}}',
    chatId: '{{max_chat_id}}',
    chatLink: '@channel',
    userId: '{{max_id}}',
    chatAction: 'typing_on',
    blockUser: false,
    adminPermissions: 'read_all_messages, add_remove_members, add_admins, change_chat_info, pin_message, write',
    adminAlias: '',
    chatTitle: '',
    count: '50',
    marker: '',
    timeout: '30',
    updateTypes: 'message_created,message_callback',
    webhookUrl: 'https://example.com/webhook',
    webhookSecret: '',
    uploadType: 'file',
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
      row.slice().sort((a, b) => a.col - b.col).map(btn => {
        if (btn.type === 'link') return { type: btn.type, text: btn.text, url: btn.url };
        if (btn.type === 'open_app') {
          const button: Record<string, string> = { type: btn.type, text: btn.text, web_app: btn.url };
          if (btn.payload.trim()) button.payload = btn.payload;
          return button;
        }
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

function splitCsv(value: string): string[] {
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

function buildMessageBody(form: MaxFormState): Record<string, unknown> {
  const body: Record<string, unknown> = { text: form.text || 'text' };
  if (form.format) body.format = form.format;
  const att = buildMessageAttachments(form.images, form.buttons);
  if (att.length > 0) body.attachments = att;
  return body;
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
  const messageIds = splitCsv(form.messageIds || messageId);

  switch (form.method) {
    case 'sendMessage': {
      const query = form.targetType === 'user'
        ? `user_id=${form.targetId || '{{max_id}}'}`
        : `chat_id=${form.targetId || '{{max_chat_id}}'}`;
      return { httpMethod: 'POST', endpoint: `${BASE_URL}/messages?${query}`, body: buildMessageBody(form) };
    }
    case 'editMessage': {
      return { httpMethod: 'PUT', endpoint: `${BASE_URL}/messages?message_id=${messageId}`, body: buildMessageBody(form) };
    }
    case 'deleteMessage':
      return { httpMethod: 'DELETE', endpoint: `${BASE_URL}/messages?message_id=${messageId}`, body: null };
    case 'getMessages': {
      const params = new URLSearchParams();
      if (form.messageIds.trim()) {
        for (const id of messageIds) params.append('message_ids', id);
      } else {
        params.set('chat_id', chatId);
      }
      return { httpMethod: 'GET', endpoint: `${BASE_URL}/messages?${params.toString()}`, body: null };
    }
    case 'getMessage':
      return { httpMethod: 'GET', endpoint: `${BASE_URL}/messages/${messageId}`, body: null };
    case 'getVideoInfo':
      return { httpMethod: 'GET', endpoint: `${BASE_URL}/videos/${form.videoToken || '{{video_token}}'}`, body: null };
    case 'answerCallback':
      return { httpMethod: 'POST', endpoint: `${BASE_URL}/answers?callback_id=${form.callbackId || '{{callback_id}}'}`, body: { message: buildMessageBody(form) } };
    case 'getMe':
      return { httpMethod: 'GET', endpoint: `${BASE_URL}/me`, body: null };
    case 'getChats':
      return { httpMethod: 'GET', endpoint: `${BASE_URL}/chats?count=${form.count || '50'}`, body: null };
    case 'getChatByLink':
      return { httpMethod: 'GET', endpoint: `${BASE_URL}/chats/${encodeURIComponent(form.chatLink || '@channel')}`, body: null };
    case 'getChat':
      return { httpMethod: 'GET', endpoint: `${BASE_URL}/chats/${chatId}`, body: null };
    case 'editChat':
      return { httpMethod: 'PATCH', endpoint: `${BASE_URL}/chats/${chatId}`, body: { title: form.chatTitle || 'Новое название' } };
    case 'deleteChat':
      return { httpMethod: 'DELETE', endpoint: `${BASE_URL}/chats/${chatId}`, body: null };
    case 'sendChatAction':
      return { httpMethod: 'POST', endpoint: `${BASE_URL}/chats/${chatId}/actions`, body: { action: form.chatAction } };
    case 'getPinnedMessage':
      return { httpMethod: 'GET', endpoint: `${BASE_URL}/chats/${chatId}/pin`, body: null };
    case 'getMyChatMember':
      return { httpMethod: 'GET', endpoint: `${BASE_URL}/chats/${chatId}/members/me`, body: null };
    case 'getChatAdmins':
      return { httpMethod: 'GET', endpoint: `${BASE_URL}/chats/${chatId}/members/admins`, body: null };
    case 'addChatAdmin': {
      const admin: Record<string, unknown> = { user_id: userId, permissions: splitCsv(form.adminPermissions) };
      if (form.adminAlias.trim()) admin.alias = form.adminAlias.trim();
      return { httpMethod: 'POST', endpoint: `${BASE_URL}/chats/${chatId}/members/admins`, body: { admins: [admin] } };
    }
    case 'removeChatAdmin':
      return { httpMethod: 'DELETE', endpoint: `${BASE_URL}/chats/${chatId}/members/admins/${userId}`, body: null };
    case 'getChatMembers':
      return { httpMethod: 'GET', endpoint: `${BASE_URL}/chats/${chatId}/members?count=${form.count || '50'}`, body: null };
    case 'getChatMember':
      return { httpMethod: 'GET', endpoint: `${BASE_URL}/chats/${chatId}/members?user_ids=${userId}`, body: null };
    case 'addChatMember':
      return { httpMethod: 'POST', endpoint: `${BASE_URL}/chats/${chatId}/members`, body: { user_ids: [userId] } };
    case 'kickChatMember':
      return {
        httpMethod: 'DELETE',
        endpoint: `${BASE_URL}/chats/${chatId}/members?user_id=${userId}${form.blockUser ? '&block=true' : ''}`,
        body: null,
      };
    case 'leaveChat':
      return { httpMethod: 'DELETE', endpoint: `${BASE_URL}/chats/${chatId}/members/me`, body: null };
    case 'pinMessage': {
      const body: Record<string, unknown> = { message_id: messageId };
      if (form.pinNotify) body.notify = true;
      return { httpMethod: 'PUT', endpoint: `${BASE_URL}/chats/${chatId}/pin`, body };
    }
    case 'unpinMessage':
      return { httpMethod: 'DELETE', endpoint: `${BASE_URL}/chats/${chatId}/pin`, body: null };
    case 'getSubscriptions':
      return { httpMethod: 'GET', endpoint: `${BASE_URL}/subscriptions`, body: null };
    case 'subscribeWebhook': {
      const body: Record<string, unknown> = { url: form.webhookUrl || 'https://example.com/webhook' };
      const updateTypes = splitCsv(form.updateTypes);
      if (updateTypes.length > 0) body.update_types = updateTypes;
      if (form.webhookSecret.trim()) body.secret = form.webhookSecret.trim();
      return { httpMethod: 'POST', endpoint: `${BASE_URL}/subscriptions`, body };
    }
    case 'unsubscribeWebhook':
      return { httpMethod: 'DELETE', endpoint: `${BASE_URL}/subscriptions?url=${encodeURIComponent(form.webhookUrl || 'https://example.com/webhook')}`, body: null };
    case 'getUpdates': {
      const params = new URLSearchParams();
      params.set('limit', form.count || '50');
      params.set('timeout', form.timeout || '30');
      if (form.marker.trim()) params.set('marker', form.marker.trim());
      for (const type of splitCsv(form.updateTypes)) params.append('types', type);
      return { httpMethod: 'GET', endpoint: `${BASE_URL}/updates?${params.toString()}`, body: null };
    }
    case 'getUploadUrl':
      return { httpMethod: 'POST', endpoint: `${BASE_URL}/uploads?type=${form.uploadType}`, body: null };
  }
}

// ─── Field visibility helpers ────────────────────────────────────────────────

const NEEDS_TARGET   = new Set<MaxMethod>(['sendMessage']);
const NEEDS_MSG_BODY = new Set<MaxMethod>(['sendMessage', 'editMessage', 'answerCallback']);
const NEEDS_MSG_ID   = new Set<MaxMethod>(['editMessage', 'deleteMessage', 'getMessage', 'pinMessage']);
const NEEDS_MESSAGE_IDS = new Set<MaxMethod>(['getMessages']);
const NEEDS_VIDEO_TOKEN = new Set<MaxMethod>(['getVideoInfo']);
const NEEDS_CALLBACK_ID = new Set<MaxMethod>(['answerCallback']);
const NEEDS_CHAT_ID  = new Set<MaxMethod>(['getMessages', 'getChat', 'editChat', 'deleteChat', 'sendChatAction', 'getPinnedMessage', 'getMyChatMember', 'getChatAdmins', 'addChatAdmin', 'removeChatAdmin', 'getChatMembers', 'getChatMember', 'addChatMember', 'kickChatMember', 'leaveChat', 'pinMessage', 'unpinMessage']);
const NEEDS_CHAT_LINK = new Set<MaxMethod>(['getChatByLink']);
const NEEDS_USER_ID  = new Set<MaxMethod>(['getChatMember', 'addChatMember', 'kickChatMember', 'addChatAdmin', 'removeChatAdmin']);
const NEEDS_COUNT    = new Set<MaxMethod>(['getChats', 'getChatMembers']);
const NEEDS_TITLE    = new Set<MaxMethod>(['editChat']);
const NEEDS_CHAT_ACTION = new Set<MaxMethod>(['sendChatAction']);
const NEEDS_ADMIN_BODY = new Set<MaxMethod>(['addChatAdmin']);
const NEEDS_WEBHOOK = new Set<MaxMethod>(['subscribeWebhook', 'unsubscribeWebhook']);
const NEEDS_UPDATES = new Set<MaxMethod>(['getUpdates']);
const NEEDS_UPLOAD = new Set<MaxMethod>(['getUploadUrl']);
const NEEDS_PIN_OPT  = new Set<MaxMethod>(['pinMessage']);
const NEEDS_BLOCK_OPT = new Set<MaxMethod>(['kickChatMember']);

// ─── Component ───────────────────────────────────────────────────────────────

export function MaxRequestBuilder() {
  const [form, setForm] = useState<MaxFormState>(createDefaultForm);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [copiedBody, setCopiedBody]         = useState(false);

  const methodCfg    = useMemo(() => MAX_METHODS.find(m => m.id === form.method)!, [form.method]);
  const request      = useMemo(() => buildRequest(form), [form]);
  const bodyText     = useMemo(() => request.body ? JSON.stringify(request.body, null, 2) : null, [request]);

  function updateField<K extends keyof MaxFormState>(key: K, value: MaxFormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  const handleMethodChange = useCallback((method: MaxMethod) => {
    setForm(prev => ({ ...prev, method }));
  }, []);

  const toggleCell = useCallback((row: number, col: number) => {
    setForm(prev => {
      const exists = prev.buttons.find(b => b.row === row && b.col === col);
      if (exists) return { ...prev, buttons: prev.buttons.filter(b => !(b.row === row && b.col === col)) };
      return { ...prev, buttons: [...prev.buttons, createDefaultButton(row, col)] };
    });
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


  // Group methods by category for the select
  const categories = ['messages', 'bot', 'chats', 'subscriptions', 'upload'] as const;

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

      {/* message_ids */}
      {NEEDS_MESSAGE_IDS.has(form.method) && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Message IDs</div>
          <div className={styles.grid}>
            <div className={styles.fieldFull}>
              <label className={styles.label}>message_ids</label>
              <input
                type="text"
                value={form.messageIds}
                placeholder="{{message_id}}, {{message_id_2}}"
                onChange={e => updateField('messageIds', e.target.value)}
              />
              <div className={styles.fieldHint}>Если очистить поле, запрос будет построен по chat_id.</div>
            </div>
          </div>
        </div>
      )}

      {/* video_token */}
      {NEEDS_VIDEO_TOKEN.has(form.method) && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Video</div>
          <div className={styles.grid}>
            <div className={styles.fieldFull}>
              <label className={styles.label}>video_token</label>
              <input
                type="text"
                value={form.videoToken}
                placeholder="{{video_token}}"
                onChange={e => updateField('videoToken', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* callback_id */}
      {NEEDS_CALLBACK_ID.has(form.method) && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Callback</div>
          <div className={styles.grid}>
            <div className={styles.fieldFull}>
              <label className={styles.label}>callback_id</label>
              <input
                type="text"
                value={form.callbackId}
                placeholder="{{callback_id}}"
                onChange={e => updateField('callbackId', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* chat link */}
      {NEEDS_CHAT_LINK.has(form.method) && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Public link</div>
          <div className={styles.grid}>
            <div className={styles.fieldFull}>
              <label className={styles.label}>chatLink</label>
              <input
                type="text"
                value={form.chatLink}
                placeholder="@channel"
                onChange={e => updateField('chatLink', e.target.value)}
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

      {/* chat action */}
      {NEEDS_CHAT_ACTION.has(form.method) && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Action</div>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label className={styles.label}>action</label>
              <select
                value={form.chatAction}
                onChange={e => updateField('chatAction', e.target.value as MaxFormState['chatAction'])}
              >
                <option value="typing_on">typing_on</option>
                <option value="sending_photo">sending_photo</option>
                <option value="sending_video">sending_video</option>
                <option value="sending_audio">sending_audio</option>
                <option value="sending_file">sending_file</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* admin */}
      {NEEDS_ADMIN_BODY.has(form.method) && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Admin permissions</div>
          <div className={styles.grid}>
            <div className={styles.fieldFull}>
              <label className={styles.label}>permissions</label>
              <input
                type="text"
                value={form.adminPermissions}
                placeholder="read_all_messages, write"
                onChange={e => updateField('adminPermissions', e.target.value)}
              />
              <div className={styles.fieldHint}>Права через запятую.</div>
            </div>
            <div className={styles.fieldFull}>
              <label className={styles.label}>alias</label>
              <input
                type="text"
                value={form.adminAlias}
                placeholder="optional"
                onChange={e => updateField('adminAlias', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* webhook */}
      {NEEDS_WEBHOOK.has(form.method) && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Webhook</div>
          <div className={styles.grid}>
            <div className={styles.fieldFull}>
              <label className={styles.label}>url</label>
              <input
                type="text"
                value={form.webhookUrl}
                placeholder="https://example.com/webhook"
                onChange={e => updateField('webhookUrl', e.target.value)}
              />
            </div>
            {form.method === 'subscribeWebhook' && (
              <>
                <div className={styles.fieldFull}>
                  <label className={styles.label}>update_types</label>
                  <input
                    type="text"
                    value={form.updateTypes}
                    placeholder="message_created,message_callback"
                    onChange={e => updateField('updateTypes', e.target.value)}
                  />
                  <div className={styles.fieldHint}>Типы обновлений через запятую.</div>
                </div>
                <div className={styles.fieldFull}>
                  <label className={styles.label}>secret</label>
                  <input
                    type="text"
                    value={form.webhookSecret}
                    placeholder="optional"
                    onChange={e => updateField('webhookSecret', e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* long polling */}
      {NEEDS_UPDATES.has(form.method) && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Long Polling</div>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label className={styles.label}>limit</label>
              <input
                type="number"
                min={1}
                max={100}
                value={form.count}
                onChange={e => updateField('count', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>timeout</label>
              <input
                type="number"
                min={0}
                max={90}
                value={form.timeout}
                onChange={e => updateField('timeout', e.target.value)}
              />
            </div>
            <div className={styles.fieldFull}>
              <label className={styles.label}>marker</label>
              <input
                type="text"
                value={form.marker}
                placeholder="optional"
                onChange={e => updateField('marker', e.target.value)}
              />
            </div>
            <div className={styles.fieldFull}>
              <label className={styles.label}>types</label>
              <input
                type="text"
                value={form.updateTypes}
                placeholder="message_created,message_callback"
                onChange={e => updateField('updateTypes', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* upload */}
      {NEEDS_UPLOAD.has(form.method) && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Upload</div>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label className={styles.label}>type</label>
              <select
                value={form.uploadType}
                onChange={e => updateField('uploadType', e.target.value as MaxFormState['uploadType'])}
              >
                <option value="image">image</option>
                <option value="video">video</option>
                <option value="audio">audio</option>
                <option value="file">file</option>
              </select>
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
      {(NEEDS_PIN_OPT.has(form.method) || NEEDS_BLOCK_OPT.has(form.method)) && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Параметры</div>
          <div className={styles.grid}>
            {NEEDS_PIN_OPT.has(form.method) && (
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
            )}
            {NEEDS_BLOCK_OPT.has(form.method) && (
              <div className={styles.fieldFull}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={form.blockUser}
                    onChange={e => updateField('blockUser', e.target.checked)}
                  />
                  <span>block — заблокировать пользователя в чате, если чат с публичной или приватной ссылкой</span>
                </label>
              </div>
            )}
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
              <div className={styles.field}>
                <label className={styles.label}>format</label>
                <select
                  value={form.format}
                  onChange={e => updateField('format', e.target.value as MaxFormState['format'])}
                >
                  <option value="">Без format</option>
                  <option value="markdown">markdown</option>
                  <option value="html">html</option>
                </select>
                <div className={styles.fieldHint}>MAX поддерживает оба режима: markdown и html.</div>
              </div>
              <div className={styles.fieldFull}>
                <TextMarkupHelp platform="max" mode={form.format} />
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

          <MaxKeyboardSection
            buttons={form.buttons}
            onToggleCell={toggleCell}
            onUpdateButton={updateButton}
            onClearAll={() => setForm(prev => ({ ...prev, buttons: [] }))}
          />
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
