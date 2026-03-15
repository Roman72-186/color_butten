import type { MessageConfig } from '../types';
import styles from '../styles/MessageFields.module.css';

interface MessageFieldsProps {
  message: MessageConfig;
  onChange: (field: keyof MessageConfig, value: string) => void;
}

const PARSE_MODES = ['HTML', 'Markdown', 'MarkdownV2'] as const;

export function MessageFields({ message, onChange }: MessageFieldsProps) {
  return (
    <div className={styles.block}>
      <div className={styles.title}>Параметры сообщения</div>
      <div className={styles.fields}>
        <div className={styles.field}>
          <label className={styles.label}>Chat ID</label>
          <input
            type="text"
            value={message.chatId}
            placeholder="{{telegram_id}}"
            onChange={e => onChange('chatId', e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Текст сообщения</label>
          <input
            type="text"
            value={message.text}
            placeholder="Текст сообщения"
            onChange={e => onChange('text', e.target.value)}
          />
        </div>
        <div className={styles.fieldSmall}>
          <label className={styles.label}>Parse Mode</label>
          <select
            value={message.parseMode}
            onChange={e => onChange('parseMode', e.target.value)}
          >
            {PARSE_MODES.map(mode => (
              <option key={mode} value={mode}>{mode}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
