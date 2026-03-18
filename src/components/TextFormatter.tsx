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

export function TextFormatter() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<FormatMode>('html');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    if (!text.trim()) return;

    const output = text.replace(/\n/g, '%0a');

    try {
      navigator.clipboard.writeText(output).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch {
      // clipboard not available
    }
  }, [text]);

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
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Введите или вставьте текст для форматирования..."
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

      <button
        className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
        onClick={handleCopy}
        disabled={!text.trim()}
      >
        {copied ? '\u2713 Скопировано' : 'Скопировать текст'}
      </button>
    </div>
  );
}
