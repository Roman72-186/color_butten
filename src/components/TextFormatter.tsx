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
import { normalizeTelegramRichHtml, validateTelegramRichHtmlCompatibility } from '../utils/telegramRichHtml';
import type { RichMessageFormat } from '../types/requestBuilder';
import { EmojiPicker } from './EmojiPicker';
import { TextMarkupHelp } from './request-builder/TextMarkupHelp';
import { RichMarkupHelp } from './request-builder/RichMarkupHelp';
import styles from '../styles/TextFormatter.module.css';

// Режим редактора: обычное сообщение (HTML/MarkdownV2) или rich-сообщение Bot API 10.1.
// Rich живёт по другим правилам: блочная разметка (таблицы, <pre>, заголовки, LaTeX),
// копирование «как есть» без %0a-склейки, без обычных кнопок формата (они дают
// MarkdownV2-синтаксис, несовместимый с GitHub-style rich markdown).
type EditorMode = 'html' | 'markdown' | 'rich-html' | 'rich-markdown';
type RichFormatType = 'bold' | 'italic' | 'blockquote' | 'br' | 'paragraph';

const RICH_FORMAT_BUTTONS: Array<{
  type: RichFormatType;
  label: string;
  title: string;
}> = [
  { type: 'bold', label: 'B', title: 'Жирный' },
  { type: 'italic', label: 'I', title: 'Курсив' },
  { type: 'blockquote', label: 'quote', title: 'Цитата / blockquote' },
  { type: 'br', label: 'br', title: 'Перенос строки' },
  { type: 'paragraph', label: 'br br', title: 'Пустая строка / новый абзац' },
];

export function TextFormatter() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<EditorMode>('html');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const isRich = mode === 'rich-html' || mode === 'rich-markdown';
  // Обычные функции форматирования типизированы FormatMode — в rich-режиме они не
  // вызываются (тулбар/конвертация вставки скрыты), но значение нужно для типов.
  const normalMode: FormatMode = mode === 'markdown' ? 'markdown' : 'html';
  const richFormat: RichMessageFormat = mode === 'rich-markdown' ? 'markdown' : 'html';

  const normalizedText = useMemo(
    () => (isRich ? text : normalizeTextFormattingInput(text, normalMode)),
    [isRich, text, normalMode],
  );
  const textErrors = useMemo(
    () => (isRich ? [] : validateFormattedText(normalizedText, normalMode)),
    [isRich, normalizedText, normalMode],
  );
  // Псевдотаблицы из box-drawing — мягкое предупреждение, копирование не блокирует.
  const richWarnings = useMemo(
    () => (mode === 'rich-html' ? validateTelegramRichHtmlCompatibility(text) : []),
    [mode, text],
  );

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
      text, normalMode, type,
      textarea.selectionStart, textarea.selectionEnd, url
    );
    setText(result.text);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = result.selectionStart;
      textarea.selectionEnd = result.selectionEnd;
      lastSelectionRef.current = { start: result.selectionStart, end: result.selectionEnd };
    });
  }, [text, normalMode]);

  const applyRichFormat = useCallback((type: RichFormatType) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { start, end } = lastSelectionRef.current;
    const selected = text.substring(start, end);
    let formatted = selected;
    let selectionStart = start;
    let selectionEnd = end;

    if (mode === 'rich-html') {
      const htmlSelected = selected
        .replace(/\r\n?/g, '\n')
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g, '<br>');

      if (type === 'br' || type === 'paragraph') {
        const marker = type === 'br' ? '<br>' : '<br><br>';
        formatted = selected ? `${htmlSelected}${marker}` : marker;
        selectionStart = start + formatted.length;
        selectionEnd = selectionStart;
      } else {
        const tags: Partial<Record<RichFormatType, [string, string]>> = {
          bold: ['<b>', '</b>'],
          italic: ['<i>', '</i>'],
          blockquote: ['<blockquote>', '</blockquote>'],
        };
        const [open, close] = tags[type] ?? ['', ''];
        formatted = selected ? `${open}${htmlSelected}${close}` : `${open}${close}`;
        selectionStart = selected ? start : start + open.length;
        selectionEnd = selected ? start + formatted.length : selectionStart;
      }
    } else if (type === 'blockquote') {
      formatted = selected
        ? selected.split('\n').map(line => `> ${line}`).join('\n')
        : '> ';
      selectionStart = selected ? start : start + formatted.length;
      selectionEnd = selected ? start + formatted.length : selectionStart;
    } else if (type === 'br') {
      formatted = selected ? `${selected}<br>` : '<br>';
      selectionStart = start + formatted.length;
      selectionEnd = selectionStart;
    } else if (type === 'paragraph') {
      formatted = selected ? `${selected}<br><br>` : '<br><br>';
      selectionStart = start + formatted.length;
      selectionEnd = selectionStart;
    } else {
      const tags: Record<Extract<RichFormatType, 'bold' | 'italic'>, [string, string]> = {
        bold: ['**', '**'],
        italic: ['*', '*'],
      };
      const [open, close] = tags[type];
      formatted = selected ? `${open}${selected}${close}` : `${open}${close}`;
      selectionStart = selected ? start : start + open.length;
      selectionEnd = selected ? start + formatted.length : selectionStart;
    }

    const newText = text.substring(0, start) + formatted + text.substring(end);
    setText(newText);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = selectionStart;
      textarea.selectionEnd = selectionEnd;
      lastSelectionRef.current = { start: selectionStart, end: selectionEnd };
    });
  }, [mode, text]);

  const handleEmojiInsert = useCallback((fallback: string, id: string) => {
    const { start, end } = lastSelectionRef.current;

    let newText: string;
    let newPos: number;

    if (id) {
      // Premium animated emoji
      const result = insertCustomEmoji(text, normalMode, id, fallback, start, end);
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
  }, [text, normalMode]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // В rich-режиме не конвертируем вставку в обычную разметку — пользователь
    // вставляет rich-HTML/Markdown как есть (браузерная вставка по умолчанию).
    if (isRich) return;

    const html = e.clipboardData.getData('text/html');
    const plain = e.clipboardData.getData('text/plain');

    const markup = html || (looksLikeTelegramMarkup(plain) ? plain : '');
    if (!markup) return;

    e.preventDefault();

    const converted = convertClipboardHtml(markup, normalMode);
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
  }, [isRich, text, normalMode]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          if (isRich) {
            applyRichFormat('bold');
          } else {
            applyFormat('bold');
          }
          break;
        case 'i':
          e.preventDefault();
          if (isRich) {
            applyRichFormat('italic');
          } else {
            applyFormat('italic');
          }
          break;
        case 'u':
          if (!isRich) {
            e.preventDefault();
            applyFormat('underline');
          }
          break;
      }
    }
  }, [isRich, applyFormat, applyRichFormat]);

  const handleCopy = useCallback(() => {
    if (!text.trim()) return;

    // Rich HTML копируется в формате для rich_message.html: переносы нормализуются в <br>.
    // Rich Markdown копируется как есть, потому что там собственные markdown-правила.
    if (isRich) {
      const richOutput = mode === 'rich-html' ? normalizeTelegramRichHtml(text) : text;
      navigator.clipboard.writeText(richOutput).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => undefined);
      return;
    }

    if (textErrors.length > 0) return;
    const output = normalizedText.replace(/\n/g, '%0a');
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => undefined);
  }, [isRich, mode, normalizedText, text, textErrors]);

  const handleShare = useCallback(() => {
    const url = 'https://t.me/share/url?url=&text=' + encodeURIComponent(normalizedText);
    window.open(url, '_blank');
  }, [normalizedText]);

  const previewHtml = useMemo(
    () => (isRich ? '' : textToPreviewHtml(normalizedText, normalMode)),
    [isRich, normalizedText, normalMode],
  );

  const handleBlur = useCallback(() => {
    trackSelection();
    if (normalizedText !== text) setText(normalizedText);
  }, [normalizedText, text, trackSelection]);

  const copyDisabled = isRich ? !text.trim() : (!text.trim() || textErrors.length > 0);

  return (
    <div className={styles.formatter}>
      <div className={styles.modeSelect}>
        <select
          className={styles.modeSelectEl}
          value={mode}
          onChange={e => setMode(e.target.value as EditorMode)}
        >
          <option value="html">HTML</option>
          <option value="markdown">MarkdownV2</option>
          <option value="rich-html">Rich HTML (10.1)</option>
          <option value="rich-markdown">Rich Markdown (10.1)</option>
        </select>
      </div>

      {!isRich && (
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
      )}

      {isRich && (
        <div className={styles.toolbar}>
          {RICH_FORMAT_BUTTONS.map(btn => (
            <button
              key={btn.type}
              className={styles.fmtBtn}
              title={mode === 'rich-html' ? btn.title : `${btn.title} (Rich Markdown)`}
              onMouseDown={e => e.preventDefault()}
              onClick={() => applyRichFormat(btn.type)}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}

      {!isRich && emojiPickerOpen && (
        <EmojiPicker onInsert={handleEmojiInsert} />
      )}

      {!isRich && (
        <div className={styles.hint}>
          Вставка из Word, Google Docs и браузеров автоматически переносит жирный, курсив,
          ссылки и абзацы. Telegram Desktop не передаёт форматирование в буфер обмена.
        </div>
      )}

      {isRich && (
        <div className={styles.hint}>
          Выдели фрагмент в поле и нажми кнопку разметки. В Rich HTML используются безопасные теги
          <code> &lt;b&gt;</code>, <code> &lt;i&gt;</code>, <code> &lt;blockquote&gt;</code>,
          <code> &lt;br&gt;</code> и <code> &lt;br&gt;&lt;br&gt;</code>.
        </div>
      )}

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
        placeholder={isRich
          ? 'Введите rich-разметку (заголовки, таблицы, списки, цитаты, LaTeX)...'
          : 'Вставьте текст с форматированием или введите вручную...'}
        rows={8}
      />

      {isRich
        ? <RichMarkupHelp format={richFormat} />
        : <TextMarkupHelp platform="telegram" mode={mode === 'html' ? 'HTML' : 'MarkdownV2'} />}

      {!isRich && text.trim() && (
        <div className={styles.preview}>
          <div className={styles.previewTitle}>Предпросмотр</div>
          <div
            className={styles.previewContent}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      )}

      {mode === 'rich-html' && text.trim() && (
        <div className={styles.preview}>
          <div className={styles.previewTitle}>Предпросмотр (приблизительно, как отрисует браузер)</div>
          <div
            className={styles.previewContent}
            dangerouslySetInnerHTML={{ __html: text }}
          />
        </div>
      )}

      {!isRich && text.trim() && (
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

      {!isRich && textErrors.length > 0 && (
        <div className={styles.errors}>
          {textErrors.map((err, i) => (
            <div key={i} className={styles.errorItem}>{err}</div>
          ))}
        </div>
      )}

      {isRich && richWarnings.length > 0 && (
        <div className={styles.hint}>
          {richWarnings.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>
      )}

      <div className={styles.actions}>
        <button
          className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
          onClick={handleCopy}
          disabled={copyDisabled}
        >
          {copied ? '✓ Скопировано' : 'Скопировать'}
        </button>
        {!isRich && (
          <button
            className={styles.shareBtn}
            onClick={handleShare}
            disabled={!text.trim() || textErrors.length > 0}
          >
            Поделиться
          </button>
        )}
      </div>
    </div>
  );
}
