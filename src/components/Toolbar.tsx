import { MAX_BUTTONS } from '../constants';
import styles from '../styles/Toolbar.module.css';

interface ToolbarProps {
  buttonCount: number;
  rowCount: number;
}

export function Toolbar({ buttonCount, rowCount }: ToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.stats}>
        <span className={styles.stat}>
          Кнопок: <span className={styles.statValue}>{buttonCount} / {MAX_BUTTONS}</span>
        </span>
        <span className={styles.stat}>
          Строк: <span className={styles.statValue}>{rowCount}</span>
        </span>
        <span className={styles.hint}>макс. 3 кнопки в строке</span>
      </div>
    </div>
  );
}
