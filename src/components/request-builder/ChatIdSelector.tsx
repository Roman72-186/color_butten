import { CHAT_ID_PRESETS } from '../../constants/requestPresets';
import styles from '../../styles/RequestBuilder.module.css';

interface ChatIdSelectorProps {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

export function ChatIdSelector({ value, placeholder = '{{ telegram_id}}', onChange }: ChatIdSelectorProps) {
  return (
    <>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
      <div className={styles.chipRow}>
        {CHAT_ID_PRESETS.map(preset => (
          <button
            key={preset.label}
            type="button"
            className={`${styles.chip} ${value === preset.value ? styles.chipActive : ''}`}
            onClick={() => onChange(preset.value)}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </>
  );
}
