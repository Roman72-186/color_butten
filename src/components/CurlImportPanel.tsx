import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './CurlImportPanel.module.css';
import { parseCurl, type CurlPair, type ParsedCurl } from '../utils/curlParser';

const EXAMPLE_CURL = `curl -X POST 'https://api.example.com/v1/orders' \\
  -H 'Authorization: Bearer TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"order_id": 42, "sum": 1500}'`;

const METHOD_COLORS: Record<string, string> = {
  GET: 'var(--success)',
  POST: 'var(--accent)',
  PUT: 'var(--warning)',
  PATCH: 'var(--warning)',
  DELETE: 'var(--danger)',
};

const BODY_KIND_LABELS: Record<ParsedCurl['bodyKind'], string> = {
  none: 'без тела',
  json: 'JSON',
  form: 'форма',
  multipart: 'форма с файлами',
  raw: 'текст',
};

function CopyButton({ value, title }: { value: string; title: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }).catch(() => undefined);
  }, [value]);

  return (
    <button
      type="button"
      className={`${styles.copyBtn} ${copied ? styles.copyBtnDone : ''}`}
      onClick={handleCopy}
      aria-label={`Скопировать ${title}`}
    >
      {copied ? 'Готово' : 'Копировать'}
    </button>
  );
}

function PairList({ pairs }: { pairs: CurlPair[] }) {
  return (
    <div className={styles.pairList}>
      {pairs.map((pair, index) => (
        <div className={styles.pairRow} key={`${pair.name}-${index}`}>
          <div className={styles.pairName}>{pair.name}</div>
          <div className={styles.pairValue}>{pair.value || '(пусто)'}</div>
          <CopyButton value={pair.value} title={`значение ${pair.name}`} />
        </div>
      ))}
    </div>
  );
}

interface CurlImportPanelProps {
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export function CurlImportPanel({ isOpen, onOpenChange }: CurlImportPanelProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [input, setInput] = useState('');
  const [parsed, setParsed] = useState<ParsedCurl | null>(null);
  const [error, setError] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const open = isOpen ?? uncontrolledOpen;

  const setOpen = useCallback((next: boolean) => {
    if (isOpen === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    if (!open) return;

    const frame = requestAnimationFrame(() => {
      cardRef.current?.scrollIntoView({ block: 'start' });
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const handleParse = useCallback(() => {
    const result = parseCurl(input);
    if (result.ok) {
      setParsed(result.data);
      setError('');
    } else {
      setParsed(null);
      setError(result.error);
    }
  }, [input]);

  const handleClear = useCallback(() => {
    setInput('');
    setParsed(null);
    setError('');
  }, []);

  const handleExample = useCallback(() => {
    setInput(EXAMPLE_CURL);
    setParsed(null);
    setError('');
  }, []);

  const headersJson = parsed
    ? JSON.stringify(Object.fromEntries(parsed.headers.map(h => [h.name, h.value])), null, 2)
    : '';

  return (
    <div ref={cardRef} className={styles.card}>
      <div
        className={styles.header}
        onClick={() => setOpen(!open)}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(!open);
          }
        }}
      >
        <div>
          <div className={styles.title}>Разобрать curl</div>
          <div className={styles.subtitle}>
            Вставьте пример из документации – разложу его по полям HTTP-блока
          </div>
        </div>
        <span className={styles.arrow}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div className={styles.body}>
          <textarea
            ref={inputRef}
            className={styles.input}
            rows={6}
            value={input}
            placeholder={EXAMPLE_CURL}
            onChange={e => setInput(e.target.value)}
            spellCheck={false}
          />

          <div className={styles.actions}>
            <button type="button" className={styles.primaryBtn} onClick={handleParse}>
              Разобрать
            </button>
            <button type="button" className={styles.secondaryBtn} onClick={handleExample}>
              Пример
            </button>
            <button type="button" className={styles.secondaryBtn} onClick={handleClear}>
              Очистить
            </button>
          </div>

          {error && <div className={styles.errorBox}>{error}</div>}

          {/* Разобранное — это чужой запрос из документации, в аналитику он не идёт. */}
          {parsed && (
            <div className={styles.result} data-analytics-skip>
              <div className={styles.block}>
                <div className={styles.blockHeader}>
                  <div className={styles.blockTitle}>Метод</div>
                  <span className={styles.badge} style={{ color: METHOD_COLORS[parsed.method] ?? 'var(--text-muted)' }}>
                    {parsed.method}
                  </span>
                </div>
              </div>

              <div className={styles.block}>
                <div className={styles.blockHeader}>
                  <div className={styles.blockTitle}>Адрес без параметров</div>
                  <CopyButton value={parsed.url} title="адрес" />
                </div>
                <pre className={styles.pre}>{parsed.url}</pre>
              </div>

              {parsed.query.length > 0 && (
                <div className={styles.block}>
                  <div className={styles.blockHeader}>
                    <div className={styles.blockTitle}>Параметры адреса ({parsed.query.length})</div>
                    <CopyButton value={parsed.rawUrl} title="адрес целиком" />
                  </div>
                  <PairList pairs={parsed.query} />
                  <div className={styles.hint}>
                    Кнопка у заголовка копирует адрес целиком – пригодится, если в блоке одно поле под URL.
                  </div>
                </div>
              )}

              {parsed.headers.length > 0 && (
                <div className={styles.block}>
                  <div className={styles.blockHeader}>
                    <div className={styles.blockTitle}>Заголовки ({parsed.headers.length})</div>
                    <CopyButton value={headersJson} title="заголовки одним JSON" />
                  </div>
                  <PairList pairs={parsed.headers} />
                </div>
              )}

              {parsed.bodyKind !== 'none' && (
                <div className={styles.block}>
                  <div className={styles.blockHeader}>
                    <div className={styles.blockTitle}>Тело ({BODY_KIND_LABELS[parsed.bodyKind]})</div>
                    <CopyButton value={parsed.body} title="тело запроса" />
                  </div>
                  <pre className={styles.pre}>{parsed.body}</pre>
                  {parsed.contentType && (
                    <div className={styles.hint}>Content-Type: {parsed.contentType}</div>
                  )}
                </div>
              )}

              {parsed.bodyKind === 'none' && (
                <div className={styles.hint}>Тела у запроса нет – поле тела в блоке оставьте пустым.</div>
              )}

              {parsed.warnings.length > 0 && (
                <div className={styles.warningBox}>
                  <div className={styles.blockTitle}>Что стоит проверить</div>
                  <ul className={styles.warningList}>
                    {parsed.warnings.map((warning, index) => (
                      <li key={`${warning.code}-${index}`}>{warning.message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
