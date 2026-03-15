import { MAX_BUTTONS } from '../constants';
import styles from '../styles/Toolbar.module.css';

interface ToolbarProps {
  buttonCount: number;
  rowCount: number;
  onAdd: () => void;
  onReset: () => void;
}

export function Toolbar({ buttonCount, rowCount, onAdd, onReset }: ToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.stats}>
        <span className={styles.stat}>
          Кнопок: <span className={styles.statValue}>{buttonCount} / {MAX_BUTTONS}</span>
        </span>
        <span className={styles.stat}>
          Строк: <span className={styles.statValue}>{rowCount}</span>
        </span>
        <span className={styles.hint}>макс. 3 в строке</span>
      </div>
      <div className={styles.actions}>
        <button
          className={styles.addBtn}
          onClick={onAdd}
          disabled={buttonCount >= MAX_BUTTONS}
        >
          + Кнопка
        </button>
        <button className={styles.resetBtn} onClick={onReset}>
          Сбросить
        </button>
      </div>
    </div>
  );
}
