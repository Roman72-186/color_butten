import { useState } from 'react';
import type { ButtonConfig, ButtonErrors, ButtonStyle, ActionType } from '../types';
import { STYLES, ACTION_TYPES, ICON_EMOJI_OPTIONS } from '../constants';
import { ActionValueInput } from './ActionValueInput';
import { ValidationError } from './ValidationError';
import styles from '../styles/ButtonCard.module.css';

interface ButtonCardProps {
  button: ButtonConfig;
  errors: ButtonErrors;
  showValidation: boolean;
  onUpdate: (field: keyof ButtonConfig, value: string | number) => void;
  onRemove: () => void;
}

export function ButtonCard({
  button,
  errors,
  showValidation,
  onUpdate,
  onRemove,
}: ButtonCardProps) {
  const styleColor = STYLES.find(s => s.value === button.style)?.color ?? '#8597a8';
  const isPredefined = ICON_EMOJI_OPTIONS.some(o => o.id === button.iconCustomEmojiId);
  const [customMode, setCustomMode] = useState(
    () => button.iconCustomEmojiId !== '' && !isPredefined
  );

  const selectValue = customMode ? 'custom' : button.iconCustomEmojiId;

  function handleEmojiSelect(val: string) {
    if (val === 'custom') {
      setCustomMode(true);
    } else {
      setCustomMode(false);
      onUpdate('iconCustomEmojiId', val);
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>Р{button.row}К{button.col}</span>
        <span className={styles.badge} style={{ background: styleColor }}>
          {button.style}
        </span>
        <button className={styles.deleteBtn} onClick={onRemove} title="Деактивировать ячейку">
          ✕
        </button>
      </div>

      <div className={styles.fields}>
        <div className={styles.fieldFull}>
          <label className={styles.label}>Текст кнопки</label>
          <input
            type="text"
            value={button.text}
            placeholder="Текст кнопки"
            onChange={e => onUpdate('text', e.target.value)}
          />
          {showValidation && <ValidationError message={errors.text} />}
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Стиль</label>
            <select
              value={button.style}
              onChange={e => onUpdate('style', e.target.value as ButtonStyle)}
            >
              {STYLES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Тип действия</label>
            <select
              value={button.actionType}
              onChange={e => onUpdate('actionType', e.target.value as ActionType)}
            >
              {ACTION_TYPES.map(a => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.fieldFull}>
          <ActionValueInput
            actionType={button.actionType}
            value={button.actionValue}
            error={showValidation ? errors.actionValue : undefined}
            onChange={val => onUpdate('actionValue', val)}
          />
        </div>

        <div className={styles.fieldFull}>
          <label className={styles.label}>icon_custom_emoji_id</label>
          <select value={selectValue} onChange={e => handleEmojiSelect(e.target.value)}>
            <option value="">— без иконки —</option>
            {ICON_EMOJI_OPTIONS.map(o => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
            <option value="custom">Свой ID...</option>
          </select>
          {customMode && (
            <input
              type="text"
              value={button.iconCustomEmojiId}
              placeholder="Вставьте числовой ID"
              style={{ marginTop: 6 }}
              onChange={e => onUpdate('iconCustomEmojiId', e.target.value)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
