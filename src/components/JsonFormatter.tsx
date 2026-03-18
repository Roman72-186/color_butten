import { useState, useCallback, useMemo, useRef } from 'react';
import styles from '../styles/JsonFormatter.module.css';

interface PathEntry {
  path: string;
  value: string;
}

function extractPaths(obj: unknown, prefix = ''): PathEntry[] {
  const paths: PathEntry[] = [];

  if (obj === null || obj === undefined) {
    paths.push({ path: prefix || '(root)', value: 'null' });
    return paths;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      paths.push({ path: prefix || '(root)', value: '[]' });
      return paths;
    }
    obj.forEach((item, index) => {
      const newPath = prefix ? `${prefix}.${index}` : String(index);
      paths.push(...extractPaths(item, newPath));
    });
    return paths;
  }

  if (typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>);
    if (entries.length === 0) {
      paths.push({ path: prefix || '(root)', value: '{}' });
      return paths;
    }
    for (const [key, value] of entries) {
      const newPath = prefix ? `${prefix}.${key}` : key;
      paths.push(...extractPaths(value, newPath));
    }
    return paths;
  }

  paths.push({ path: prefix || '(root)', value: String(obj) });
  return paths;
}

function cleanJsonInput(text: string): string {
  let cleaned = text;

  // Remove BOM and zero-width characters
  cleaned = cleaned.replace(/[\uFEFF\u200B\u200C\u200D\u00AD]/g, '');

  // Replace smart/curly quotes with straight quotes
  cleaned = cleaned.replace(/[\u201C\u201D\u00AB\u00BB]/g, '"');
  cleaned = cleaned.replace(/[\u2018\u2019]/g, "'");

  // Replace non-breaking spaces with regular spaces
  cleaned = cleaned.replace(/\u00A0/g, ' ');

  // Strip everything before first { or [ and after last } or ]
  const firstBrace = cleaned.search(/[{[]/);
  if (firstBrace === -1) return cleaned;

  const lastClose = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
  if (lastClose === -1 || lastClose < firstBrace) return cleaned;

  cleaned = cleaned.substring(firstBrace, lastClose + 1);

  return cleaned;
}

export function JsonFormatter() {
  const [input, setInput] = useState('');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const validation = useMemo(() => {
    const trimmed = input.trim();
    if (!trimmed) return { valid: false, error: null, parsed: null };

    try {
      const parsed: unknown = JSON.parse(trimmed);
      return { valid: true, error: null, parsed };
    } catch (e) {
      const msg = e instanceof SyntaxError ? e.message : 'Неизвестная ошибка парсинга';
      return { valid: false, error: msg, parsed: null };
    }
  }, [input]);

  const formatted = useMemo(() => {
    if (!validation.valid || validation.parsed === null) return '';
    return JSON.stringify(validation.parsed, null, 2);
  }, [validation]);

  const paths = useMemo(() => {
    if (!validation.valid || validation.parsed === null) return [];
    return extractPaths(validation.parsed);
  }, [validation]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData('text/plain');
    if (!pasted) return;

    e.preventDefault();
    const cleaned = cleanJsonInput(pasted);
    setInput(cleaned);
  }, []);

  const handleClean = useCallback(() => {
    setInput(prev => cleanJsonInput(prev));
  }, []);

  const handleFormat = useCallback(() => {
    if (formatted) {
      setInput(formatted);
    }
  }, [formatted]);

  const handleCopyPath = useCallback((path: string) => {
    try {
      navigator.clipboard.writeText(path).then(() => {
        setCopiedPath(path);
        setTimeout(() => setCopiedPath(null), 1500);
      });
    } catch {
      // clipboard not available
    }
  }, []);

  return (
    <div className={styles.formatter}>
      <textarea
        ref={textareaRef}
        className={`${styles.textarea} ${validation.error ? styles.textareaError : ''}`}
        value={input}
        onChange={e => setInput(e.target.value)}
        onPaste={handlePaste}
        placeholder='Вставьте JSON для проверки и получения путей...'
        rows={10}
      />

      {validation.error && (
        <div className={styles.error}>{validation.error}</div>
      )}

      <div className={styles.actions}>
        <button
          className={styles.cleanBtn}
          onClick={handleClean}
          disabled={!input.trim()}
        >
          Очистить
        </button>
        <button
          className={styles.formatBtn}
          onClick={handleFormat}
          disabled={!validation.valid}
        >
          Форматировать
        </button>
      </div>

      {paths.length > 0 && (
        <div className={styles.pathsSection}>
          <div className={styles.pathsTitle}>Пути параметров (нажмите для копирования)</div>
          <div className={styles.pathsList}>
            {paths.map((entry, index) => (
              <div
                key={index}
                className={`${styles.pathRow} ${copiedPath === entry.path ? styles.pathCopied : ''}`}
                onClick={() => handleCopyPath(entry.path)}
              >
                <span className={styles.pathKey}>{entry.path}</span>
                <span className={styles.pathValue}>
                  {copiedPath === entry.path ? '\u2713 Скопировано' : entry.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
