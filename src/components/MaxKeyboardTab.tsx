import { useState, useCallback, useMemo } from 'react';
import type { ButtonConfig } from '../types';
import { MAX_BUTTONS } from '../constants';
import { Toolbar } from './Toolbar';
import { Preview } from './Preview';
import { JsonOutput } from './JsonOutput';
import cardStyles from '../styles/ButtonCard.module.css';
import appStyles from '../styles/App.module.css';

// ─── Types ───────────────────────────────────────────────────────────────────

type MaxBtnType = 'callback' | 'message' | 'link' | 'request_contact' | 'request_geo_location';

interface MaxBtn {
  id: string;
  type: MaxBtnType;
  text: string;
  payload: string;
  url: string;
  row: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_PER_ROW = 3;

const MAX_BTN_TYPES: { value: MaxBtnType; label: string; hint: string }[] = [
  { value: 'callback',             label: 'Callback',        hint: 'payload передаётся боту как callback-событие' },
  { value: 'message',              label: 'Message',         hint: 'payload отправляется как текст от пользователя' },
  { value: 'link',                 label: 'Link',            hint: 'открывает URL в браузере' },
  { value: 'request_contact',      label: 'Request Contact', hint: 'запрашивает номер телефона пользователя' },
  { value: 'request_geo_location', label: 'Request Geo',     hint: 'запрашивает геолокацию пользователя' },
];

// ─── ID factory ───────────────────────────────────────────────────────────────

let counter = 0;
function nextId(): string {
  counter += 1;
  return `maxkb_${Date.now()}_${counter}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createDefault(row: number): MaxBtn {
  return { id: nextId(), type: 'callback', text: '', payload: '', url: '', row };
}

function getNextRow(buttons: MaxBtn[]): number {
  const rowCounts = new Map<number, number>();
  for (const btn of buttons) rowCounts.set(btn.row, (rowCounts.get(btn.row) ?? 0) + 1);
  const rows = Array.from(new Set(buttons.map(b => b.row))).sort((a, b) => a - b);
  const maxRow = rows.length > 0 ? rows[rows.length - 1] : 0;
  for (const r of rows) {
    if ((rowCounts.get(r) ?? 0) < MAX_PER_ROW) return r;
  }
  return maxRow + 1;
}

function toPreviewRows(buttons: MaxBtn[]): ButtonConfig[][] {
  const rowMap = new Map<number, MaxBtn[]>();
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
        col: 0,
        iconCustomEmojiId: '',
      }))
    );
}

function buildJson(buttons: MaxBtn[]): string {
  const rowMap = new Map<number, MaxBtn[]>();
  for (const btn of buttons) {
    const row = rowMap.get(btn.row) ?? [];
    row.push(btn);
    rowMap.set(btn.row, row);
  }
  const buttonRows = Array.from(rowMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([, row]) =>
      row.map(btn => {
        if (btn.type === 'link') return { type: btn.type, text: btn.text, url: btn.url };
        if (btn.type === 'request_contact' || btn.type === 'request_geo_location') {
          return { type: btn.type, text: btn.text };
        }
        return { type: btn.type, text: btn.text, payload: btn.payload };
      })
    );

  const body: Record<string, unknown> = { text: 'text' };
  if (buttonRows.length > 0) {
    body.attachments = [{ type: 'inline_keyboard', payload: { buttons: buttonRows } }];
  }
  return JSON.stringify(body, null, 2);
}

// ─── MaxRowSelector ───────────────────────────────────────────────────────────

function MaxRowSelector({
  buttons,
  currentId,
  currentRow,
  onChange,
}: {
  buttons: MaxBtn[];
  currentId: string;
  currentRow: number;
  onChange: (row: number) => void;
}) {
  const existingRows = Array.from(new Set(buttons.map(b => b.row))).sort((a, b) => a - b);
  const nextRow = existingRows.length > 0 ? existingRows[existingRows.length - 1] + 1 : 1;

  return (
    <div className={cardStyles.field}>
      <label className={cardStyles.label}>Строка в клавиатуре</label>
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

// ─── MaxBtnCard ───────────────────────────────────────────────────────────────

function MaxBtnCard({
  btn,
  index,
  allButtons,
  canDelete,
  onUpdate,
  onRemove,
}: {
  btn: MaxBtn;
  index: number;
  allButtons: MaxBtn[];
  canDelete: boolean;
  onUpdate: (id: string, patch: Partial<MaxBtn>) => void;
  onRemove: (id: string) => void;
}) {
  const typeCfg = MAX_BTN_TYPES.find(t => t.value === btn.type);

  return (
    <div className={cardStyles.card}>
      <div className={cardStyles.cardHeader}>
        <span className={cardStyles.cardTitle}>Кнопка {index + 1}</span>
        <span
          className={cardStyles.badge}
          style={{ background: 'var(--surface-alt)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
        >
          {typeCfg?.label ?? btn.type}
        </span>
        <span className={`${cardStyles.badge} ${cardStyles.rowBadge}`}>
          Строка {btn.row}
        </span>
        {canDelete && (
          <button className={cardStyles.deleteBtn} onClick={() => onRemove(btn.id)}>✕</button>
        )}
      </div>

      <div className={cardStyles.fields}>
        {/* text */}
        <div className={cardStyles.fieldFull}>
          <label className={cardStyles.label}>Текст кнопки</label>
          <input
            type="text"
            value={btn.text}
            placeholder="Текст кнопки"
            onChange={e => onUpdate(btn.id, { text: e.target.value })}
          />
        </div>

        {/* type + row */}
        <div className={cardStyles.fieldRow}>
          <div className={cardStyles.field}>
            <label className={cardStyles.label}>Тип кнопки</label>
            <select
              value={btn.type}
              onChange={e => onUpdate(btn.id, { type: e.target.value as MaxBtnType, payload: '', url: '' })}
            >
              {MAX_BTN_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {typeCfg && (
              <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-dim)' }}>{typeCfg.hint}</div>
            )}
          </div>

          <MaxRowSelector
            buttons={allButtons}
            currentId={btn.id}
            currentRow={btn.row}
            onChange={row => onUpdate(btn.id, { row })}
          />
        </div>

        {/* payload */}
        {(btn.type === 'callback' || btn.type === 'message') && (
          <div className={cardStyles.fieldFull}>
            <label className={cardStyles.label}>
              {btn.type === 'callback' ? 'payload (callback_data)' : 'payload (команда/текст)'}
            </label>
            <input
              type="text"
              value={btn.payload}
              placeholder={btn.type === 'callback' ? 'my_action' : '/menu'}
              onChange={e => onUpdate(btn.id, { payload: e.target.value })}
            />
          </div>
        )}

        {/* url */}
        {btn.type === 'link' && (
          <div className={cardStyles.fieldFull}>
            <label className={cardStyles.label}>url</label>
            <input
              type="text"
              value={btn.url}
              placeholder="https://example.com"
              onChange={e => onUpdate(btn.id, { url: e.target.value })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MaxKeyboardTab ───────────────────────────────────────────────────────────

export function MaxKeyboardTab() {
  const [buttons, setButtons] = useState<MaxBtn[]>(() => [createDefault(1)]);

  const rowCount     = useMemo(() => new Set(buttons.map(b => b.row)).size, [buttons]);
  const previewRows  = useMemo(() => toPreviewRows(buttons), [buttons]);
  const jsonResult   = useMemo(() => buildJson(buttons), [buttons]);
  const isMax        = buttons.length >= MAX_BUTTONS;

  const addButton = useCallback(() => {
    setButtons(prev => {
      if (prev.length >= MAX_BUTTONS) return prev;
      return [...prev, createDefault(getNextRow(prev))];
    });
  }, []);

  const removeButton = useCallback((id: string) => {
    setButtons(prev => prev.length <= 1 ? prev : prev.filter(b => b.id !== id));
  }, []);

  const updateButton = useCallback((id: string, patch: Partial<MaxBtn>) => {
    setButtons(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
  }, []);

  const resetAll = useCallback(() => {
    setButtons([createDefault(1)]);
  }, []);

  return (
    <>
      <Toolbar buttonCount={buttons.length} rowCount={rowCount} />

      <div className={appStyles.section}>
        {buttons.map((btn, index) => (
          <MaxBtnCard
            key={btn.id}
            btn={btn}
            index={index}
            allButtons={buttons}
            canDelete={buttons.length > 1}
            onUpdate={updateButton}
            onRemove={removeButton}
          />
        ))}

        <div className={appStyles.cardActions}>
          <button className={appStyles.addBtn} onClick={addButton} disabled={isMax}>
            + Кнопка
          </button>
          <button className={appStyles.resetBtn} onClick={resetAll}>
            Сбросить
          </button>
        </div>
      </div>

      <Preview rows={previewRows} />

      <JsonOutput
        title="MAX API (platform-api.max.ru)"
        json={jsonResult}
        hasErrors={false}
        onCopy={() => {}}
      />
    </>
  );
}
