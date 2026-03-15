import type { ButtonConfig, ButtonErrors, ButtonStyle, ActionType } from '../types';
import { STYLES, ACTION_TYPES } from '../constants';
import { RowSelector } from './RowSelector';
import { ActionValueInput } from './ActionValueInput';
import { ValidationError } from './ValidationError';
import styles from '../styles/ButtonCard.module.css';

interface ButtonCardProps {
  button: ButtonConfig;
  index: number;
  buttons: ButtonConfig[];
  errors: ButtonErrors;
  showValidation: boolean;
  canDelete: boolean;
  onUpdate: (index: number, field: keyof ButtonConfig, value: string | number) => void;
  onRemove: (index: number) => void;
}

export function ButtonCard({
  button,
  index,
  buttons,
  errors,
  showValidation,
  canDelete,
  onUpdate,
  onRemove,
}: ButtonCardProps) {
  const styleColor = STYLES.find(s => s.value === button.style)?.color ?? '#8597a8';

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>Кнопка {index + 1}</span>
        <span className={styles.badge} style={{ background: styleColor }}>
          {button.style}
        </span>
        <span className={`${styles.badge} ${styles.rowBadge}`}>
          строка {button.row}
        </span>
        {canDelete && (
          <button className={styles.deleteBtn} onClick={() => onRemove(index)} title="Удалить">
            ✕
          </button>
        )}
      </div>

      <div className={styles.fields}>
        <div className={styles.fieldFull}>
          <label className={styles.label}>Текст кнопки</label>
          <input
            type="text"
            value={button.text}
            placeholder="Текст кнопки"
            onChange={e => onUpdate(index, 'text', e.target.value)}
          />
          {showValidation && <ValidationError message={errors.text} />}
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Стиль</label>
            <select
              value={button.style}
              onChange={e => onUpdate(index, 'style', e.target.value as ButtonStyle)}
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
              onChange={e => onUpdate(index, 'actionType', e.target.value as ActionType)}
            >
              {ACTION_TYPES.map(a => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <RowSelector
              buttons={buttons}
              currentButtonId={button.id}
              currentRow={button.row}
              onChange={row => onUpdate(index, 'row', row)}
            />
          </div>
        </div>

        <div className={styles.fieldFull}>
          <ActionValueInput
            actionType={button.actionType}
            value={button.actionValue}
            error={showValidation ? errors.actionValue : undefined}
            onChange={val => onUpdate(index, 'actionValue', val)}
          />
        </div>
      </div>
    </div>
  );
}
