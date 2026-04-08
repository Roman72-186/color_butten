import type { ButtonConfig, ButtonErrors } from '../types';
import { MAX_GRID_ROWS, MAX_GRID_COLS } from '../constants';
import { ButtonCard } from './ButtonCard';
import styles from '../styles/GridConstructor.module.css';

interface GridConstructorProps {
  gridRows: number;
  gridCols: number;
  buttons: ButtonConfig[];
  errorsById: Map<string, ButtonErrors>;
  showValidation: boolean;
  onGridRowsChange: (rows: number) => void;
  onGridColsChange: (cols: number) => void;
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
      {active ? (label || '...') : '+'}
    </button>
  );
}

export function GridConstructor({
  gridRows,
  gridCols,
  buttons,
  errorsById,
  showValidation,
  onGridRowsChange,
  onGridColsChange,
  onToggleCell,
  onUpdateButton,
  onReset,
}: GridConstructorProps) {
  const sortedButtons = [...buttons].sort((a, b) =>
    a.row !== b.row ? a.row - b.row : a.col - b.col
  );

  function handleRowsInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = Math.min(MAX_GRID_ROWS, Math.max(1, Number(e.target.value) || 1));
    onGridRowsChange(val);
  }

  function handleColsInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = Math.min(MAX_GRID_COLS, Math.max(1, Number(e.target.value) || 1));
    onGridColsChange(val);
  }

  return (
    <div className={styles.wrapper}>
      {/* Size picker */}
      <div className={styles.sizeRow}>
        <span className={styles.sizeLabel}>Строк</span>
        <input
          type="number"
          className={styles.sizeInput}
          min={1}
          max={MAX_GRID_ROWS}
          value={gridRows}
          onChange={handleRowsInput}
        />
        <span className={styles.sizeSep}>×</span>
        <span className={styles.sizeLabel}>Столбцов</span>
        <input
          type="number"
          className={styles.sizeInput}
          min={1}
          max={MAX_GRID_COLS}
          value={gridCols}
          onChange={handleColsInput}
        />
        <span className={styles.activeCount}>{buttons.length} активных</span>
        <button className={styles.resetBtn} onClick={onReset}>Сбросить</button>
      </div>

      {/* Visual grid */}
      <div
        className={styles.grid}
        style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
      >
        {Array.from({ length: gridRows }, (_, r) =>
          Array.from({ length: gridCols }, (_, c) => {
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

      {/* Hint */}
      {buttons.length === 0 && (
        <div className={styles.hint}>
          Нажмите на ячейку чтобы добавить кнопку. Повторное нажатие удаляет её.
        </div>
      )}

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
