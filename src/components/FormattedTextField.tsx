import { useCallback, useMemo, useRef } from 'react';
import type { RequestParseMode } from '../types/requestBuilder';
import {
  applyTextFormat,
  convertClipboardHtml,
  FORMAT_BUTTONS,
  getFormatModeFromParseMode,
  looksLikeTelegramMarkup,
  normalizeTextFormattingInput,
  textToPreviewHtml,
  validateFormattedText,
  type FormatType,
} from '../utils/textFormatting';
import styles from '../styles/FormattedTextField.module.css';

interface FormattedTextFieldProps {
  value: string;
  parseMode: RequestParseMode;
  placeholder: string;
  rows?: number;
  onChange: (value: string) => void;
}

export function FormattedTextField({
  value,
  parseMode,
  placeholder,
  rows = 5,
  onChange,
}: FormattedTextFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formatMode = useMemo(() => getFormatModeFromParseMode(parseMode), [parseMode]);
  const normalizedValue = useMemo(
    () => (formatMode ? normalizeTextFormattingInput(value, formatMode) : value),
    [formatMode, value]
  );
  const textErrors = useMemo(
    () => (formatMode ? validateFormattedText(normalizedValue, formatMode, { validatePercentEncoding: false }) : []),
    [normalizedValue, formatMode]
  );
  const previewHtml = useMemo(
    () => (formatMode && normalizedValue.trim() ? textToPreviewHtml(normalizedValue, formatMode) : ''),
    [normalizedValue, formatMode]
  );

  const applyFormat = useCallback((type: FormatType) => {
    const textarea = textareaRef.current;
    if (!textarea || !formatMode) return;

    let url: string | undefined;
    if (type === 'link') {
      url = prompt('Введите URL:', 'https://') ?? undefined;
      if (!url) return;
    }

    const result = applyTextFormat(
      value,
      formatMode,
      type,
      textarea.selectionStart,
      textarea.selectionEnd,
      url
    );

    onChange(result.text);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = result.selectionStart;
      textarea.selectionEnd = result.selectionEnd;
    });
  }, [formatMode, onChange, value]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!formatMode) return;

    const html = e.clipboardData.getData('text/html');
    const plain = e.clipboardData.getData('text/plain');

    const markup = html || (looksLikeTelegramMarkup(plain) ? plain : '');
    if (!markup) return;

    e.preventDefault();

    const converted = convertClipboardHtml(markup, formatMode);
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = value.substring(0, start) + converted + value.substring(end);

    onChange(newText);

    requestAnimationFrame(() => {
      const newPos = start + converted.length;
      textarea.selectionStart = newPos;
      textarea.selectionEnd = newPos;
      textarea.focus();
    });
  }, [formatMode, onChange, value]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!formatMode) return;

    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          applyFormat('bold');
          break;
        case 'i':
          e.preventDefault();
          applyFormat('italic');
          break;
        case 'u':
          e.preventDefault();
          applyFormat('underline');
          break;
      }
    }
  }, [applyFormat, formatMode]);

  const handleBlur = useCallback(() => {
    if (!formatMode) {
      return;
    }

    if (normalizedValue !== value) {
      onChange(normalizedValue);
    }
  }, [formatMode, normalizedValue, onChange, value]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.title}>Форматирование текста</div>
        <div className={styles.modeBadge}>{parseMode || 'Без parse_mode'}</div>
      </div>

      {formatMode ? (
        <>
          <div className={styles.toolbar}>
            {FORMAT_BUTTONS.map(btn => (
              <button
                key={btn.type}
                className={styles.fmtBtn}
                style={btn.style}
                title={btn.title}
                onClick={() => applyFormat(btn.type)}
              >
                {btn.label}
              </button>
            ))}
          </div>
          <div className={styles.hint}>
            Вставка из Word, Docs и редакторов с rich text автоматически переносит жирный,
            курсив, ссылки и структуру абзацев в Telegram-разметку.
          </div>
        </>
      ) : (
        <div className={styles.hint}>
          Выберите `HTML`, `Markdown` или `MarkdownV2` в parse_mode, чтобы использовать форматирование.
        </div>
      )}

      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />

      {textErrors.length > 0 && (
        <div className={styles.errors}>
          {textErrors.map(err => (
            <div key={err} className={styles.errorItem}>{err}</div>
          ))}
        </div>
      )}

      {previewHtml && (
        <div className={styles.preview}>
          <div className={styles.previewTitle}>Предпросмотр</div>
          <div
            className={styles.previewContent}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      )}
    </div>
  );
}
