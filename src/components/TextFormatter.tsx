import { useState, useCallback, useRef, useMemo } from 'react';
import {
  applyTextFormat,
  convertClipboardHtml,
  FORMAT_BUTTONS,
  normalizeTextFormattingInput,
  textToPreviewHtml,
  validateFormattedText,
  type FormatMode,
  type FormatType,
} from '../utils/textFormatting';
import styles from '../styles/TextFormatter.module.css';

export function TextFormatter() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<FormatMode>('html');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const normalizedText = useMemo(() => normalizeTextFormattingInput(text, mode), [text, mode]);
  const textErrors = useMemo(() => validateFormattedText(normalizedText, mode), [normalizedText, mode]);

  const applyFormat = useCallback((type: FormatType) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    let url: string | undefined;
    if (type === 'link') {
      url = prompt('Введите URL:', 'https://') ?? undefined;
      if (!url) return;
    }

    const result = applyTextFormat(
      text,
      mode,
      type,
      textarea.selectionStart,
      textarea.selectionEnd,
      url
    );

    setText(result.text);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = result.selectionStart;
      textarea.selectionEnd = result.selectionEnd;
    });
  }, [text, mode]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const html = e.clipboardData.getData('text/html');
    if (!html) return;

    e.preventDefault();

    const converted = convertClipboardHtml(html, mode);
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = text.substring(0, start) + converted + text.substring(end);

    setText(newText);

    requestAnimationFrame(() => {
      const newPos = start + converted.length;
      textarea.selectionStart = newPos;
      textarea.selectionEnd = newPos;
      textarea.focus();
    });
  }, [text, mode]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b': e.preventDefault(); applyFormat('bold'); break;
        case 'i': e.preventDefault(); applyFormat('italic'); break;
        case 'u': e.preventDefault(); applyFormat('underline'); break;
      }
    }
  }, [applyFormat]);

  const handleCopy = useCallback(() => {
    if (!text.trim() || textErrors.length > 0) return;

    const output = normalizedText.replace(/\n/g, '%0a');

    try {
      navigator.clipboard.writeText(output).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch {
      // clipboard not available
    }
  }, [normalizedText, text, textErrors]);

  const previewHtml = useMemo(() => textToPreviewHtml(normalizedText, mode), [normalizedText, mode]);

  const handleBlur = useCallback(() => {
    if (mode === 'html' && normalizedText !== text) {
      setText(normalizedText);
    }
  }, [mode, normalizedText, text]);

  return (
    <div className={styles.formatter}>
      <div className={styles.modeToggle}>
        <button
          className={`${styles.modeBtn} ${mode === 'html' ? styles.modeActive : ''}`}
          onClick={() => setMode('html')}
        >
          HTML
        </button>
        <button
          className={`${styles.modeBtn} ${mode === 'markdown' ? styles.modeActive : ''}`}
          onClick={() => setMode('markdown')}
        >
          MarkdownV2
        </button>
      </div>

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
        Вставка из Word, Google Docs и других редакторов автоматически переносит жирный, курсив,
        ссылки, переносы строк и абзацы в Telegram-разметку.
      </div>

      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={handleBlur}
        placeholder="Вставьте текст с форматированием или введите вручную..."
        rows={8}
      />

      {text.trim() && (
        <div className={styles.preview}>
          <div className={styles.previewTitle}>Предпросмотр</div>
          <div
            className={styles.previewContent}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      )}

      {textErrors.length > 0 && (
        <div className={styles.errors}>
          {textErrors.map((err, i) => (
            <div key={i} className={styles.errorItem}>{err}</div>
          ))}
        </div>
      )}

      <button
        className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
        onClick={handleCopy}
        disabled={!text.trim() || textErrors.length > 0}
      >
        {copied ? '\u2713 Скопировано' : 'Скопировать текст'}
      </button>
    </div>
  );
}
