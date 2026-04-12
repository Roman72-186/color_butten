import { useMemo } from 'react';
import type { ButtonConfig } from '../../types';
import type { MaxButtonItem } from '../../types/max';
import { MAX_GRID_ROWS, MAX_GRID_COLS } from '../../constants';
import { groupByRow } from '../../utils/helpers';
import { GridCell } from '../GridCell';
import { Preview } from '../Preview';
import { MaxButtonCard } from './MaxButtonCard';
import styles from '../../styles/RequestBuilder.module.css';
import gridStyles from '../../styles/GridConstructor.module.css';

interface MaxKeyboardSectionProps {
  buttons: MaxButtonItem[];
  onToggleCell: (row: number, col: number) => void;
  onUpdateButton: (id: string, patch: Partial<MaxButtonItem>) => void;
  onClearAll: () => void;
}

export function MaxKeyboardSection({
  buttons,
  onToggleCell,
  onUpdateButton,
  onClearAll,
}: MaxKeyboardSectionProps) {
  const previewRows = useMemo((): ButtonConfig[][] =>
    groupByRow(buttons).map(row =>
      row.map(btn => ({
        id: btn.id,
        text: btn.text || '...',
        style: 'default' as const,
        actionType: 'callback_data' as const,
        actionValue: btn.payload,
        row: btn.row,
        col: btn.col,
        iconCustomEmojiId: '',
      }))
    ),
  [buttons]);

  const sortedButtons = useMemo(
    () => [...buttons].sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col),
    [buttons]
  );

  return (
    <div className={styles.card}>
      <div className={styles.inlineHeader}>
        <div>
          <div className={styles.sectionTitle}>Кнопки inline_keyboard</div>
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
      {sortedButtons.map(btn => (
        <MaxButtonCard
          key={btn.id}
          btn={btn}
          onUpdate={onUpdateButton}
          onRemove={onToggleCell}
        />
      ))}

      {buttons.length > 0 && <Preview rows={previewRows} />}
    </div>
  );
}
