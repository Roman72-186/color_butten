import type { ButtonConfig, ActionType, ButtonStyle } from '../../types';
import { STYLES, ACTION_TYPES } from '../../constants';
import { ActionValueInput } from '../ActionValueInput';
import styles from '../../styles/RequestBuilder.module.css';

interface InlineButtonCardProps {
  button: ButtonConfig;
  onUpdate: (patch: Partial<ButtonConfig>) => void;
  onRemove: () => void;
}

export function InlineButtonCard({ button, onUpdate, onRemove }: InlineButtonCardProps) {
  return (
    <div className={styles.albumCard}>
      <div className={styles.albumHeader}>
        <span className={styles.albumTitle}>Р{button.row}К{button.col}</span>
        <button className={styles.linkBtn} onClick={onRemove}>
          Удалить
        </button>
      </div>

      <div className={styles.grid}>
        <div className={styles.fieldFull}>
          <label className={styles.label}>text</label>
          <input
            type="text"
            value={button.text}
            placeholder="Текст кнопки"
            onChange={e => onUpdate({ text: e.target.value })}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>style</label>
          <select
            value={button.style}
            onChange={e => onUpdate({ style: e.target.value as ButtonStyle })}
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
            onChange={e => onUpdate({
              actionType: e.target.value as ActionType,
              actionValue: '',
            })}
          >
            {ACTION_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className={styles.fieldFull}>
          <ActionValueInput
            actionType={button.actionType}
            value={button.actionValue}
            onChange={value => onUpdate({ actionValue: value })}
          />
        </div>
      </div>
    </div>
  );
}
