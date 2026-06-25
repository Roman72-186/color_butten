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
type RichFormatType =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'mark'
  | 'spoiler'
  | 'code'
  | 'pre'
  | 'sub'
  | 'sup'
  | 'math'
  | 'link'
  | 'reference'
  | 'anchor'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'paragraph'
  | 'blockquote'
  | 'aside'
  | 'details'
  | 'footer'
  | 'hr'
  | 'ul'
  | 'ol'
  | 'task'
  | 'taskDone'
  | 'br'
  | 'blank';

interface RichFormatButton {
  type: RichFormatType;
  label: string;
  title: string;
}

const RICH_FORMAT_GROUPS: Array<{ title: string; buttons: RichFormatButton[] }> = [
  {
    title: 'Текст',
    buttons: [
      { type: 'bold', label: 'B', title: 'Жирный' },
      { type: 'italic', label: 'I', title: 'Курсив' },
      { type: 'underline', label: 'U', title: 'Подчёркнутый' },
      { type: 'strike', label: 'S', title: 'Зачёркнутый' },
      { type: 'mark', label: 'mark', title: 'Выделение маркером' },
      { type: 'spoiler', label: 'spoiler', title: 'Спойлер' },
      { type: 'code', label: 'code', title: 'Инлайн-код' },
      { type: 'sub', label: 'sub', title: 'Нижний индекс' },
      { type: 'sup', label: 'sup', title: 'Верхний индекс' },
      { type: 'math', label: 'math', title: 'Формула LaTeX' },
      { type: 'link', label: 'link', title: 'Ссылка' },
    ],
  },
  {
    title: 'Блоки',
    buttons: [
      { type: 'h1', label: 'H1', title: 'Заголовок 1' },
      { type: 'h2', label: 'H2', title: 'Заголовок 2' },
      { type: 'h3', label: 'H3', title: 'Заголовок 3' },
      { type: 'h4', label: 'H4', title: 'Заголовок 4' },
      { type: 'h5', label: 'H5', title: 'Заголовок 5' },
      { type: 'h6', label: 'H6', title: 'Заголовок 6' },
      { type: 'paragraph', label: 'p', title: 'Абзац' },
      { type: 'blockquote', label: 'quote', title: 'Блочная цитата' },
      { type: 'aside', label: 'aside', title: 'Выносная цитата' },
      { type: 'details', label: 'details', title: 'Сворачиваемый блок' },
      { type: 'footer', label: 'footer', title: 'Подвал / примечание' },
      { type: 'hr', label: 'hr', title: 'Разделитель' },
    ],
  },
  {
    title: 'Списки',
    buttons: [
      { type: 'ul', label: 'ul', title: 'Маркированный список' },
      { type: 'ol', label: 'ol', title: 'Нумерованный список' },
      { type: 'task', label: '☐ task', title: 'Чеклист' },
      { type: 'taskDone', label: '☑ task', title: 'Выполненный пункт чеклиста' },
      { type: 'pre', label: 'pre', title: 'Блок кода' },
    ],
  },
  {
    title: 'Служебное',
    buttons: [
      { type: 'reference', label: 'ref', title: 'Сноска / reference' },
      { type: 'anchor', label: 'anchor', title: 'Якорь' },
      { type: 'br', label: 'br', title: 'Перенос строки' },
      { type: 'blank', label: 'br br', title: 'Пустая строка / новый абзац' },
    ],
  },
];

function escapeHtmlAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function normalizeRichHtmlSelection(selected: string): string {
  return selected
    .replace(/\r\n?/g, '\n')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
}

function getSelectedLines(selected: string, fallback = 'Пункт'): string[] {
  const lines = selected
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  return lines.length > 0 ? lines : [fallback];
}

export function TextFormatter() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<EditorMode>('rich-html');
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
    let formatted = '';
    let selectionStart = start;
    let selectionEnd = end;

    const replaceWith = (
      nextValue: string,
      options?: { innerStart?: number; innerEnd?: number; collapseToEnd?: boolean }
    ) => {
      formatted = nextValue;

      if (options?.collapseToEnd) {
        selectionStart = start + nextValue.length;
        selectionEnd = selectionStart;
        return;
      }

      if (options?.innerStart !== undefined) {
        selectionStart = start + options.innerStart;
        selectionEnd = start + (options.innerEnd ?? options.innerStart);
        return;
      }

      selectionStart = start;
      selectionEnd = start + nextValue.length;
    };

    if (mode === 'rich-html') {
      const htmlSelected = normalizeRichHtmlSelection(selected);

      const wrapHtml = (open: string, close: string, placeholder = 'Текст') => {
        const content = selected ? htmlSelected : placeholder;
        replaceWith(`${open}${content}${close}`, selected ? undefined : {
          innerStart: open.length,
          innerEnd: open.length + placeholder.length,
        });
      };

      const inlineTags: Partial<Record<RichFormatType, [string, string]>> = {
          bold: ['<b>', '</b>'],
          italic: ['<i>', '</i>'],
        underline: ['<u>', '</u>'],
        strike: ['<s>', '</s>'],
        mark: ['<mark>', '</mark>'],
        spoiler: ['<tg-spoiler>', '</tg-spoiler>'],
        code: ['<code>', '</code>'],
        sub: ['<sub>', '</sub>'],
        sup: ['<sup>', '</sup>'],
        math: ['<tg-math>', '</tg-math>'],
        pre: ['<pre>', '</pre>'],
        h1: ['<h1>', '</h1>'],
        h2: ['<h2>', '</h2>'],
        h3: ['<h3>', '</h3>'],
        h4: ['<h4>', '</h4>'],
        h5: ['<h5>', '</h5>'],
        h6: ['<h6>', '</h6>'],
        paragraph: ['<p>', '</p>'],
        blockquote: ['<blockquote>', '</blockquote>'],
        aside: ['<aside>', '</aside>'],
        footer: ['<footer>', '</footer>'],
        reference: ['<tg-reference name="note-1">', '</tg-reference>'],
      };

      if (inlineTags[type]) {
        const [open, close] = inlineTags[type];
        wrapHtml(open, close);
      } else if (type === 'link') {
        const url = prompt('Введите URL:', 'https://')?.trim();
        if (!url) return;
        const open = `<a href="${escapeHtmlAttribute(url)}">`;
        wrapHtml(open, '</a>', 'текст ссылки');
      } else if (type === 'anchor') {
        const name = prompt('Введите имя якоря:', 'chapter-1')?.trim();
        if (!name) return;
        replaceWith(`<a name="${escapeHtmlAttribute(name)}"></a>`, { collapseToEnd: true });
      } else if (type === 'details') {
        const summary = prompt('Заголовок details:', 'Подробнее')?.trim() || 'Подробнее';
        const open = `<details open><summary>${summary}</summary>`;
        wrapHtml(open, '</details>');
      } else if (type === 'hr') {
        replaceWith('<hr/>', { collapseToEnd: true });
      } else if (type === 'br' || type === 'blank') {
        const marker = type === 'br' ? '<br>' : '<br><br>';
        replaceWith(selected ? `${htmlSelected}${marker}` : marker, { collapseToEnd: true });
      } else if (type === 'ul' || type === 'ol') {
        const tag = type;
        const items = getSelectedLines(selected)
          .map(line => `<li>${normalizeRichHtmlSelection(line)}</li>`)
          .join('');
        replaceWith(`<${tag}>${items}</${tag}>`);
      } else if (type === 'task' || type === 'taskDone') {
        const checked = type === 'taskDone' ? ' checked' : '';
        const items = getSelectedLines(selected, 'Задача')
          .map(line => `<li><input type="checkbox"${checked}>${normalizeRichHtmlSelection(line)}</li>`)
          .join('');
        replaceWith(`<ul>${items}</ul>`);
      }
    } else {
      const wrapMarkdown = (open: string, close: string, placeholder = 'Текст') => {
        const content = selected || placeholder;
        replaceWith(`${open}${content}${close}`, selected ? undefined : {
          innerStart: open.length,
          innerEnd: open.length + placeholder.length,
        });
      };

      switch (type) {
        case 'bold':
          wrapMarkdown('**', '**');
          break;
        case 'italic':
          wrapMarkdown('*', '*');
          break;
        case 'underline':
          wrapMarkdown('<u>', '</u>');
          break;
        case 'strike':
          wrapMarkdown('~~', '~~');
          break;
        case 'mark':
          wrapMarkdown('==', '==');
          break;
        case 'spoiler':
          wrapMarkdown('||', '||');
          break;
        case 'code':
          wrapMarkdown('`', '`');
          break;
        case 'pre':
          wrapMarkdown('```\n', '\n```', 'код');
          break;
        case 'sub':
          wrapMarkdown('<sub>', '</sub>');
          break;
        case 'sup':
          wrapMarkdown('<sup>', '</sup>');
          break;
        case 'math':
          wrapMarkdown('$', '$', 'x^2 + y^2');
          break;
        case 'link': {
          const url = prompt('Введите URL:', 'https://')?.trim();
          if (!url) return;
          wrapMarkdown('[', `](${url})`, 'текст ссылки');
          break;
        }
        case 'reference':
          wrapMarkdown('<tg-reference name="note-1">', '</tg-reference>');
          break;
        case 'anchor': {
          const name = prompt('Введите имя якоря:', 'chapter-1')?.trim();
          if (!name) return;
          replaceWith(`<a name="${escapeHtmlAttribute(name)}"></a>`, { collapseToEnd: true });
          break;
        }
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6': {
          const level = Number(type.slice(1));
          const prefix = `${'#'.repeat(level)} `;
          const lines = selected
            ? selected.replace(/\r\n?/g, '\n').split('\n').map(line => `${prefix}${line}`).join('\n')
            : prefix;
          replaceWith(lines, selected ? undefined : { collapseToEnd: true });
          break;
        }
        case 'paragraph':
          replaceWith(selected ? `${selected}\n\n` : '\n\n', { collapseToEnd: true });
          break;
        case 'blockquote': {
          const quote = selected
            ? selected.replace(/\r\n?/g, '\n').split('\n').map(line => `> ${line}`).join('\n')
            : '> ';
          replaceWith(quote, selected ? undefined : { collapseToEnd: true });
          break;
        }
        case 'aside':
          wrapMarkdown('<aside>', '</aside>');
          break;
        case 'details': {
          const summary = prompt('Заголовок details:', 'Подробнее')?.trim() || 'Подробнее';
          wrapMarkdown(`<details open><summary>${summary}</summary>\n`, '\n</details>');
          break;
        }
        case 'footer':
          wrapMarkdown('<footer>', '</footer>');
          break;
        case 'hr':
          replaceWith('---', { collapseToEnd: true });
          break;
        case 'ul': {
          const lines = getSelectedLines(selected).map(line => `- ${line}`).join('\n');
          replaceWith(lines);
          break;
        }
        case 'ol': {
          const lines = getSelectedLines(selected).map((line, index) => `${index + 1}. ${line}`).join('\n');
          replaceWith(lines);
          break;
        }
        case 'task':
        case 'taskDone': {
          const marker = type === 'taskDone' ? '- [x]' : '- [ ]';
          const lines = getSelectedLines(selected, 'Задача').map(line => `${marker} ${line}`).join('\n');
          replaceWith(lines);
          break;
        }
        case 'br':
          replaceWith(selected ? `${selected}<br>` : '<br>', { collapseToEnd: true });
          break;
        case 'blank':
          replaceWith(selected ? `${selected}<br><br>` : '<br><br>', { collapseToEnd: true });
          break;
        default:
          replaceWith(selected);
          break;
      };
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
          <option value="rich-html">Rich HTML (10.1)</option>
          <option value="rich-markdown">Rich Markdown (10.1)</option>
          <option value="html">HTML</option>
          <option value="markdown">MarkdownV2</option>
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
        <div className={`${styles.toolbar} ${styles.richToolbar}`}>
          {RICH_FORMAT_GROUPS.map(group => (
            <div key={group.title} className={styles.richToolbarGroup}>
              <span className={styles.richToolbarTitle}>{group.title}</span>
              {group.buttons.map(btn => (
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
          Выдели фрагмент в поле и нажми кнопку разметки. Rich HTML использует теги Telegram Bot API 10.1:
          текстовые, блочные, списки, чеклисты, details, ссылки, якоря, сноски, формулы и переносы
          через <code> &lt;br&gt;</code>/<code>&lt;br&gt;&lt;br&gt;</code>.
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
