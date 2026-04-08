import { useState, useCallback, useRef, useMemo } from 'react';
import {
  applyTextFormat,
  convertClipboardHtml,
  FORMAT_BUTTONS,
  insertCustomEmoji,
  looksLikeTelegramMarkup,
  normalizeTextFormattingInput,
  textToPreviewHtml,
  validateFormattedText,
  type FormatMode,
  type FormatType,
} from '../utils/textFormatting';
import { EmojiPicker } from './EmojiPicker';
import styles from '../styles/TextFormatter.module.css';

export function TextFormatter() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<FormatMode>('html');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const normalizedText = useMemo(() => normalizeTextFormattingInput(text, mode), [text, mode]);
  const textErrors = useMemo(() => validateFormattedText(normalizedText, mode), [normalizedText, mode]);

  const trackSelection = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    lastSelectionRef.current = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    };
  }, []);

  const applyFormat = useCallback((type: FormatType) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    let url: string | undefined;
    if (type === 'link') {
      url = prompt('Введите URL:', 'https://') ?? undefined;
      if (!url) return;
    }

    const result = applyTextFormat(
      text, mode, type,
      textarea.selectionStart, textarea.selectionEnd, url
    );
    setText(result.text);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = result.selectionStart;
      textarea.selectionEnd = result.selectionEnd;
      lastSelectionRef.current = { start: result.selectionStart, end: result.selectionEnd };
    });
  }, [text, mode]);

  const handleEmojiInsert = useCallback((fallback: string, id: string) => {
    const { start, end } = lastSelectionRef.current;

    let newText: string;
    let newPos: number;

    if (id) {
      // Premium animated emoji
      const result = insertCustomEmoji(text, mode, id, fallback, start, end);
      newText = result.text;
      newPos = result.selectionStart;
    } else {
      // Просто Unicode символ
      newText = text.substring(0, start) + fallback + text.substring(end);
      newPos = start + [...fallback].length;
    }

    setText(newText);
    setEmojiPickerOpen(false);

    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.selectionStart = newPos;
      textarea.selectionEnd = newPos;
      lastSelectionRef.current = { start: newPos, end: newPos };
    });
  }, [text, mode]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const html = e.clipboardData.getData('text/html');
    const plain = e.clipboardData.getData('text/plain');

    const markup = html || (looksLikeTelegramMarkup(plain) ? plain : '');
    if (!markup) return;

    e.preventDefault();

    const converted = convertClipboardHtml(markup, mode);
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
      lastSelectionRef.current = { start: newPos, end: newPos };
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
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => undefined);
  }, [normalizedText, text, textErrors]);

  const previewHtml = useMemo(() => textToPreviewHtml(normalizedText, mode), [normalizedText, mode]);

  const handleBlur = useCallback(() => {
    trackSelection();
    if (normalizedText !== text) setText(normalizedText);
  }, [normalizedText, text, trackSelection]);

  return (
    <div className={styles.formatter}>
      <div className={styles.modeSelect}>
        <select
          className={styles.modeSelectEl}
          value={mode}
          onChange={e => setMode(e.target.value as FormatMode)}
        >
          <option value="html">HTML</option>
          <option value="markdown">MarkdownV2</option>
        </select>
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
        <button
          className={`${styles.fmtBtn} ${emojiPickerOpen ? styles.fmtBtnActive : ''}`}
          title="Вставить emoji"
          onClick={() => setEmojiPickerOpen(v => !v)}
        >
          ✨ emoji
        </button>
      </div>

      {emojiPickerOpen && (
        <EmojiPicker onInsert={handleEmojiInsert} />
      )}

      <div className={styles.hint}>
        Вставка из Word, Google Docs и браузеров автоматически переносит жирный, курсив,
        ссылки и абзацы. Telegram Desktop не передаёт форматирование в буфер обмена.
      </div>

      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onKeyUp={trackSelection}
        onMouseUp={trackSelection}
        onSelect={trackSelection}
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

      {text.trim() && (
        <div className={styles.output}>
          <div className={styles.previewTitle}>Что скопируется</div>
          <div className={styles.outputContent}>
            {normalizedText.split('\n').map((line, i, arr) => (
              <span key={i}>
                {line}
                {i < arr.length - 1 && <span className={styles.lineBreak}>%0a</span>}
              </span>
            ))}
          </div>
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
