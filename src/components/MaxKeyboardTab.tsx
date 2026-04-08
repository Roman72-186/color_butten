import { useState, useCallback, useMemo } from 'react';
import type { ButtonConfig } from '../types';
import { MAX_GRID_ROWS, MAX_GRID_COLS } from '../constants';
import { Preview } from './Preview';
import { JsonOutput } from './JsonOutput';
import cardStyles from '../styles/ButtonCard.module.css';
import gridStyles from '../styles/GridConstructor.module.css';

// ─── Types ───────────────────────────────────────────────────────────────────

type MaxBtnType = 'callback' | 'message' | 'link' | 'request_contact' | 'request_geo_location';
type MaxBtnStyle = 'default' | 'primary' | 'positive' | 'negative';

interface MaxBtn {
  id: string;
  type: MaxBtnType;
  text: string;
  payload: string;
  url: string;
  row: number;
  col: number;
  style: MaxBtnStyle;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_BTN_TYPES: { value: MaxBtnType; label: string; hint: string }[] = [
  { value: 'callback',             label: 'Callback',        hint: 'payload передаётся боту как callback-событие' },
  { value: 'message',              label: 'Message',         hint: 'payload отправляется как текст от пользователя' },
  { value: 'link',                 label: 'Link',            hint: 'открывает URL в браузере' },
  { value: 'request_contact',      label: 'Request Contact', hint: 'запрашивает номер телефона пользователя' },
  { value: 'request_geo_location', label: 'Request Geo',     hint: 'запрашивает геолокацию пользователя' },
];

const MAX_BTN_STYLES: { value: MaxBtnStyle; label: string; color: string }[] = [
  { value: 'default',  label: 'Default',  color: '#8597a8' },
  { value: 'primary',  label: 'Primary',  color: '#5eb5f7' },
  { value: 'positive', label: 'Positive', color: '#50c878' },
  { value: 'negative', label: 'Negative', color: '#e05555' },
];

// ─── ID factory ───────────────────────────────────────────────────────────────

let counter = 0;
function nextId(): string {
  counter += 1;
  return `maxkb_${Date.now()}_${counter}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createDefault(row: number, col: number): MaxBtn {
  return { id: nextId(), type: 'callback', text: '', payload: '', url: '', row, col, style: 'default' };
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
      row.slice().sort((a, b) => a.col - b.col).map(btn => ({
        id: btn.id,
        text: btn.text || '...',
        style: (btn.style === 'positive' ? 'success'
              : btn.style === 'negative' ? 'danger'
              : btn.style) as 'default' | 'primary' | 'success' | 'danger',
        actionType: 'callback_data' as const,
        actionValue: btn.payload,
        row: btn.row,
        col: btn.col,
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
      row.slice().sort((a, b) => a.col - b.col).map(btn => {
        const base: Record<string, unknown> = { type: btn.type, text: btn.text };
        if (btn.style !== 'default') base.style = btn.style;
        if (btn.type === 'link') { base.url = btn.url; return base; }
        if (btn.type === 'request_contact' || btn.type === 'request_geo_location') return base;
        base.payload = btn.payload;
        return base;
      })
    );

  const body: Record<string, unknown> = { text: 'text' };
  if (buttonRows.length > 0) {
    body.attachments = [{ type: 'inline_keyboard', payload: { buttons: buttonRows } }];
  }
  return JSON.stringify(body, null, 2);
}

// ─── Grid cell ────────────────────────────────────────────────────────────────

function GridCell({
  active, label, row, col, onClick,
}: { active: boolean; label: string; row: number; col: number; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`${gridStyles.cell} ${active ? gridStyles.cellActive : gridStyles.cellInactive}`}
      onClick={onClick}
      title={active
        ? `Р${row}К${col}${label ? ': ' + label : ''} — нажмите для деактивации`
        : `Р${row}К${col} — нажмите для активации`}
    >
      {active ? (label || '...') : ''}
    </button>
  );
}

// ─── MaxBtnCard ───────────────────────────────────────────────────────────────

function MaxBtnCard({
  btn,
  onUpdate,
  onRemove,
}: {
  btn: MaxBtn;
  onUpdate: (id: string, patch: Partial<MaxBtn>) => void;
  onRemove: (id: string) => void;
}) {
  const typeCfg  = MAX_BTN_TYPES.find(t => t.value === btn.type);
  const styleColor = MAX_BTN_STYLES.find(s => s.value === btn.style)?.color ?? '#8597a8';

  return (
    <div className={cardStyles.card}>
      <div className={cardStyles.cardHeader}>
        <span className={cardStyles.cardTitle}>Р{btn.row}К{btn.col}</span>
        <span className={cardStyles.badge} style={{ background: styleColor }}>
          {btn.style}
        </span>
        <button className={cardStyles.deleteBtn} onClick={() => onRemove(btn.id)} title="Деактивировать ячейку">
          ✕
        </button>
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

        {/* type + style */}
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

          <div className={cardStyles.field}>
            <label className={cardStyles.label}>Цвет (style)</label>
            <select
              value={btn.style}
              onChange={e => onUpdate(btn.id, { style: e.target.value as MaxBtnStyle })}
            >
              {MAX_BTN_STYLES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
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
  const [buttons, setButtons] = useState<MaxBtn[]>([]);

  const previewRows = useMemo(() => toPreviewRows(buttons), [buttons]);
  const jsonResult  = useMemo(() => buildJson(buttons), [buttons]);

  const sortedButtons = useMemo(
    () => [...buttons].sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col),
    [buttons]
  );

  const toggleCell = useCallback((row: number, col: number) => {
    setButtons(prev => {
      const exists = prev.find(b => b.row === row && b.col === col);
      if (exists) return prev.filter(b => !(b.row === row && b.col === col));
      return [...prev, createDefault(row, col)];
    });
  }, []);

  const updateButton = useCallback((id: string, patch: Partial<MaxBtn>) => {
    setButtons(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
  }, []);

  const resetAll = useCallback(() => {
    setButtons([]);
  }, []);

  return (
    <>
      {/* Header */}
      <div className={gridStyles.headerRow}>
        <span className={gridStyles.activeCount}>
          {buttons.length > 0 ? `${buttons.length} кнопок` : 'Нажмите на ячейку'}
        </span>
        <button className={gridStyles.resetBtn} onClick={resetAll}>Сбросить</button>
      </div>

      {/* Static 7×7 grid */}
      <div
        className={gridStyles.grid}
        style={{ gridTemplateColumns: `repeat(${MAX_GRID_COLS}, 1fr)` }}
      >
        {Array.from({ length: MAX_GRID_ROWS }, (_, r) =>
          Array.from({ length: MAX_GRID_COLS }, (_, c) => {
            const row = r + 1, col = c + 1;
            const btn = buttons.find(b => b.row === row && b.col === col);
            return (
              <GridCell
                key={`${row}:${col}`}
                active={Boolean(btn)}
                label={btn?.text ?? ''}
                row={row}
                col={col}
                onClick={() => toggleCell(row, col)}
              />
            );
          })
        )}
      </div>

      {/* Config cards */}
      {sortedButtons.map(btn => (
        <MaxBtnCard
          key={btn.id}
          btn={btn}
          onUpdate={updateButton}
          onRemove={id => toggleCell(
            buttons.find(b => b.id === id)!.row,
            buttons.find(b => b.id === id)!.col
          )}
        />
      ))}

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
