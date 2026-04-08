import type { ButtonConfig, ButtonErrors } from '../types';
import { MAX_GRID_ROWS, MAX_GRID_COLS } from '../constants';
import { ButtonCard } from './ButtonCard';
import styles from '../styles/GridConstructor.module.css';

interface GridConstructorProps {
  buttons: ButtonConfig[];
  errorsById: Map<string, ButtonErrors>;
  showValidation: boolean;
  onToggleCell: (row: number, col: number) => void;
  onUpdateButton: (id: string, field: keyof ButtonConfig, value: string | number) => void;
  onReset: () => void;
}

interface GridCellProps {
  active: boolean;
  label: string;
  row: number;
  col: number;
  onClick: () => void;
}

function GridCell({ active, label, row, col, onClick }: GridCellProps) {
  return (
    <button
      type="button"
      className={`${styles.cell} ${active ? styles.cellActive : styles.cellInactive}`}
      onClick={onClick}
      title={active
        ? `Р${row}К${col}${label ? ': ' + label : ''} — нажмите для деактивации`
        : `Р${row}К${col} — нажмите для активации`}
    >
      {active ? (label || '...') : ''}
    </button>
  );
}

export function GridConstructor({
  buttons,
  errorsById,
  showValidation,
  onToggleCell,
  onUpdateButton,
  onReset,
}: GridConstructorProps) {
  const sortedButtons = [...buttons].sort((a, b) =>
    a.row !== b.row ? a.row - b.row : a.col - b.col
  );

  return (
    <div className={styles.wrapper}>
      {/* Header row */}
      <div className={styles.headerRow}>
        <span className={styles.activeCount}>
          {buttons.length > 0 ? `${buttons.length} кнопок` : 'Нажмите на ячейку'}
        </span>
        <button className={styles.resetBtn} onClick={onReset}>Сбросить</button>
      </div>

      {/* Static 7×7 grid */}
      <div
        className={styles.grid}
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

      {/* Config cards for active cells */}
      {sortedButtons.map(btn => (
        <ButtonCard
          key={btn.id}
          button={btn}
          errors={errorsById.get(btn.id) ?? {}}
          showValidation={showValidation}
          onUpdate={(field, value) => onUpdateButton(btn.id, field, value)}
          onRemove={() => onToggleCell(btn.row, btn.col)}
        />
      ))}
    </div>
  );
}
