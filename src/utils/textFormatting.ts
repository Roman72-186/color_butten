import type { CSSProperties } from 'react';

export type FormatMode = 'html' | 'markdown';
export type FormatType =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'code'
  | 'codeblock'
  | 'spoiler'
  | 'link';

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

const BLOCK_TAGS = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'dd',
  'div',
  'dl',
  'dt',
  'figcaption',
  'figure',
  'footer',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'section',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'ul',
]);

const INDENT_UNIT_PX = 48;
const INDENT_SPACES = '    ';
const STASH_TOKEN_PREFIX = '@@TGFORMATTOKEN';

export interface FormatButtonConfig {
  type: FormatType;
  label: string;
  title: string;
  style?: CSSProperties;
}

export const FORMAT_BUTTONS: FormatButtonConfig[] = [
  { type: 'bold', label: 'B', title: 'Жирный (Ctrl+B)', style: { fontWeight: 700 } },
  { type: 'italic', label: 'I', title: 'Курсив (Ctrl+I)', style: { fontStyle: 'italic' } },
  { type: 'underline', label: 'U', title: 'Подчёркнутый (Ctrl+U)', style: { textDecoration: 'underline' } },
  { type: 'strikethrough', label: 'S', title: 'Зачёркнутый', style: { textDecoration: 'line-through' } },
  { type: 'code', label: 'code', title: 'Инлайн-код' },
  { type: 'codeblock', label: 'pre', title: 'Блок кода' },
  { type: 'spoiler', label: 'spoiler', title: 'Спойлер' },
  { type: 'link', label: 'link', title: 'Ссылка' },
] as const;

function normalizeClipboardText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '');
}

function stashValue(storage: string[], value: string): string {
  const token = `${STASH_TOKEN_PREFIX}${storage.length}@@`;
  storage.push(value);
  return token;
}

function restoreStashedValues(text: string, storage: string[]): string {
  return text.replace(/@@TGFORMATTOKEN(\d+)@@/g, (_, index) => storage[Number(index)] ?? '');
}

function parseCssLength(value: string): number {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return 0;
  }

  const numeric = Number.parseFloat(trimmed);
  if (Number.isNaN(numeric)) {
    return 0;
  }

  if (trimmed.endsWith('pt')) {
    return numeric * (96 / 72);
  }

  if (trimmed.endsWith('rem') || trimmed.endsWith('em')) {
    return numeric * 16;
  }

  return numeric;
}

function getIndentPrefixes(el: HTMLElement): { firstLine: string; restLines: string } {
  const blockIndentPx =
    parseCssLength(el.style.marginLeft) +
    parseCssLength(el.style.paddingLeft) +
    parseCssLength(el.style.marginInlineStart) +
    parseCssLength(el.style.paddingInlineStart);
  const textIndentPx = parseCssLength(el.style.textIndent);

  const blockLevels = Math.max(0, Math.round(blockIndentPx / INDENT_UNIT_PX));
  const textIndentLevels = Math.max(0, Math.round(textIndentPx / INDENT_UNIT_PX));

  return {
    firstLine: INDENT_SPACES.repeat(blockLevels + textIndentLevels),
    restLines: INDENT_SPACES.repeat(blockLevels),
  };
}

function prefixLines(text: string, firstPrefix: string, restPrefix: string = firstPrefix): string {
  if (!text) {
    return text;
  }

  return text
    .split('\n')
    .map((line, index) => {
      if (!line) {
        return line;
      }

      return `${index === 0 ? firstPrefix : restPrefix}${line}`;
    })
    .join('\n');
}

function wrapFormattedText(
  text: string,
  mode: FormatMode,
  options: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    spoiler?: boolean;
  }
): string {
  let result = text;

  if (options.spoiler) {
    result = mode === 'html' ? `<tg-spoiler>${result}</tg-spoiler>` : `||${result}||`;
  }

  if (options.strikethrough) {
    result = mode === 'html' ? `<s>${result}</s>` : `~${result}~`;
  }

  if (options.underline) {
    result = mode === 'html' ? `<u>${result}</u>` : `__${result}__`;
  }

  if (options.italic) {
    result = mode === 'html' ? `<i>${result}</i>` : `_${result}_`;
  }

  if (options.bold) {
    result = mode === 'html' ? `<b>${result}</b>` : `*${result}*`;
  }

  return result;
}

function getListItemPrefix(el: HTMLElement): { first: string; rest: string } {
  const parentTag = el.parentElement?.tagName.toLowerCase();

  if (parentTag === 'ol') {
    const siblings = Array.from(el.parentElement?.children ?? []).filter(
      child => child.tagName.toLowerCase() === 'li'
    );
    const index = Math.max(0, siblings.indexOf(el)) + 1;
    const marker = `${index}. `;

    return {
      first: marker,
      rest: ' '.repeat(marker.length),
    };
  }

  return {
    first: '• ',
    rest: '  ',
  };
}

function extractCodeLanguage(el: HTMLElement): string {
  const classNames = [...el.classList];
  for (const className of classNames) {
    if (className.startsWith('language-')) {
      return className.slice('language-'.length);
    }
  }

  const nestedCode = el.querySelector('code[class*="language-"]');
  if (!nestedCode) {
    return '';
  }

  for (const className of [...nestedCode.classList]) {
    if (className.startsWith('language-')) {
      return className.slice('language-'.length);
    }
  }

  return '';
}

function processNode(node: Node, mode: FormatMode): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return normalizeClipboardText(node.textContent || '');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  if (tag === 'br') {
    return '\n';
  }

  if (tag === 'hr') {
    return '\n\n';
  }

  if (tag === 'pre') {
    const language = extractCodeLanguage(el);
    const codeContent = normalizeClipboardText(el.textContent || '').replace(/\n+$/, '');

    if (mode === 'html') {
      if (language) {
        return `<pre><code class="language-${language}">${codeContent}</code></pre>`;
      }

      return `<pre>${codeContent}</pre>`;
    }

    const languageSuffix = language ? language : '';
    return `\`\`\`${languageSuffix}\n${codeContent}\n\`\`\``;
  }

  const children = Array.from(el.childNodes)
    .map(child => processNode(child, mode))
    .join('');

  if (tag === 'code') {
    return mode === 'html' ? `<code>${children}</code>` : `\`${children}\``;
  }

  if (tag === 'a') {
    const href = el.getAttribute('href');
    if (!href) {
      return children;
    }

    return mode === 'html' ? `<a href="${href}">${children}</a>` : `[${children}](${href})`;
  }

  const textDecoration = `${el.style.textDecoration} ${el.style.textDecorationLine}`.toLowerCase();

  const result = wrapFormattedText(children, mode, {
    bold:
      tag === 'b' ||
      tag === 'strong' ||
      el.style.fontWeight === 'bold' ||
      Number.parseInt(el.style.fontWeight, 10) >= 700,
    italic: tag === 'i' || tag === 'em' || el.style.fontStyle === 'italic',
    underline: tag === 'u' || tag === 'ins' || textDecoration.includes('underline'),
    strikethrough:
      tag === 's' ||
      tag === 'del' ||
      tag === 'strike' ||
      textDecoration.includes('line-through'),
    spoiler:
      tag === 'tg-spoiler' ||
      el.classList.contains('tg-spoiler') ||
      el.dataset.entityType === 'spoiler',
  });

  if (!BLOCK_TAGS.has(tag)) {
    return result;
  }

  const trimmedBlock = result.replace(/^\n+|\n+$/g, '');
  const { firstLine, restLines } = getIndentPrefixes(el);

  if (tag === 'li') {
    const marker = getListItemPrefix(el);
    const prefixed = prefixLines(
      trimmedBlock,
      `${firstLine}${marker.first}`,
      `${restLines}${marker.rest}`
    );

    return `${prefixed}\n`;
  }

  if (!trimmedBlock) {
    return '\n';
  }

  const prefixed = prefixLines(trimmedBlock, firstLine, restLines);
  return `${prefixed}\n\n`;
}

export function getFormatModeFromParseMode(parseMode: string): FormatMode | null {
  if (parseMode === 'HTML') {
    return 'html';
  }

  if (parseMode === 'Markdown' || parseMode === 'MarkdownV2') {
    return 'markdown';
  }

  return null;
}

export function convertClipboardHtml(html: string, mode: FormatMode): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const converted = Array.from(doc.body.childNodes)
    .map(node => processNode(node, mode))
    .join('');

  return converted
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+/, '')
    .replace(/\n+$/, '');
}

export function normalizeTextFormattingInput(text: string, mode: FormatMode): string {
  const normalized = normalizeClipboardText(text);

  if (mode !== 'html' || !normalized.trim()) {
    return normalized;
  }

  const stashed: string[] = [];
  let result = normalized;

  result = result.replace(/<pre(?:\s[^>]*)?>[\s\S]*?<\/pre>/gi, match => stashValue(stashed, match));
  result = result.replace(/<code(?:\s[^>]*)?>[\s\S]*?<\/code>/gi, match => stashValue(stashed, match));
  result = result.replace(/<a\s[^>]*>[\s\S]*?<\/a>/gi, match => stashValue(stashed, match));
  result = result.replace(/<tg-spoiler>[\s\S]*?<\/tg-spoiler>/gi, match => stashValue(stashed, match));
  result = result.replace(/<\/?[a-z][^>]*>/gi, match => stashValue(stashed, match));

  result = result.replace(/```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g, (_, language = '', code: string) => {
    const cleanCode = code.replace(/\n$/, '');
    const html = language
      ? `<pre><code class="language-${language}">${cleanCode}</code></pre>`
      : `<pre>${cleanCode}</pre>`;

    return stashValue(stashed, html);
  });

  result = result.replace(/`([^`\n]+)`/g, (_, code: string) => {
    return stashValue(stashed, `<code>${code}</code>`);
  });

  result = result.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, label: string, url: string) => {
    return stashValue(stashed, `<a href="${url}">${label}</a>`);
  });

  result = result.replace(/\|\|([^|\n][\s\S]*?[^|\n]|[^|\n])\|\|/g, '<tg-spoiler>$1</tg-spoiler>');
  result = result.replace(/__([^_\n][\s\S]*?[^_\n]|[^_\n])__/g, '<u>$1</u>');
  result = result.replace(/\*([^*\n][\s\S]*?[^*\n]|[^*\n])\*/g, '<b>$1</b>');
  result = result.replace(/_([^_\n][\s\S]*?[^_\n]|[^_\n])_/g, '<i>$1</i>');
  result = result.replace(/~([^~\n][\s\S]*?[^~\n]|[^~\n])~/g, '<s>$1</s>');

  return restoreStashedValues(result, stashed);
}

export function textToPreviewHtml(text: string, mode: FormatMode): string {
  const preparedText = mode === 'html' ? normalizeTextFormattingInput(text, mode) : text;
  if (!preparedText.trim()) return '';

  let safe = preparedText
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
      .replace(
        /&lt;pre&gt;&lt;code class=&quot;language-([^&]*)&quot;&gt;([\s\S]*?)&lt;\/code&gt;&lt;\/pre&gt;/g,
        '<pre><code class="language-$1">$2</code></pre>'
      )
      .replace(/&lt;pre&gt;([\s\S]*?)&lt;\/pre&gt;/g, '<pre>$1</pre>')
      .replace(/&lt;tg-spoiler&gt;([\s\S]*?)&lt;\/tg-spoiler&gt;/g, '<span class="spoiler">$1</span>')
      .replace(
        /&lt;a href=&quot;(https?:\/\/.*?)&quot;&gt;([\s\S]*?)&lt;\/a&gt;/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer">$2</a>'
      );
  } else {
    safe = safe
      .replace(/\|\|([\s\S]*?)\|\|/g, '<span class="spoiler">$1</span>')
      .replace(/```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g, '<pre>$2</pre>')
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

  return safe.replace(/\n/g, '<br>');
}

export function validateFormattedText(
  text: string,
  mode: FormatMode,
  options?: { validatePercentEncoding?: boolean }
): string[] {
  const errors: string[] = [];
  if (!text.trim()) return errors;

  if (mode === 'html') {
    const simpleTags = ['b', 'i', 'u', 's', 'code', 'pre'];
    for (const tag of simpleTags) {
      const openCount = (text.match(new RegExp(`<${tag}(?:\\s[^>]*)?>`, 'g')) || []).length;
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

  if (options?.validatePercentEncoding !== false) {
    if (/%0(?![aA])/.test(text) || /%0$/.test(text)) {
      errors.push('Некорректный перенос строки (используйте двойной пробел)');
    }
  }

  return errors;
}

export function applyTextFormat(
  text: string,
  mode: FormatMode,
  type: FormatType,
  start: number,
  end: number,
  url?: string
): { text: string; selectionStart: number; selectionEnd: number } {
  const selected = text.substring(start, end);

  let open: string;
  let close: string;

  if (type === 'link') {
    if (!url) {
      return { text, selectionStart: start, selectionEnd: end };
    }

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

  if (selected) {
    return {
      text: before + formatted + after,
      selectionStart: start,
      selectionEnd: start + formatted.length,
    };
  }

  const cursorPos = start + open.length;
  return {
    text: before + formatted + after,
    selectionStart: cursorPos,
    selectionEnd: cursorPos,
  };
}
