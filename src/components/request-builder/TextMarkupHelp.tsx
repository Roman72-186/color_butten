import type { RequestParseMode } from '../../types/requestBuilder';
import styles from '../../styles/RequestBuilder.module.css';

interface TextMarkupHelpProps {
  platform: 'telegram' | 'max';
  mode: RequestParseMode | '' | 'markdown' | 'html';
}

const TELEGRAM_HTML_EXAMPLE = `<b>жирный</b>
<i>курсив</i>
<u>подчеркнутый</u>
<s>зачеркнутый</s>
<tg-spoiler>спойлер</tg-spoiler>
<a href="https://example.com">ссылка</a>
<code>код</code>`;

const TELEGRAM_MD_EXAMPLE = `*жирный*
_курсив_
__подчеркнутый__
~зачеркнутый~
||спойлер||
[ссылка](https://example.com)
\`код\``;

const MAX_MARKDOWN_EXAMPLE = `**жирный**
*курсив*
++подчеркнутый++
~~зачеркнутый~~
[ссылка](https://example.com)
\`код\`
> цитата`;

const MAX_HTML_EXAMPLE = `<b>жирный</b>
<i>курсив</i>
<u>подчеркнутый</u>
<s>зачеркнутый</s>
<a href="https://example.com">ссылка</a>
<code>код</code>
<blockquote>цитата</blockquote>`;

export function TextMarkupHelp({ platform, mode }: TextMarkupHelpProps) {
  const title = platform === 'telegram' ? 'Справка по Telegram-разметке' : 'Справка по MAX-разметке';
  const noStyleText = platform === 'telegram'
    ? 'Telegram не поддерживает цвет текста, размер шрифта и произвольные CSS-стили. Работают только parse_mode и entities.'
    : 'MAX не поддерживает цвет текста, размер шрифта и CSS-стили в сообщениях. Работает только встроенная разметка markdown или html.';

  let modeLabel = '';
  let example = '';
  let extra = '';

  if (platform === 'telegram') {
    if (mode === 'HTML') {
      modeLabel = 'HTML';
      example = TELEGRAM_HTML_EXAMPLE;
      extra = 'Рекомендуемый режим для сложного текста без экранирования MarkdownV2.';
    } else if (mode === 'Markdown' || mode === 'MarkdownV2') {
      modeLabel = mode;
      example = TELEGRAM_MD_EXAMPLE;
      extra = mode === 'MarkdownV2'
        ? 'В MarkdownV2 нужно экранировать служебные символы.'
        : 'Markdown работает как legacy-режим и поддерживает меньше возможностей.';
    } else {
      extra = 'Выберите parse_mode: HTML или MarkdownV2, если нужен форматированный текст.';
    }
  } else {
    if (mode === 'markdown') {
      modeLabel = 'markdown';
      example = MAX_MARKDOWN_EXAMPLE;
      extra = 'MAX поддерживает markdown и html. Для markdown доступны жирный, курсив, underline, strike, ссылки, код и цитаты.';
    } else if (mode === 'html') {
      modeLabel = 'html';
      example = MAX_HTML_EXAMPLE;
      extra = 'В html у MAX доступны базовые теги форматирования, ссылки, code, blockquote и mark.';
    } else {
      extra = 'Выберите format: markdown или html, если нужен форматированный текст.';
    }
  }

  return (
    <div className={styles.outputBlock}>
      <div className={styles.inlineHeader}>
        <div className={styles.outputTitle}>{title}</div>
        {modeLabel && <span className={styles.badge}>{modeLabel}</span>}
      </div>
      <div className={styles.fieldHint}>{noStyleText}</div>
      <div className={styles.fieldHint}>{extra}</div>
      {example && <pre className={styles.pre}>{example}</pre>}
    </div>
  );
}
