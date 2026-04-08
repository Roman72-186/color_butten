import type { ButtonConfig } from '../types';
import { STYLES, ICON_EMOJI_OPTIONS } from '../constants';
import styles from '../styles/Preview.module.css';

interface PreviewProps {
  rows: ButtonConfig[][];
}

function getIconEmoji(iconId: string): string {
  if (!iconId.trim()) return '';
  const found = ICON_EMOJI_OPTIONS.find(o => o.id === iconId);
  if (found) {
    // label вида "☰ Меню" — берём первый символ (emoji)
    return found.label.split(' ')[0] + ' ';
  }
  return '✨ ';
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
                const icon = getIconEmoji(button.iconCustomEmojiId);
                return (
                  <div
                    key={button.id}
                    className={styles.button}
                    style={{ background: color }}
                    title={button.text || '(пусто)'}
                  >
                    {icon}{button.text || '...'}
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
