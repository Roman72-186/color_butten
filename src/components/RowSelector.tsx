import type { ButtonConfig } from '../types';
import { MAX_PER_ROW } from '../constants';
import { countButtonsInRow } from '../utils/helpers';

interface RowSelectorProps {
  buttons: ButtonConfig[];
  currentButtonId: string;
  currentRow: number;
  onChange: (row: number) => void;
}

export function RowSelector({ buttons, currentButtonId, currentRow, onChange }: RowSelectorProps) {
  const existingRows = Array.from(new Set(buttons.map(b => b.row))).sort((a, b) => a - b);
  const nextNewRow = existingRows.length > 0 ? existingRows[existingRows.length - 1] + 1 : 1;

  return (
    <div>
      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Строка в клавиатуре
      </label>
      <select
        value={currentRow}
        onChange={e => onChange(Number(e.target.value))}
      >
        {existingRows.map(row => {
          const count = countButtonsInRow(buttons, row, currentButtonId);
          const isFull = count >= MAX_PER_ROW;
          const free = MAX_PER_ROW - count;
          return (
            <option key={row} value={row} disabled={isFull}>
              Строка {row}{isFull ? ' (заполнена)' : ` (свободно ${free} из ${MAX_PER_ROW})`}
            </option>
          );
        })}
        <option value={nextNewRow}>+ Добавить строку {nextNewRow}</option>
      </select>
    </div>
  );
}
