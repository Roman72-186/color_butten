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
  const [debugPaste, setDebugPaste] = useState<{ html: string; plain: string } | null>(null);
  const [showDebug, setShowDebug] = useState(false);

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

    setDebugPaste({ html, plain });

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
    if (mode === 'html' && normalizedText !== text) setText(normalizedText);
  }, [mode, normalizedText, text, trackSelection]);

  return (
    <div className={styles.formatter}>
      <div className={styles.modeToggle}>
        <button
          className={`${styles.modeBtn} ${mode === 'html' ? styles.modeActive : ''}`}
          onClick={() => setMode('html')}
        >HTML</button>
        <button
          className={`${styles.modeBtn} ${mode === 'markdown' ? styles.modeActive : ''}`}
          onClick={() => setMode('markdown')}
        >MarkdownV2</button>
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
        <button
          className={`${styles.fmtBtn} ${showDebug ? styles.fmtBtnActive : ''}`}
          title="Инспектор буфера обмена"
          onClick={() => setShowDebug(v => !v)}
        >
          📋
        </button>
      </div>

      {showDebug && (
        <div style={{ background: '#020408', border: '1px solid #1a3a4a', borderRadius: 6, padding: 10, fontSize: 11, fontFamily: 'Share Tech Mono, monospace', color: '#88b8d4', wordBreak: 'break-all' }}>
          <div style={{ color: '#00f5ff', marginBottom: 4 }}>Инспектор буфера обмена</div>
          {debugPaste ? (
            <>
              <div><span style={{ color: '#ff00cc' }}>text/html</span> ({debugPaste.html.length} байт):</div>
              <div style={{ background: '#04060f', padding: '4px 6px', margin: '2px 0 8px', borderRadius: 3, maxHeight: 120, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{debugPaste.html || '(пусто)'}</div>
              <div><span style={{ color: '#ff00cc' }}>text/plain</span> ({debugPaste.plain.length} байт):</div>
              <div style={{ background: '#04060f', padding: '4px 6px', margin: '2px 0', borderRadius: 3, maxHeight: 80, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{debugPaste.plain || '(пусто)'}</div>
            </>
          ) : (
            <div style={{ color: '#6090ac' }}>Вставьте текст — здесь появится содержимое буфера</div>
          )}
        </div>
      )}

      {emojiPickerOpen && (
        <EmojiPicker onInsert={handleEmojiInsert} />
      )}

      <div className={styles.hint}>
        Вставка из Telegram, Word, Google Docs и других редакторов автоматически переносит
        жирный, курсив, ссылки, tg-emoji и абзацы в Telegram-разметку.
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
