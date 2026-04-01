import { useState, useCallback, useMemo } from 'react';
import styles from '../styles/RequestBuilder.module.css';

type MaxButtonType = 'callback' | 'message' | 'link' | 'request_contact' | 'request_geo_location';

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
  targetType: 'user' | 'chat';
  targetId: string;
  text: string;
  format: '' | 'markdown';
  images: MaxImageItem[];
  buttons: MaxButtonItem[];
}

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `max_${Date.now()}_${idCounter}`;
}

function createDefaultButton(row: number): MaxButtonItem {
  return { id: nextId(), type: 'callback', text: '', payload: '', url: '', row };
}

function createDefaultImage(): MaxImageItem {
  return { id: nextId(), url: '' };
}

function createDefaultForm(): MaxFormState {
  return {
    targetType: 'user',
    targetId: '{{max_id}}',
    text: '',
    format: '',
    images: [],
    buttons: [],
  };
}

const MAX_BUTTON_TYPES: { value: MaxButtonType; label: string }[] = [
  { value: 'callback',              label: 'Callback' },
  { value: 'message',               label: 'Message (команда)' },
  { value: 'link',                  label: 'Link (ссылка)' },
  { value: 'request_contact',       label: 'Request Contact' },
  { value: 'request_geo_location',  label: 'Request Geo' },
];

function buildBody(form: MaxFormState): object {
  const attachments: object[] = [];

  for (const img of form.images) {
    if (img.url.trim()) {
      attachments.push({ type: 'image', payload: { url: img.url.trim() } });
    }
  }

  if (form.buttons.length > 0) {
    const rowMap = new Map<number, MaxButtonItem[]>();
    for (const btn of form.buttons) {
      const row = rowMap.get(btn.row) ?? [];
      row.push(btn);
      rowMap.set(btn.row, row);
    }
    const buttonRows = Array.from(rowMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([, row]) =>
        row.map(btn => {
          if (btn.type === 'link') {
            return { type: btn.type, text: btn.text, url: btn.url };
          }
          if (btn.type === 'request_contact' || btn.type === 'request_geo_location') {
            return { type: btn.type, text: btn.text };
          }
          return { type: btn.type, text: btn.text, payload: btn.payload };
        })
      );

    attachments.push({
      type: 'inline_keyboard',
      payload: { buttons: buttonRows },
    });
  }

  const body: Record<string, unknown> = { text: form.text || 'text' };
  if (form.format) body.format = form.format;
  if (attachments.length > 0) body.attachments = attachments;

  return body;
}

export function MaxRequestBuilder() {
  const [form, setForm] = useState<MaxFormState>(createDefaultForm);
  const [copied, setCopied] = useState(false);

  const endpoint = `https://platform-api.max.ru/messages?${form.targetType}_id=${form.targetId || (form.targetType === 'user' ? '{{max_id}}' : '{{max_chat_id}}')}` ;
  const bodyPreview = useMemo(() => JSON.stringify(buildBody(form), null, 2), [form]);

  const maxRow = form.buttons.reduce((m, b) => Math.max(m, b.row), 0);

  function updateField<K extends keyof MaxFormState>(key: K, value: MaxFormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  const addButton = useCallback(() => {
    setForm(prev => ({ ...prev, buttons: [...prev.buttons, createDefaultButton(maxRow + 1)] }));
  }, [maxRow]);

  const removeButton = useCallback((id: string) => {
    setForm(prev => ({ ...prev, buttons: prev.buttons.filter(b => b.id !== id) }));
  }, []);

  const updateButton = useCallback((id: string, patch: Partial<MaxButtonItem>) => {
    setForm(prev => ({
      ...prev,
      buttons: prev.buttons.map(b => b.id === id ? { ...b, ...patch } : b),
    }));
  }, []);

  const addImage = useCallback(() => {
    setForm(prev => ({ ...prev, images: [...prev.images, createDefaultImage()] }));
  }, []);

  const removeImage = useCallback((id: string) => {
    setForm(prev => ({ ...prev, images: prev.images.filter(i => i.id !== id) }));
  }, []);

  const updateImage = useCallback((id: string, url: string) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.map(i => i.id === id ? { ...i, url } : i),
    }));
  }, []);

  const handleCopy = useCallback(() => {
    try {
      navigator.clipboard.writeText(bodyPreview).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      });
    } catch {
      // clipboard not available
    }
  }, [bodyPreview]);

  const handleReset = useCallback(() => {
    setForm(createDefaultForm());
    setCopied(false);
  }, []);

  const usedRows = Array.from(new Set(form.buttons.map(b => b.row))).sort((a, b) => a - b);

  return (
    <div className={styles.builder}>
      <div className={styles.notice}>
        <div className={styles.noticeTitle}>MAX API — платформа MAX (business.max.ru)</div>
        <div className={styles.noticeText}>
          Эндпоинт: <code className={styles.inlineCode}>https://platform-api.max.ru/messages</code>.
          Заголовок: <code className={styles.inlineCode}>Authorization: {'{{ $max_token }}'}</code>.
          Лимит: 30 запросов/сек.
        </div>
      </div>

      {/* Target */}
      <div className={styles.card}>
        <div className={styles.inlineHeader}>
          <div className={styles.sectionTitle}>Получатель и текст</div>
          <button className={styles.secondaryBtn} onClick={handleReset}>Сбросить</button>
        </div>
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
            <div className={styles.sectionText}>До 5 изображений. Используйте разные URL.</div>
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

      {/* Buttons */}
      <div className={styles.card}>
        <div className={styles.inlineHeader}>
          <div>
            <div className={styles.sectionTitle}>Кнопки inline_keyboard</div>
            <div className={styles.sectionText}>Одна строка = один ряд кнопок.</div>
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

                      <div className={styles.field}>
                        <label className={styles.label}>Строка</label>
                        <input
                          type="number"
                          min={1}
                          value={btn.row}
                          onChange={e => updateButton(btn.id, { row: Math.max(1, Number(e.target.value)) })}
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
      </div>

      {/* Result */}
      <div className={styles.card}>
        <div className={styles.inlineHeader}>
          <div>
            <div className={styles.sectionTitle}>Результат</div>
            <div className={styles.sectionText}>Endpoint и тело запроса.</div>
          </div>
          <div className={styles.badges}>
            <span className={styles.badge}>JSON</span>
          </div>
        </div>

        <div className={styles.endpoint}>{endpoint}</div>

        <div className={styles.outputBlock}>
          <div className={styles.outputHeader}>
            <div className={styles.outputTitle}>Тело запроса</div>
            <button
              className={`${styles.primaryBtn} ${copied ? styles.copiedBtn : ''}`}
              onClick={handleCopy}
            >
              {copied ? 'Скопировано' : 'Скопировать body'}
            </button>
          </div>
          <pre className={styles.pre}>{bodyPreview}</pre>
        </div>
      </div>
    </div>
  );
}
