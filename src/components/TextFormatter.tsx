import { useState, useCallback, useRef, useMemo } from 'react';
import {
  applyTextFormat,
  convertClipboardHtml,
  FORMAT_BUTTONS,
  insertCustomEmoji,
  normalizeTextFormattingInput,
  textToPreviewHtml,
  validateFormattedText,
  type FormatMode,
  type FormatType,
} from '../utils/textFormatting';
import { PREMIUM_EMOJI_OPTIONS } from '../constants';
import styles from '../styles/TextFormatter.module.css';

interface ExtractedEmoji {
  id: string;
  fallback: string;
}

export function TextFormatter() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<FormatMode>('html');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  // ── Emoji picker state ──────────────────────────────────────────────────────
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiCustomMode, setEmojiCustomMode] = useState(false);
  const [selectedEmojiId, setSelectedEmojiId] = useState('');
  const [customEmojiId, setCustomEmojiId] = useState('');
  const [customEmojiFallback, setCustomEmojiFallback] = useState('');

  // ── Extractor state ─────────────────────────────────────────────────────────
  const [extractorOpen, setExtractorOpen] = useState(false);
  const [extractedEmojis, setExtractedEmojis] = useState<ExtractedEmoji[]>([]);
  const [extractedInserted, setExtractedInserted] = useState<string | null>(null);

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
      lastSelectionRef.current = { start: result.selectionStart, end: result.selectionEnd };
    });
  }, [text, mode]);

  const handleEmojiSelectChange = useCallback((val: string) => {
    if (val === 'custom') {
      setEmojiCustomMode(true);
      setSelectedEmojiId('');
    } else {
      setEmojiCustomMode(false);
      setSelectedEmojiId(val);
    }
  }, []);

  const doInsertEmoji = useCallback((id: string, fallback: string) => {
    const { start, end } = lastSelectionRef.current;
    const result = insertCustomEmoji(text, mode, id, fallback, start, end);
    setText(result.text);
    setEmojiPickerOpen(false);
    setExtractorOpen(false);

    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.selectionStart = result.selectionStart;
      textarea.selectionEnd = result.selectionEnd;
      lastSelectionRef.current = { start: result.selectionStart, end: result.selectionEnd };
    });
  }, [text, mode]);

  const handleInsertEmoji = useCallback(() => {
    const id = emojiCustomMode ? customEmojiId.trim() : selectedEmojiId;
    if (!id) return;
    const fallback = emojiCustomMode
      ? (customEmojiFallback || '⭐')
      : (PREMIUM_EMOJI_OPTIONS.find(o => o.id === id)?.fallback ?? '⭐');
    doInsertEmoji(id, fallback);
  }, [emojiCustomMode, customEmojiId, customEmojiFallback, selectedEmojiId, doInsertEmoji]);

  // ── Extract IDs from pasted Telegram text ──────────────────────────────────
  const handleExtractPaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');

    if (!html) {
      setExtractedEmojis([]);
      return;
    }

    const matches = [...html.matchAll(/<tg-emoji\s+emoji-id="(\d+)"[^>]*>([\s\S]*?)<\/tg-emoji>/gi)];

    // deduplicate by ID
    const seen = new Set<string>();
    const extracted: ExtractedEmoji[] = [];
    for (const m of matches) {
      const id = m[1];
      if (!seen.has(id)) {
        seen.add(id);
        // strip any inner HTML tags to get plain fallback char
        const fallback = m[2].replace(/<[^>]+>/g, '').trim() || '?';
        extracted.push({ id, fallback });
      }
    }

    setExtractedEmojis(extracted);
  }, []);

  const handleInsertExtracted = useCallback((emoji: ExtractedEmoji) => {
    doInsertEmoji(emoji.id, emoji.fallback);
    setExtractedInserted(emoji.id);
    setTimeout(() => setExtractedInserted(null), 1500);
  }, [doInsertEmoji]);

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
    trackSelection();
    if (mode === 'html' && normalizedText !== text) {
      setText(normalizedText);
    }
  }, [mode, normalizedText, text, trackSelection]);

  const canInsertEmoji = emojiCustomMode
    ? customEmojiId.trim().length > 0
    : selectedEmojiId.length > 0;

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
        <button
          className={`${styles.fmtBtn} ${emojiPickerOpen ? styles.fmtBtnActive : ''}`}
          title="Вставить premium emoji из списка"
          onClick={() => { setEmojiPickerOpen(v => !v); setExtractorOpen(false); }}
        >
          ✨ emoji
        </button>
        <button
          className={`${styles.fmtBtn} ${extractorOpen ? styles.fmtBtnActive : ''}`}
          title="Вставить текст из Telegram и получить ID emoji"
          onClick={() => { setExtractorOpen(v => !v); setEmojiPickerOpen(false); }}
        >
          📋 ID из Telegram
        </button>
      </div>

      {/* ── Emoji picker ──────────────────────────────────────────────────── */}
      {emojiPickerOpen && (
        <div className={styles.emojiPicker}>
          <div className={styles.emojiPickerRow}>
            <select
              className={styles.emojiSelect}
              value={emojiCustomMode ? 'custom' : selectedEmojiId}
              onChange={e => handleEmojiSelectChange(e.target.value)}
            >
              <option value="">— выберите emoji —</option>
              {PREMIUM_EMOJI_OPTIONS.map(o => (
                <option key={o.id} value={o.id}>
                  {o.fallback} {o.label}
                </option>
              ))}
              <option value="custom">✏️ Свой ID...</option>
            </select>
            <button
              className={styles.emojiInsertBtn}
              onClick={handleInsertEmoji}
              disabled={!canInsertEmoji}
            >
              Вставить
            </button>
          </div>

          {emojiCustomMode && (
            <div className={styles.emojiCustomRow}>
              <input
                type="text"
                className={styles.emojiCustomInput}
                placeholder="Числовой ID emoji"
                value={customEmojiId}
                onChange={e => setCustomEmojiId(e.target.value)}
              />
              <input
                type="text"
                className={styles.emojiCustomInput}
                placeholder="Символ-заглушка (1 emoji)"
                value={customEmojiFallback}
                onChange={e => setCustomEmojiFallback(e.target.value)}
              />
            </div>
          )}

          <div className={styles.emojiHint}>
            {mode === 'html'
              ? 'Вставит: <tg-emoji emoji-id="...">FALLBACK</tg-emoji>'
              : 'Вставит: ![FALLBACK](tg://emoji?id=...)'}
          </div>
        </div>
      )}

      {/* ── ID extractor ─────────────────────────────────────────────────── */}
      {extractorOpen && (
        <div className={styles.emojiPicker}>
          <div className={styles.extractorLabel}>
            Скопируй сообщение из Telegram с premium emoji и вставь сюда:
          </div>
          <textarea
            className={styles.extractorTextarea}
            placeholder="Вставьте текст из Telegram (Ctrl+V)..."
            rows={3}
            onPaste={handleExtractPaste}
            readOnly={extractedEmojis.length > 0}
            value={extractedEmojis.length > 0
              ? `Найдено emoji: ${extractedEmojis.length}`
              : ''}
            onChange={() => {}}
          />

          {extractedEmojis.length === 0 && (
            <div className={styles.emojiHint}>
              Работает с текстом скопированным из Telegram Desktop или Telegram Web.
              В буфере обмена содержится HTML с emoji-id.
            </div>
          )}

          {extractedEmojis.length > 0 && (
            <>
              <div className={styles.extractedList}>
                {extractedEmojis.map(emoji => (
                  <div key={emoji.id} className={styles.extractedItem}>
                    <span className={styles.extractedFallback}>{emoji.fallback}</span>
                    <span className={styles.extractedId}>{emoji.id}</span>
                    <button
                      className={`${styles.emojiInsertBtn} ${extractedInserted === emoji.id ? styles.emojiInsertedOk : ''}`}
                      onClick={() => handleInsertExtracted(emoji)}
                    >
                      {extractedInserted === emoji.id ? '✓' : 'Вставить'}
                    </button>
                    <button
                      className={styles.extractedCopyBtn}
                      onClick={() => navigator.clipboard.writeText(emoji.id)}
                      title="Скопировать ID"
                    >
                      ID
                    </button>
                  </div>
                ))}
              </div>
              <button
                className={styles.extractorClearBtn}
                onClick={() => setExtractedEmojis([])}
              >
                Очистить
              </button>
            </>
          )}
        </div>
      )}

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
