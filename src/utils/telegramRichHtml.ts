// Блочные теги rich-разметки Bot API 10.1: переносы строк вокруг них —
// незначимый структурный whitespace, а не <br>. Иначе строки таблиц, списков
// и <details> получают лишние <br> и ломаются. <pre> обрабатывается отдельно.
const RICH_BLOCK_TAGS =
  'p|div|h[1-6]|hr|ul|ol|li|table|thead|tbody|tfoot|tr|td|th|caption|colgroup|col'
  + '|blockquote|aside|figure|figcaption|details|summary|footer'
  + '|tg-collage|tg-slideshow|tg-map|tg-math-block|tg-thinking';

const NEWLINE_BEFORE_BLOCK = new RegExp(`[ \\t]*\\n[ \\t]*(?=</?(?:${RICH_BLOCK_TAGS})\\b)`, 'gi');
const NEWLINE_AFTER_BLOCK = new RegExp(`(</?(?:${RICH_BLOCK_TAGS})\\b[^>]*>)[ \\t]*\\n[ \\t]*`, 'gi');

/**
 * Превращает переносы строк в текстовом содержимом rich_message.html в <br>,
 * сохраняя структурную разметку Bot API 10.1.
 *
 * - Переносы вокруг блочных тегов (таблицы, списки, <details>, медиа) убираются —
 *   это незначимый whitespace, а не разрыв строки.
 * - Внутри <pre> переносы сохраняются как есть (значимы для блока кода).
 * - Остальные переносы (между инлайн-текстом) становятся <br>, пустая строка — <br><br>.
 */
export function normalizeTelegramRichHtml(html: string): string {
  // Выносим <pre>…</pre> из нормализации: там переносы строк значимы.
  return html
    .split(/(<pre\b[\s\S]*?<\/pre>)/i)
    .map((part, index) => {
      if (index % 2 === 1) {
        return part.replace(/\r\n?/g, '\n');
      }
      return part
        .replace(/\r\n?/g, '\n')
        .replace(NEWLINE_BEFORE_BLOCK, '')
        .replace(NEWLINE_AFTER_BLOCK, '$1')
        .replace(/\\n\\n/g, '<br><br>')
        .replace(/(^|[\s>])\/n\/n(?=[\s<]|$)/g, '$1<br><br>')
        .replace(/(?:&#10;){2}/gi, '<br><br>')
        .replace(/\n\n/g, '<br><br>')
        .replace(/\\n/g, '<br>')
        .replace(/(^|[\s>])\/n(?=[\s<]|$)/g, '$1<br>')
        .replace(/&#10;/gi, '<br>')
        .replace(/\n/g, '<br>');
    })
    .join('');
}

/**
 * Проверяет HTML rich_message на совместимость с Bot API 10.1.
 *
 * Важно: в rich-сообщениях (в отличие от обычных) официально поддерживаются
 * таблицы (<table> с alignment/caption/colspan/rowspan), <pre> и блок кода,
 * поэтому блокировать их нельзя — см. rich-message-formatting-options.
 *
 * Псевдотаблицы из box-drawing символов остаются мягким предупреждением:
 * на телефоне они разъезжаются, лучше настоящая <table>.
 */
export function validateTelegramRichHtmlCompatibility(html: string): string[] {
  const errors: string[] = [];

  if (/[┌┐└┘├┤┬┴┼─│]/u.test(html)) {
    errors.push('rich_message.html: псевдотаблицы из символов рамок разъезжаются на телефоне — используй настоящую <table>.');
  }

  return errors;
}
