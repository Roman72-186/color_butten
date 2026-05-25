import type { MaxButtonItem, MaxButtonType } from '../../types/max';
import styles from '../../styles/RequestBuilder.module.css';

const MAX_BUTTON_TYPES: { value: MaxButtonType; label: string }[] = [
  { value: 'callback',             label: 'Callback (событие)' },
  { value: 'message',              label: 'Команда (message)' },
  { value: 'link',                 label: 'Ссылка (link)' },
  { value: 'open_app',             label: 'Mini App (open_app)' },
  { value: 'clipboard',            label: 'Копировать (clipboard)' },
  { value: 'request_contact',      label: 'Запрос контакта' },
  { value: 'request_geo_location', label: 'Запрос геолокации' },
];

interface MaxButtonCardProps {
  btn: MaxButtonItem;
  onUpdate: (id: string, patch: Partial<MaxButtonItem>) => void;
  onRemove: (row: number, col: number) => void;
}

export function MaxButtonCard({ btn, onUpdate, onRemove }: MaxButtonCardProps) {
  return (
    <div className={styles.albumCard}>
      <div className={styles.albumHeader}>
        <span className={styles.albumTitle}>Р{btn.row}К{btn.col}</span>
        <button className={styles.linkBtn} onClick={() => onRemove(btn.row, btn.col)}>Удалить</button>
      </div>
      <div className={styles.grid}>
        <div className={styles.field}>
          <label className={styles.label}>type</label>
          <select
            value={btn.type}
            onChange={e => onUpdate(btn.id, { type: e.target.value as MaxButtonType })}
          >
            {MAX_BUTTON_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className={styles.fieldFull}>
          <label className={styles.label}>text</label>
          <input
            type="text"
            value={btn.text}
            placeholder="Текст кнопки"
            onChange={e => onUpdate(btn.id, { text: e.target.value })}
          />
        </div>
        {(btn.type === 'link' || btn.type === 'open_app') && (
          <div className={styles.fieldFull}>
            <label className={styles.label}>{btn.type === 'open_app' ? 'web_app' : 'url'}</label>
            <input
              type="text"
              value={btn.url}
              placeholder={btn.type === 'open_app' ? 'bot_username или URL Mini App' : 'https://example.com'}
              onChange={e => onUpdate(btn.id, { url: e.target.value })}
            />
          </div>
        )}
        {(btn.type === 'callback' || btn.type === 'message' || btn.type === 'open_app' || btn.type === 'clipboard') && (
          <div className={styles.fieldFull}>
            <label className={styles.label}>payload</label>
            <input
              type="text"
              value={btn.payload}
              placeholder={btn.type === 'message' ? '/menu' : btn.type === 'clipboard' ? 'Текст для буфера обмена' : 'my_callback'}
              onChange={e => onUpdate(btn.id, { payload: e.target.value })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
