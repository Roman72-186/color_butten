import { useState, useCallback, useRef, useMemo } from 'react';
import styles from '../styles/TextFormatter.module.css';

type FormatMode = 'html' | 'markdown';
type FormatType = 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code' | 'codeblock' | 'spoiler' | 'link';

const HTML_TAGS: Record<Exclude<FormatType, 'link'>, [string, string]> = {
  bold: ['<b>', '</b>'],
  italic: ['<i>', '</i>'],
  underline: ['<u>', '</u>'],
  strikethrough: ['<s>', '</s>'],
  code: ['<code>', '</code>'],
  codeblock: ['<pre>', '</pre>'],
  spoiler: ['<tg-spoiler>', '</tg-spoiler>'],
};

const MD_TAGS: Record<Exclude<FormatType, 'link'>, [string, string]> = {
  bold: ['*', '*'],
  italic: ['_', '_'],
  underline: ['__', '__'],
  strikethrough: ['~', '~'],
  code: ['`', '`'],
  codeblock: ['```\n', '\n```'],
  spoiler: ['||', '||'],
};

interface FormatButton {
  type: FormatType;
  label: string;
  title: string;
  style?: React.CSSProperties;
}

const FORMAT_BUTTONS: FormatButton[] = [
  { type: 'bold', label: 'B', title: 'Жирный (Ctrl+B)', style: { fontWeight: 700 } },
  { type: 'italic', label: 'I', title: 'Курсив (Ctrl+I)', style: { fontStyle: 'italic' } },
  { type: 'underline', label: 'U', title: 'Подчёркнутый (Ctrl+U)', style: { textDecoration: 'underline' } },
  { type: 'strikethrough', label: 'S', title: 'Зачёркнутый', style: { textDecoration: 'line-through' } },
  { type: 'code', label: 'code', title: 'Инлайн-код' },
  { type: 'codeblock', label: 'pre', title: 'Блок кода' },
  { type: 'spoiler', label: 'spoiler', title: 'Спойлер' },
  { type: 'link', label: 'link', title: 'Ссылка' },
];

function processNode(node: Node, mode: FormatMode): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const children = Array.from(el.childNodes).map(n => processNode(n, mode)).join('');

  const isBold = tag === 'b' || tag === 'strong' ||
    el.style.fontWeight === 'bold' || parseInt(el.style.fontWeight) >= 700;
  const isItalic = tag === 'i' || tag === 'em' || el.style.fontStyle === 'italic';
  const isUnderline = tag === 'u' || tag === 'ins';
  const isStrike = tag === 's' || tag === 'del' || tag === 'strike';

  if (mode === 'html') {
    if (tag === 'a') {
      const href = el.getAttribute('href');
      return href ? `<a href="${href}">${children}</a>` : children;
    }
    if (tag === 'code') return `<code>${children}</code>`;
    if (tag === 'pre') return `<pre>${children}</pre>`;
    if (tag === 'br') return '\n';
    if (tag === 'p' || tag === 'div') return children ? children + '\n' : '';
    if (tag === 'li') return children + '\n';

    let result = children;
    if (isStrike) result = `<s>${result}</s>`;
    if (isUnderline) result = `<u>${result}</u>`;
    if (isItalic) result = `<i>${result}</i>`;
    if (isBold) result = `<b>${result}</b>`;
    return result;
  }

  if (tag === 'a') {
    const href = el.getAttribute('href');
    return href ? `[${children}](${href})` : children;
  }
  if (tag === 'code') return `\`${children}\``;
  if (tag === 'pre') return `\`\`\`\n${children}\n\`\`\``;
  if (tag === 'br') return '\n';
  if (tag === 'p' || tag === 'div') return children ? children + '\n' : '';
  if (tag === 'li') return children + '\n';

  let result = children;
  if (isStrike) result = `~${result}~`;
  if (isUnderline) result = `__${result}__`;
  if (isItalic) result = `_${result}_`;
  if (isBold) result = `*${result}*`;
  return result;
}

function convertClipboardHtml(html: string, mode: FormatMode): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return processNode(doc.body, mode).replace(/\n{3,}/g, '\n\n').trim();
}

function textToPreviewHtml(text: string, mode: FormatMode): string {
  if (!text.trim()) return '';

  let safe = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  if (mode === 'html') {
    safe = safe
      .replace(/&lt;b&gt;([\s\S]*?)&lt;\/b&gt;/g, '<b>$1</b>')
      .replace(/&lt;i&gt;([\s\S]*?)&lt;\/i&gt;/g, '<i>$1</i>')
      .replace(/&lt;u&gt;([\s\S]*?)&lt;\/u&gt;/g, '<u>$1</u>')
      .replace(/&lt;s&gt;([\s\S]*?)&lt;\/s&gt;/g, '<s>$1</s>')
      .replace(/&lt;code&gt;([\s\S]*?)&lt;\/code&gt;/g, '<code>$1</code>')
      .replace(/&lt;pre&gt;([\s\S]*?)&lt;\/pre&gt;/g, '<pre>$1</pre>')
      .replace(/&lt;tg-spoiler&gt;([\s\S]*?)&lt;\/tg-spoiler&gt;/g, '<span class="spoiler">$1</span>')
      .replace(
        /&lt;a href=&quot;(https?:\/\/.*?)&quot;&gt;([\s\S]*?)&lt;\/a&gt;/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer">$2</a>'
      );
  } else {
    safe = safe
      .replace(/\|\|([\s\S]*?)\|\|/g, '<span class="spoiler">$1</span>')
      .replace(/```([\s\S]*?)```/g, '<pre>$1</pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/__([\s\S]*?)__/g, '<u>$1</u>')
      .replace(/\*([^*]+)\*/g, '<b>$1</b>')
      .replace(/_([^_]+)_/g, '<i>$1</i>')
      .replace(/~([^~]+)~/g, '<s>$1</s>')
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
      );
  }

  safe = safe.replace(/\n/g, '<br>');
  return safe;
}

function validateText(text: string, mode: FormatMode): string[] {
  const errors: string[] = [];
  if (!text.trim()) return errors;

  if (mode === 'html') {
    const simpleTags = ['b', 'i', 'u', 's', 'code', 'pre'];
    for (const tag of simpleTags) {
      const openCount = (text.match(new RegExp(`<${tag}>`, 'g')) || []).length;
      const closeCount = (text.match(new RegExp(`</${tag}>`, 'g')) || []).length;
      if (openCount > closeCount) {
        errors.push(`Незакрытый тег <${tag}>`);
      } else if (closeCount > openCount) {
        errors.push(`Лишний закрывающий тег </${tag}>`);
      }
    }

    const spoilerOpen = (text.match(/<tg-spoiler>/g) || []).length;
    const spoilerClose = (text.match(/<\/tg-spoiler>/g) || []).length;
    if (spoilerOpen > spoilerClose) {
      errors.push('Незакрытый тег <tg-spoiler>');
    } else if (spoilerClose > spoilerOpen) {
      errors.push('Лишний закрывающий тег </tg-spoiler>');
    }

    const aOpen = (text.match(/<a\s[^>]*>/g) || []).length;
    const aClose = (text.match(/<\/a>/g) || []).length;
    if (aOpen > aClose) {
      errors.push('Незакрытый тег <a>');
    } else if (aClose > aOpen) {
      errors.push('Лишний закрывающий тег </a>');
    }
  } else {
    const codeBlockCount = (text.match(/```/g) || []).length;
    if (codeBlockCount % 2 !== 0) {
      errors.push('Незакрытый блок кода ```');
    }

    const spoilerCount = (text.match(/\|\|/g) || []).length;
    if (spoilerCount % 2 !== 0) {
      errors.push('Незакрытый спойлер ||');
    }

    let cleaned = text;
    if (codeBlockCount >= 2) {
      cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
    }

    const backtickCount = (cleaned.match(/`/g) || []).length;
    if (backtickCount % 2 !== 0) {
      errors.push('Незакрытый инлайн-код `');
    }
    cleaned = cleaned.replace(/`[^`]*`/g, '');

    const underlineCount = (cleaned.match(/__/g) || []).length;
    if (underlineCount % 2 !== 0) {
      errors.push('Незакрытое подчёркивание __');
    }
    cleaned = cleaned.replace(/__/g, '');

    const boldCount = (cleaned.match(/\*/g) || []).length;
    if (boldCount % 2 !== 0) {
      errors.push('Незакрытый жирный текст *');
    }

    const italicCount = (cleaned.match(/_/g) || []).length;
    if (italicCount % 2 !== 0) {
      errors.push('Незакрытый курсив _');
    }

    const strikeCount = (cleaned.match(/~/g) || []).length;
    if (strikeCount % 2 !== 0) {
      errors.push('Незакрытый зачёркнутый текст ~');
    }
  }

  if (/%0(?![aA])/.test(text) || /%0$/.test(text)) {
    errors.push('Некорректный перенос строки (используйте двойной пробел)');
  }

  return errors;
}

export function TextFormatter() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<FormatMode>('html');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const textErrors = useMemo(() => validateText(text, mode), [text, mode]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const rawText = e.target.value;
    const cursorPos = e.target.selectionStart;

    if (!rawText.includes('  ')) {
      setText(rawText);
      return;
    }

    const beforeCursor = rawText.substring(0, cursorPos);
    const replacementsBeforeCursor = (beforeCursor.match(/ {2}/g) || []).length;
    const newText = rawText.replace(/ {2}/g, '\n');
    setText(newText);

    const adjustedPos = cursorPos - replacementsBeforeCursor;
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = adjustedPos;
        textareaRef.current.selectionEnd = adjustedPos;
      }
    });
  }, []);

  const applyFormat = useCallback((type: FormatType) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = text.substring(start, end);

    let open: string;
    let close: string;

    if (type === 'link') {
      const url = prompt('Введите URL:', 'https://');
      if (!url) return;

      if (mode === 'html') {
        open = `<a href="${url}">`;
        close = '</a>';
      } else {
        open = '[';
        close = `](${url})`;
      }
    } else {
      const tags = mode === 'html' ? HTML_TAGS : MD_TAGS;
      [open, close] = tags[type];
    }

    const before = text.substring(0, start);
    const after = text.substring(end);
    const formatted = `${open}${selected}${close}`;
    const newText = before + formatted + after;

    setText(newText);

    requestAnimationFrame(() => {
      textarea.focus();
      if (selected) {
        textarea.selectionStart = start;
        textarea.selectionEnd = start + formatted.length;
      } else {
        const cursorPos = start + open.length;
        textarea.selectionStart = cursorPos;
        textarea.selectionEnd = cursorPos;
      }
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

    const output = text.replace(/\n/g, '%0a');

    try {
      navigator.clipboard.writeText(output).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch {
      // clipboard not available
    }
  }, [text, textErrors]);

  const previewHtml = useMemo(() => textToPreviewHtml(text, mode), [text, mode]);

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

      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={text}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
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
