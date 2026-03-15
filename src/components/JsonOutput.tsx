import { useState, useCallback } from 'react';
import styles from '../styles/JsonOutput.module.css';

interface JsonOutputProps {
  json: string;
  hasErrors: boolean;
  onCopy: () => void;
}

export function JsonOutput({ json, hasErrors, onCopy }: JsonOutputProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    onCopy();
    if (hasErrors) return;

    try {
      navigator.clipboard.writeText(json).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch {
      // clipboard not available
    }
  }, [json, hasErrors, onCopy]);

  return (
    <div className={styles.jsonOutput}>
      <div className={styles.header}>
        <div className={styles.title}>Результат JSON</div>
        <button
          className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
          onClick={handleCopy}
        >
          {copied ? '✓ Скопировано' : 'Скопировать'}
        </button>
      </div>
      <pre className={styles.pre}>{json}</pre>
      {hasErrors && (
        <div className={styles.warning}>
          Исправьте ошибки валидации перед копированием
        </div>
      )}
    </div>
  );
}
