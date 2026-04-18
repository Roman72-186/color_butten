import { useState, useCallback, useMemo } from 'react';
import styles from './LeadtehRequestBuilder.module.css';

type LeadtehMethod =
  | 'getBotTags' | 'getContactTags' | 'attachTagToContact' | 'detachTagFromContact'
  | 'getContactVariables' | 'setContactVariable' | 'deleteContactVariable'
  | 'getListSchemas' | 'getListSchema' | 'createListSchema'
  | 'addListSchemaField' | 'deleteListSchemaField' | 'deleteListSchema'
  | 'getListItems' | 'addListItem' | 'updateListItem' | 'deleteListItem'
  | 'getContactAccounts' | 'addContactAccount' | 'deleteContactAccount'
  | 'addFundsToContactAccount' | 'withdrawFundsFromContactAccount'
  | 'getContactCryptoAccounts' | 'addContactCryptoAccount' | 'deleteContactCryptoAccount'
  | 'addFundsToContactCryptoAccount' | 'withdrawFundsFromContactCryptoAccount'
  | 'getReferrers' | 'getReferrals' | 'getCountReferrals'
  | 'decodeShortLink';

type LeadtehCategory = 'tags' | 'variables' | 'schemas' | 'items' | 'accounts' | 'crypto' | 'referrals' | 'media';

interface LeadtehMethodConfig {
  id: LeadtehMethod;
  label: string;
  description: string;
  category: LeadtehCategory;
  httpMethod: 'GET' | 'POST';
}

interface LeadtehFormState {
  method: LeadtehMethod;
  contactId: string;
  botId: string;
  accountId: string;
  schemaId: string;
  itemId: string;
  tagId: string;
  tagName: string;
  varName: string;
  varValue: string;
  varId: string;
  varDeletable: '0' | '1';
  currency: string;
  amount: string;
  description: string;
  depth: string;
  isFlat: boolean;
  url: string;
  isMenu: boolean;
  schemaName: string;
  orderBy: string;
  page: string;
  fieldJson: string;
  filtersJson: string;
  dataJson: string;
}

interface LeadtehBuildResult {
  httpMethod: 'GET' | 'POST';
  endpoint: string;
  headers: Record<string, string>;
  body: Record<string, unknown> | null;
}

const BASE_URL = 'https://app.leadteh.ru/api/v1';

const CATEGORY_LABELS: Record<LeadtehCategory, string> = {
  tags: 'Теги',
  variables: 'Переменные',
  schemas: 'Схемы списков',
  items: 'Элементы списков',
  accounts: 'Счета',
  crypto: 'Свободные счета',
  referrals: 'Реферальная система',
  media: 'Медиафайлы',
};

const LT_METHODS: LeadtehMethodConfig[] = [
  { id: 'getBotTags', label: 'getBotTags', description: 'Получить теги бота', category: 'tags', httpMethod: 'GET' },
  { id: 'getContactTags', label: 'getContactTags', description: 'Получить теги контакта', category: 'tags', httpMethod: 'GET' },
  { id: 'attachTagToContact', label: 'attachTagToContact', description: 'Добавить тег контакту', category: 'tags', httpMethod: 'POST' },
  { id: 'detachTagFromContact', label: 'detachTagFromContact', description: 'Удалить тег у контакта', category: 'tags', httpMethod: 'POST' },
  { id: 'getContactVariables', label: 'getContactVariables', description: 'Получить переменные контакта', category: 'variables', httpMethod: 'GET' },
  { id: 'setContactVariable', label: 'setContactVariable', description: 'Создать/обновить переменную', category: 'variables', httpMethod: 'POST' },
  { id: 'deleteContactVariable', label: 'deleteContactVariable', description: 'Удалить переменную', category: 'variables', httpMethod: 'POST' },
  { id: 'getListSchemas', label: 'getListSchemas', description: 'Получить все схемы списков', category: 'schemas', httpMethod: 'GET' },
  { id: 'getListSchema', label: 'getListSchema', description: 'Получить схему по ID', category: 'schemas', httpMethod: 'GET' },
  { id: 'createListSchema', label: 'createListSchema', description: 'Создать схему списка', category: 'schemas', httpMethod: 'POST' },
  { id: 'addListSchemaField', label: 'addListSchemaField', description: 'Добавить поле в схему', category: 'schemas', httpMethod: 'POST' },
  { id: 'deleteListSchemaField', label: 'deleteListSchemaField', description: 'Удалить поле схемы', category: 'schemas', httpMethod: 'POST' },
  { id: 'deleteListSchema', label: 'deleteListSchema', description: 'Удалить схему', category: 'schemas', httpMethod: 'POST' },
  { id: 'getListItems', label: 'getListItems', description: 'Получить элементы списка', category: 'items', httpMethod: 'POST' },
  { id: 'addListItem', label: 'addListItem', description: 'Добавить элемент в список', category: 'items', httpMethod: 'POST' },
  { id: 'updateListItem', label: 'updateListItem', description: 'Обновить элемент', category: 'items', httpMethod: 'POST' },
  { id: 'deleteListItem', label: 'deleteListItem', description: 'Удалить элемент', category: 'items', httpMethod: 'POST' },
  { id: 'getContactAccounts', label: 'getContactAccounts', description: 'Получить счета контакта', category: 'accounts', httpMethod: 'GET' },
  { id: 'addContactAccount', label: 'addContactAccount', description: 'Создать счёт', category: 'accounts', httpMethod: 'POST' },
  { id: 'deleteContactAccount', label: 'deleteContactAccount', description: 'Удалить счёт', category: 'accounts', httpMethod: 'POST' },
  { id: 'addFundsToContactAccount', label: 'addFundsToContactAccount', description: 'Пополнить счёт', category: 'accounts', httpMethod: 'POST' },
  { id: 'withdrawFundsFromContactAccount', label: 'withdrawFundsFromContactAccount', description: 'Списать со счёта', category: 'accounts', httpMethod: 'POST' },
  { id: 'getContactCryptoAccounts', label: 'getContactCryptoAccounts', description: 'Получить крипто-счета', category: 'crypto', httpMethod: 'GET' },
  { id: 'addContactCryptoAccount', label: 'addContactCryptoAccount', description: 'Создать крипто-счёт', category: 'crypto', httpMethod: 'POST' },
  { id: 'deleteContactCryptoAccount', label: 'deleteContactCryptoAccount', description: 'Удалить крипто-счёт', category: 'crypto', httpMethod: 'POST' },
  { id: 'addFundsToContactCryptoAccount', label: 'addFundsToContactCryptoAccount', description: 'Пополнить крипто-счёт', category: 'crypto', httpMethod: 'POST' },
  { id: 'withdrawFundsFromContactCryptoAccount', label: 'withdrawFundsFromContactCryptoAccount', description: 'Списать с крипто-счёта', category: 'crypto', httpMethod: 'POST' },
  { id: 'getReferrers', label: 'getReferrers', description: 'Получить реферреров контакта', category: 'referrals', httpMethod: 'GET' },
  { id: 'getReferrals', label: 'getReferrals', description: 'Получить рефералов контакта', category: 'referrals', httpMethod: 'POST' },
  { id: 'getCountReferrals', label: 'getCountReferrals', description: 'Кол-во рефералов в сети', category: 'referrals', httpMethod: 'POST' },
  { id: 'decodeShortLink', label: 'decodeShortLink', description: 'Декодировать короткую ссылку', category: 'media', httpMethod: 'POST' },
];

const NEEDS_CONTACT_ID = new Set<LeadtehMethod>(['getContactTags','attachTagToContact','detachTagFromContact','getContactVariables','setContactVariable','deleteContactVariable','getContactAccounts','addContactAccount','getContactCryptoAccounts','addContactCryptoAccount','getReferrers','getReferrals','getCountReferrals']);
const NEEDS_BOT_ID = new Set<LeadtehMethod>(['getBotTags']);
const NEEDS_ACCOUNT_ID = new Set<LeadtehMethod>(['deleteContactAccount','addFundsToContactAccount','withdrawFundsFromContactAccount','deleteContactCryptoAccount','addFundsToContactCryptoAccount','withdrawFundsFromContactCryptoAccount']);
const NEEDS_SCHEMA_ID = new Set<LeadtehMethod>(['getListSchema','addListSchemaField','deleteListSchemaField','deleteListSchema','getListItems','addListItem']);
const NEEDS_ITEM_ID = new Set<LeadtehMethod>(['updateListItem','deleteListItem']);
const NEEDS_TAG = new Set<LeadtehMethod>(['attachTagToContact','detachTagFromContact']);
const NEEDS_VAR_NAME = new Set<LeadtehMethod>(['setContactVariable','deleteContactVariable','deleteListSchemaField']);
const NEEDS_VAR_VALUE = new Set<LeadtehMethod>(['setContactVariable']);
const NEEDS_VAR_ID = new Set<LeadtehMethod>(['deleteContactVariable']);
const NEEDS_VAR_DELETABLE = new Set<LeadtehMethod>(['setContactVariable']);
const NEEDS_CURRENCY = new Set<LeadtehMethod>(['addContactAccount','addContactCryptoAccount']);
const NEEDS_AMOUNT = new Set<LeadtehMethod>(['addFundsToContactAccount','withdrawFundsFromContactAccount','addFundsToContactCryptoAccount','withdrawFundsFromContactCryptoAccount']);
const NEEDS_DESCRIPTION = new Set<LeadtehMethod>(['addFundsToContactAccount','withdrawFundsFromContactAccount','addFundsToContactCryptoAccount','withdrawFundsFromContactCryptoAccount']);
const NEEDS_DEPTH = new Set<LeadtehMethod>(['getReferrers']);
const NEEDS_IS_FLAT = new Set<LeadtehMethod>(['getReferrers']);
const NEEDS_FILTERS_JSON = new Set<LeadtehMethod>(['getListItems','getReferrals','getCountReferrals']);
const NEEDS_DATA_JSON = new Set<LeadtehMethod>(['addListItem','updateListItem']);
const NEEDS_FIELD_JSON = new Set<LeadtehMethod>(['addListSchemaField','createListSchema']);
const NEEDS_URL = new Set<LeadtehMethod>(['decodeShortLink']);
const NEEDS_IS_MENU = new Set<LeadtehMethod>(['createListSchema']);
const NEEDS_SCHEMA_NAME = new Set<LeadtehMethod>(['createListSchema']);
const NEEDS_ORDER_BY = new Set<LeadtehMethod>(['getListItems']);
const NEEDS_PAGE = new Set<LeadtehMethod>(['getListItems','getReferrals']);

const METHOD_WARNINGS: Partial<Record<LeadtehMethod, string>> = {
  getListItems: 'Фильтры дат принимают Unix timestamp (число секунд), не строку даты.',
  getListSchema: 'schema_id — это UUID из кабинета Leadteh, не название схемы.',
  addListItem: 'schema_id — это UUID из кабинета Leadteh, не название схемы.',
  decodeShortLink: 'Метод вернёт URL вида storage.leadteh.ru/... Внешние сервисы (OpenAI, Telegram API) не могут использовать короткую ссылку напрямую — передавайте декодированный URL.',
};

const HTTP_METHOD_COLORS: Record<string, string> = {
  GET: 'var(--success)',
  POST: 'var(--accent)',
};

function tryParseJson(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

function buildRequest(form: LeadtehFormState): LeadtehBuildResult {
  const method = form.method;
  const httpMethod = LT_METHODS.find(m => m.id === method)!.httpMethod;
  const contactId = form.contactId.trim() || '{{contact_id}}';
  const botId = form.botId.trim() || '{{bot_id}}';

  let endpoint = `${BASE_URL}/${method}?api_token={{token_LT}}`;
  let body: Record<string, unknown> | null = null;

  if (httpMethod === 'GET') {
    if (method === 'getBotTags') {
      endpoint += `&bot_id=${botId}`;
    } else if (method === 'getContactTags' || method === 'getContactVariables' || method === 'getContactAccounts' || method === 'getContactCryptoAccounts') {
      endpoint += `&contact_id=${contactId}`;
    } else if (method === 'getListSchema') {
      if (form.schemaId.trim()) endpoint += `&schema_id=${form.schemaId.trim()}`;
    } else if (method === 'getReferrers') {
      endpoint += `&contact_id=${contactId}`;
      if (form.depth.trim()) endpoint += `&depth=${form.depth.trim()}`;
      if (form.isFlat) endpoint += `&is_flat=1`;
    }
  } else {
    body = {};

    if (method === 'attachTagToContact' || method === 'detachTagFromContact') {
      body.contact_id = contactId;
      if (form.tagId.trim()) body.tag_id = form.tagId.trim();
      if (form.tagName.trim()) body.name = form.tagName.trim();
    } else if (method === 'setContactVariable') {
      body.contact_id = contactId;
      if (form.varName.trim()) body.name = form.varName.trim();
      if (form.varValue.trim()) body.value = form.varValue.trim();
      body.deletable = parseInt(form.varDeletable);
    } else if (method === 'deleteContactVariable') {
      body.contact_id = contactId;
      if (form.varId.trim()) body.id = parseInt(form.varId.trim());
      if (form.varName.trim()) body.name = form.varName.trim();
    } else if (method === 'createListSchema') {
      body.is_menu = form.isMenu;
      if (form.schemaName.trim()) body.name = form.schemaName.trim();
      const fieldsParsed = tryParseJson(form.fieldJson);
      if (fieldsParsed !== undefined) body.fields = fieldsParsed;
    } else if (method === 'addListSchemaField') {
      if (form.schemaId.trim()) body.schema_id = form.schemaId.trim();
      const fieldParsed = tryParseJson(form.fieldJson);
      if (fieldParsed !== undefined) body.field = fieldParsed;
    } else if (method === 'deleteListSchemaField') {
      if (form.schemaId.trim()) body.schema_id = form.schemaId.trim();
      if (form.varName.trim()) body.slug = form.varName.trim();
    } else if (method === 'deleteListSchema') {
      if (form.schemaId.trim()) body.schema_id = form.schemaId.trim();
    } else if (method === 'getListItems') {
      if (form.schemaId.trim()) body.schema_id = form.schemaId.trim();
      if (form.orderBy.trim()) body.order_by = form.orderBy.trim();
      if (form.page.trim()) body.page = parseInt(form.page.trim());
      const filtersParsed = tryParseJson(form.filtersJson);
      if (filtersParsed !== undefined) body.filters = filtersParsed;
    } else if (method === 'addListItem') {
      if (form.schemaId.trim()) body.schema_id = form.schemaId.trim();
      const dataParsed = tryParseJson(form.dataJson);
      if (dataParsed !== undefined) body.data = dataParsed;
    } else if (method === 'updateListItem') {
      if (form.itemId.trim()) body.item_id = form.itemId.trim();
      const dataParsed = tryParseJson(form.dataJson);
      if (dataParsed !== undefined) body.data = dataParsed;
    } else if (method === 'deleteListItem') {
      if (form.itemId.trim()) body.item_id = form.itemId.trim();
    } else if (method === 'addContactAccount' || method === 'addContactCryptoAccount') {
      body.contact_id = contactId;
      if (form.currency.trim()) body.currency = form.currency.trim();
    } else if (method === 'deleteContactAccount') {
      if (form.accountId.trim()) body.account_id = parseInt(form.accountId.trim());
    } else if (method === 'addFundsToContactAccount' || method === 'withdrawFundsFromContactAccount') {
      if (form.accountId.trim()) body.account_id = form.accountId.trim();
      if (form.amount.trim()) body.amount = form.amount.trim();
      if (form.description.trim()) body.description = form.description.trim();
    } else if (method === 'deleteContactCryptoAccount') {
      if (form.accountId.trim()) body.account_id = parseInt(form.accountId.trim());
    } else if (method === 'addFundsToContactCryptoAccount' || method === 'withdrawFundsFromContactCryptoAccount') {
      if (form.accountId.trim()) body.account_id = parseInt(form.accountId.trim());
      if (form.amount.trim()) body.amount = parseFloat(form.amount.trim());
      if (form.description.trim()) body.description = form.description.trim();
    } else if (method === 'getReferrals' || method === 'getCountReferrals') {
      body.contact_id = contactId;
      const filtersParsed = tryParseJson(form.filtersJson);
      if (filtersParsed !== undefined) body.filters = filtersParsed;
      if (method === 'getReferrals' && form.page.trim()) body.page = parseInt(form.page.trim());
    } else if (method === 'decodeShortLink') {
      if (form.url.trim()) body.url = form.url.trim();
    }
  }

  const headers: Record<string, string> = { 'X-Requested-With': 'XMLHttpRequest' };
  if (httpMethod === 'POST') {
    headers['Content-Type'] = 'application/json';
  }

  return { httpMethod, endpoint, headers, body };
}

function createDefaultForm(): LeadtehFormState {
  return {
    method: 'getBotTags',
    contactId: '',
    botId: '',
    accountId: '',
    schemaId: '',
    itemId: '',
    tagId: '',
    tagName: '',
    varName: '',
    varValue: '',
    varId: '',
    varDeletable: '1',
    currency: '',
    amount: '',
    description: '',
    depth: '1',
    isFlat: false,
    url: '',
    isMenu: false,
    schemaName: '',
    orderBy: '',
    page: '',
    fieldJson: '',
    filtersJson: '',
    dataJson: '',
  };
}

export function LeadtehRequestBuilder() {
  const [form, setForm] = useState<LeadtehFormState>(createDefaultForm);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);

  const methodCfg = useMemo(() => LT_METHODS.find(m => m.id === form.method)!, [form.method]);
  const request = useMemo(() => buildRequest(form), [form]);
  const bodyText = useMemo(() => request.body ? JSON.stringify(request.body, null, 2) : null, [request]);

  function updateField<K extends keyof LeadtehFormState>(key: K, value: LeadtehFormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  const handleMethodChange = useCallback((method: LeadtehMethod) => {
    setForm(prev => ({ ...prev, method }));
  }, []);

  const handleCopyEndpoint = useCallback(() => {
    navigator.clipboard.writeText(request.endpoint).then(() => {
      setCopiedEndpoint(true);
      setTimeout(() => setCopiedEndpoint(false), 2000);
    }).catch(() => undefined);
  }, [request.endpoint]);

  const handleCopyBody = useCallback(() => {
    if (!bodyText) return;
    navigator.clipboard.writeText(bodyText).then(() => {
      setCopiedBody(true);
      setTimeout(() => setCopiedBody(false), 2000);
    }).catch(() => undefined);
  }, [bodyText]);

  const handleReset = useCallback(() => {
    setForm(createDefaultForm());
    setCopiedEndpoint(false);
    setCopiedBody(false);
  }, []);

  const categories: LeadtehCategory[] = ['tags', 'variables', 'schemas', 'items', 'accounts', 'crypto', 'referrals', 'media'];

  return (
    <div className={styles.builder}>
      <div className={styles.notice}>
        <div className={styles.noticeTitle}>LEADTEH API</div>
        <div className={styles.noticeText}>
          <code className={styles.inlineCode}>{'{{token_LT}}'}</code> и <code className={styles.inlineCode}>{'{{bot_id}}'}</code> — глобальные переменные в личном кабинете Leadteh (Настройки → API).
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.inlineHeader}>
          <div>
            <div className={styles.sectionTitle}>Метод</div>
            <div className={styles.sectionText}>{methodCfg.description}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={styles.badge} style={{ color: HTTP_METHOD_COLORS[methodCfg.httpMethod] }}>
              {methodCfg.httpMethod}
            </span>
            <button className={styles.secondaryBtn} onClick={handleReset}>Сбросить</button>
          </div>
        </div>

        <div className={styles.grid}>
          <div className={styles.fieldFull}>
            <label className={styles.label}>Метод</label>
            <select value={form.method} onChange={e => handleMethodChange(e.target.value as LeadtehMethod)}>
              {categories.map(cat => {
                const methods = LT_METHODS.filter(m => m.category === cat);
                return (
                  <optgroup key={cat} label={CATEGORY_LABELS[cat]}>
                    {methods.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.label} — {m.description}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {NEEDS_CONTACT_ID.has(form.method) && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Контакт</div>
          <div className={styles.grid}>
            <div className={styles.fieldFull}>
              <label className={styles.label}>contact_id</label>
              <input
                type="text"
                value={form.contactId}
                placeholder="{{contact_id}}"
                onChange={e => updateField('contactId', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {NEEDS_BOT_ID.has(form.method) && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Бот</div>
          <div className={styles.grid}>
            <div className={styles.fieldFull}>
              <label className={styles.label}>bot_id</label>
              <input
                type="text"
                value={form.botId}
                placeholder="{{bot_id}}"
                onChange={e => updateField('botId', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {NEEDS_ACCOUNT_ID.has(form.method) && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Счёт</div>
          <div className={styles.grid}>
            <div className={styles.fieldFull}>
              <label className={styles.label}>account_id</label>
              <input
                type="text"
                value={form.accountId}
                placeholder="123"
                onChange={e => updateField('accountId', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {NEEDS_SCHEMA_ID.has(form.method) && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Схема списка</div>
          <div className={styles.grid}>
            <div className={styles.fieldFull}>
              <label className={styles.label}>schema_id</label>
              <input
                type="text"
                value={form.schemaId}
                placeholder="UUID схемы"
                onChange={e => updateField('schemaId', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {NEEDS_ITEM_ID.has(form.method) && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Элемент списка</div>
          <div className={styles.grid}>
            <div className={styles.fieldFull}>
              <label className={styles.label}>item_id</label>
              <input
                type="text"
                value={form.itemId}
                placeholder="ID элемента"
                onChange={e => updateField('itemId', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {NEEDS_TAG.has(form.method) && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Тег</div>
          <div className={styles.sectionText}>Укажите tag_id или name (одно из двух).</div>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label className={styles.label}>tag_id</label>
              <input
                type="text"
                value={form.tagId}
                placeholder="ID тега"
                onChange={e => updateField('tagId', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>name</label>
              <input
                type="text"
                value={form.tagName}
                placeholder="Название тега"
                onChange={e => updateField('tagName', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {(NEEDS_VAR_NAME.has(form.method) || NEEDS_VAR_VALUE.has(form.method) || NEEDS_VAR_ID.has(form.method) || NEEDS_VAR_DELETABLE.has(form.method)) && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Переменная</div>
          <div className={styles.grid}>
            {(NEEDS_VAR_NAME.has(form.method) && form.method !== 'deleteListSchemaField') && (
              <div className={styles.field}>
                <label className={styles.label}>{form.method === 'deleteContactVariable' ? 'name (или var_id)' : 'name'}</label>
                <input
                  type="text"
                  value={form.varName}
                  placeholder="Название переменной"
                  onChange={e => updateField('varName', e.target.value)}
                />
              </div>
            )}
            {NEEDS_VAR_VALUE.has(form.method) && (
              <div className={styles.field}>
                <label className={styles.label}>value</label>
                <input
                  type="text"
                  value={form.varValue}
                  placeholder="Значение"
                  onChange={e => updateField('varValue', e.target.value)}
                />
              </div>
            )}
            {NEEDS_VAR_ID.has(form.method) && (
              <div className={styles.field}>
                <label className={styles.label}>var_id (или name)</label>
                <input
                  type="text"
                  value={form.varId}
                  placeholder="ID переменной"
                  onChange={e => updateField('varId', e.target.value)}
                />
              </div>
            )}
            {NEEDS_VAR_DELETABLE.has(form.method) && (
              <div className={styles.field}>
                <label className={styles.label}>deletable</label>
                <select value={form.varDeletable} onChange={e => updateField('varDeletable', e.target.value as '0' | '1')}>
                  <option value="1">1 — удаляемая</option>
                  <option value="0">0 — неудаляемая</option>
                </select>
              </div>
            )}
            {form.method === 'deleteListSchemaField' && (
              <div className={styles.fieldFull}>
                <label className={styles.label}>slug поля</label>
                <input
                  type="text"
                  value={form.varName}
                  placeholder="slug поля"
                  onChange={e => updateField('varName', e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {(NEEDS_CURRENCY.has(form.method) || NEEDS_AMOUNT.has(form.method) || NEEDS_DESCRIPTION.has(form.method)) && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Счёт</div>
          <div className={styles.grid}>
            {NEEDS_CURRENCY.has(form.method) && (
              <div className={styles.field}>
                <label className={styles.label}>currency</label>
                <input
                  type="text"
                  value={form.currency}
                  placeholder="RUB / BTC"
                  onChange={e => updateField('currency', e.target.value)}
                />
              </div>
            )}
            {NEEDS_AMOUNT.has(form.method) && (
              <div className={styles.field}>
                <label className={styles.label}>amount</label>
                <input
                  type="text"
                  value={form.amount}
                  placeholder="100.50"
                  onChange={e => updateField('amount', e.target.value)}
                />
              </div>
            )}
            {NEEDS_DESCRIPTION.has(form.method) && (
              <div className={styles.fieldFull}>
                <label className={styles.label}>description</label>
                <input
                  type="text"
                  value={form.description}
                  placeholder="Описание операции"
                  onChange={e => updateField('description', e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {(NEEDS_DEPTH.has(form.method) || NEEDS_IS_FLAT.has(form.method)) && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Рефералы</div>
          <div className={styles.grid}>
            {NEEDS_DEPTH.has(form.method) && (
              <div className={styles.field}>
                <label className={styles.label}>depth</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={form.depth}
                  onChange={e => updateField('depth', e.target.value)}
                />
                <div className={styles.fieldHint}>Глубина (1-10).</div>
              </div>
            )}
            {NEEDS_IS_FLAT.has(form.method) && (
              <div className={styles.field}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={form.isFlat}
                    onChange={e => updateField('isFlat', e.target.checked)}
                  />
                  <span>is_flat — плоский список</span>
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {NEEDS_URL.has(form.method) && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Ссылка</div>
          <div className={styles.grid}>
            <div className={styles.fieldFull}>
              <label className={styles.label}>url</label>
              <input
                type="text"
                value={form.url}
                placeholder="https://s.leadteh.ru/abc123"
                onChange={e => updateField('url', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {(NEEDS_IS_MENU.has(form.method) || NEEDS_SCHEMA_NAME.has(form.method)) && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Схема</div>
          <div className={styles.grid}>
            {NEEDS_SCHEMA_NAME.has(form.method) && (
              <div className={styles.fieldFull}>
                <label className={styles.label}>name</label>
                <input
                  type="text"
                  value={form.schemaName}
                  placeholder="Название схемы"
                  onChange={e => updateField('schemaName', e.target.value)}
                />
              </div>
            )}
            {NEEDS_IS_MENU.has(form.method) && (
              <div className={styles.fieldFull}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={form.isMenu}
                    onChange={e => updateField('isMenu', e.target.checked)}
                  />
                  <span>is_menu — схема для меню</span>
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {(NEEDS_ORDER_BY.has(form.method) || NEEDS_PAGE.has(form.method)) && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Пагинация</div>
          <div className={styles.grid}>
            {NEEDS_ORDER_BY.has(form.method) && (
              <div className={styles.field}>
                <label className={styles.label}>order_by</label>
                <input
                  type="text"
                  value={form.orderBy}
                  placeholder="created_at,desc"
                  onChange={e => updateField('orderBy', e.target.value)}
                />
              </div>
            )}
            {NEEDS_PAGE.has(form.method) && (
              <div className={styles.field}>
                <label className={styles.label}>page</label>
                <input
                  type="number"
                  min={1}
                  value={form.page}
                  onChange={e => updateField('page', e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {NEEDS_FIELD_JSON.has(form.method) && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Поле схемы</div>
          <div className={styles.grid}>
            <div className={styles.fieldFull}>
              <label className={styles.label}>field / fields (JSON)</label>
              <textarea
                className={styles.textarea}
                rows={6}
                value={form.fieldJson}
                placeholder={form.method === 'createListSchema' ? '[{"label":"Название","slug":"title","type":"string"}]' : '{"label":"Название","slug":"title","type":"string"}'}
                onChange={e => updateField('fieldJson', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {NEEDS_FILTERS_JSON.has(form.method) && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Фильтры</div>
          <div className={styles.grid}>
            <div className={styles.fieldFull}>
              <label className={styles.label}>filters (JSON)</label>
              <textarea
                className={styles.textarea}
                rows={4}
                value={form.filtersJson}
                placeholder='{"field_name":"value"}'
                onChange={e => updateField('filtersJson', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {NEEDS_DATA_JSON.has(form.method) && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Данные элемента</div>
          <div className={styles.grid}>
            <div className={styles.fieldFull}>
              <label className={styles.label}>data (JSON)</label>
              <textarea
                className={styles.textarea}
                rows={4}
                value={form.dataJson}
                placeholder='{"field_slug":"value"}'
                onChange={e => updateField('dataJson', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.inlineHeader}>
          <div className={styles.sectionTitle}>Результат</div>
          <span className={styles.badge} style={{ color: HTTP_METHOD_COLORS[request.httpMethod] }}>
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

        <div className={styles.outputBlock}>
          <div className={styles.outputHeader}>
            <div className={styles.outputTitle}>Headers</div>
          </div>
          <pre className={styles.pre}>{JSON.stringify(request.headers, null, 2)}</pre>
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

        {METHOD_WARNINGS[form.method] && (
          <div className={styles.warningBox} style={{ marginTop: 14 }}>
            <div className={styles.boxTitle}>Внимание</div>
            <div className={styles.noticeText} style={{ marginTop: 8 }}>
              {METHOD_WARNINGS[form.method]}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
