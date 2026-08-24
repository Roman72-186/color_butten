import styles from '../styles/GridConstructor.module.css';

interface GridCellProps {
  active: boolean;
  label: string;
  row: number;
  col: number;
  onClick: () => void;
}

export function GridCell({ active, label, row, col, onClick }: GridCellProps) {
  const description = active
    ? `Р${row}К${col}${label ? ': ' + label : ''} — нажмите для деактивации`
    : `Р${row}К${col} — нажмите для активации`;

  return (
    <button
      type="button"
      className={`${styles.cell} ${active ? styles.cellActive : styles.cellInactive}`}
      onClick={onClick}
      title={description}
      aria-label={description}
    >
      {active ? (label || '...') : ''}
    </button>
  );
}
