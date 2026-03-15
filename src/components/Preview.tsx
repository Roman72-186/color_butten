import type { ButtonConfig } from '../types';
import { STYLES } from '../constants';
import styles from '../styles/Preview.module.css';

interface PreviewProps {
  rows: ButtonConfig[][];
}

export function Preview({ rows }: PreviewProps) {
  return (
    <div className={styles.preview}>
      <div className={styles.title}>Предпросмотр раскладки</div>
      <div className={styles.container}>
        {rows.length === 0 ? (
          <div className={styles.empty}>Добавьте кнопки для предпросмотра</div>
        ) : (
          rows.map((row, rowIndex) => (
            <div key={rowIndex} className={styles.row}>
              {row.map(button => {
                const color = STYLES.find(s => s.value === button.style)?.color ?? '#8597a8';
                return (
                  <div
                    key={button.id}
                    className={styles.button}
                    style={{ background: color }}
                    title={button.text || '(пусто)'}
                  >
                    {button.text || '...'}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
