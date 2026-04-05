import { useState, useMemo, useCallback } from 'react';
import { PREMIUM_EMOJI_DATA } from '../constants/premiumEmojiData';
import styles from '../styles/EmojiPicker.module.css';

interface EmojiPickerProps {
  onInsert: (fallback: string, id: string) => void;
}

export function EmojiPicker({ onInsert }: EmojiPickerProps) {
  const [search, setSearch] = useState('');
  const [customId, setCustomId] = useState('');
  const [customFallback, setCustomFallback] = useState('');
  const [insertedId, setInsertedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return PREMIUM_EMOJI_DATA;
    return PREMIUM_EMOJI_DATA.filter(e =>
      e.fallback.includes(q) ||
      e.label.toLowerCase().includes(q) ||
      e.tags.some(t => t.toLowerCase().includes(q))
    );
  }, [search]);

  const hasPremiumData = useMemo(
    () => PREMIUM_EMOJI_DATA.some(e => e.id !== ''),
    []
  );

  const handleClick = useCallback((fallback: string, id: string) => {
    onInsert(fallback, id);
    setInsertedId(fallback);
    setTimeout(() => setInsertedId(null), 1000);
  }, [onInsert]);

  const handleCustomInsert = useCallback(() => {
    if (!customFallback.trim()) return;
    onInsert(customFallback.trim(), customId.trim());
    setCustomId('');
    setCustomFallback('');
  }, [customId, customFallback, onInsert]);

  return (
    <div className={styles.picker}>
      {/* Search */}
      <div className={styles.searchRow}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Поиск: звезда, fire, kiss, сердце..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoComplete="off"
        />
        {search && (
          <button className={styles.clearBtn} onClick={() => setSearch('')}>✕</button>
        )}
      </div>

      {!hasPremiumData && (
        <div className={styles.notice}>
          ID не загружены — вставляется Unicode. Для premium animated emoji запустите:
          <code className={styles.noticeCode}>node scripts/fetch-premium-emoji.mjs YOUR_BOT_TOKEN</code>
        </div>
      )}

      {/* Emoji grid */}
      {filtered.length > 0 ? (
        <div className={styles.grid}>
          {filtered.map(e => (
            <button
              key={e.fallback + e.id}
              className={`${styles.item} ${insertedId === e.fallback ? styles.itemInserted : ''} ${e.id ? styles.itemPremium : ''}`}
              title={`${e.label}${e.id ? ' ★ premium' : ''}`}
              onClick={() => handleClick(e.fallback, e.id)}
            >
              <span className={styles.itemEmoji}>{e.fallback}</span>
              <span className={styles.itemLabel}>{e.label}</span>
              {e.id && <span className={styles.premiumDot} />}
            </button>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>Ничего не найдено по запросу «{search}»</div>
      )}

      {/* Custom ID row */}
      <div className={styles.customRow}>
        <input
          className={styles.customInput}
          type="text"
          placeholder="Символ-заглушка"
          value={customFallback}
          onChange={e => setCustomFallback(e.target.value)}
          style={{ flex: '0 0 120px' }}
        />
        <input
          className={styles.customInput}
          type="text"
          placeholder="Свой ID (custom_emoji_id)"
          value={customId}
          onChange={e => setCustomId(e.target.value)}
        />
        <button
          className={styles.customBtn}
          disabled={!customFallback.trim()}
          onClick={handleCustomInsert}
        >
          Вставить
        </button>
      </div>
    </div>
  );
}
