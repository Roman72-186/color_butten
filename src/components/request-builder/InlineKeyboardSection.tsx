import { useMemo } from 'react';
import type { ButtonConfig } from '../../types';
import { MAX_GRID_ROWS, MAX_GRID_COLS } from '../../constants';
import { groupButtonsByRow } from '../../utils/helpers';
import { GridCell } from '../GridCell';
import { Preview } from '../Preview';
import { InlineButtonCard } from './InlineButtonCard';
import styles from '../../styles/RequestBuilder.module.css';
import gridStyles from '../../styles/GridConstructor.module.css';

interface InlineKeyboardSectionProps {
  buttons: ButtonConfig[];
  onToggleCell: (row: number, col: number) => void;
  onUpdateButton: (id: string, patch: Partial<ButtonConfig>) => void;
  onClearAll: () => void;
}

export function InlineKeyboardSection({
  buttons,
  onToggleCell,
  onUpdateButton,
  onClearAll,
}: InlineKeyboardSectionProps) {
  const previewRows = useMemo(() => groupButtonsByRow(buttons), [buttons]);
  const sortedButtons = useMemo(
    () => [...buttons].sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col),
    [buttons]
  );

  return (
    <div className={styles.card}>
      <div className={styles.inlineHeader}>
        <div>
          <div className={styles.sectionTitle}>Inline-клавиатура (reply_markup)</div>
          <div className={styles.sectionText}>Нажмите на ячейку чтобы добавить кнопку</div>
        </div>
        {buttons.length > 0 && (
          <button className={styles.secondaryBtn} onClick={onClearAll}>
            Очистить
          </button>
        )}
      </div>

      {/* 7×7 grid */}
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
                onClick={() => onToggleCell(row, col)}
              />
            );
          })
        )}
      </div>

      {/* Config cards */}
      {sortedButtons.map(button => (
        <InlineButtonCard
          key={button.id}
          button={button}
          onUpdate={patch => onUpdateButton(button.id, patch)}
          onRemove={() => onToggleCell(button.row, button.col)}
        />
      ))}

      {buttons.length > 0 && <Preview rows={previewRows} />}
    </div>
  );
}
