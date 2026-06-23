import type { RichMessageFormat } from '../../types/requestBuilder';
import styles from '../../styles/RequestBuilder.module.css';

interface RichMarkupHelpProps {
  format: RichMessageFormat;
}

// Синтаксис дословно сверен с https://core.telegram.org/bots/api#rich-message-formatting-options
// (Bot API 10.1). Добавлять сюда только подтверждённые официальной докой теги.

const RICH_HTML_EXAMPLE = `<h2>Заголовок раздела</h2>
<p>Текст с <b>жирным</b>, <i>курсивом</i>, <u>подчёркнутым</u>,
<s>зачёркнутым</s>, <code>кодом</code>, <mark>выделением</mark>,
<sub>нижним</sub>/<sup>верхним</sup> индексом и <tg-spoiler>спойлером</tg-spoiler>.</p>

<a href="https://t.me/">ссылка</a> · <a href="#chapter-1">ссылка в документе</a>
<a name="chapter-1"></a>

<ul><li>пункт списка</li></ul>
<ol><li>нумерованный пункт</li></ol>

<blockquote>Цитата<cite>Автор</cite></blockquote>
<aside>Врезка / pull quote<cite>Автор</cite></aside>

<table bordered striped>
<caption>Подпись таблицы</caption>
<tr><th>Метрика</th><th>Значение</th></tr>
<tr><td align="left">Скорость</td><td align="right">42<sup>мс</sup></td></tr>
</table>

<details open><summary>Подробнее</summary>Скрытый контент</details>

<figure><img src="https://example.com/photo.jpg"/><figcaption>Подпись<cite>Кредит</cite></figcaption></figure>
<pre><code class="language-python">print("code block")</code></pre>
<tg-math>x^2 + y^2</tg-math> · <tg-math-block>E = mc^2</tg-math-block>`;

const RICH_MARKDOWN_EXAMPLE = `## Заголовок раздела

Текст с **жирным**, *курсивом*, ~~зачёркнутым~~, \`кодом\`,
==выделением==, ||спойлером|| и формулой $x^2 + y^2$.

[ссылка](https://t.me/)

- пункт списка
- [ ] задача
- [x] сделано

> Цитата

| Метрика | Значение |
|:--------|--------:|
| Скорость | **42** |

\`\`\`python
print("code block")
\`\`\`

![](https://example.com/photo.jpg "Подпись медиа")

Текст со сноской[^1].

[^1]: Определение сноски.

$$E = mc^2$$`;

const ADVANCED_HINT =
  'Также доступны блоки: pull quote (<aside>), коллаж (<tg-collage>), слайдшоу '
  + '(<tg-slideshow>), карта (<tg-map lat long zoom>), сноски/референсы (<tg-reference>), '
  + 'якоря (<a name>). Тег <tg-thinking> — только в sendRichMessageDraft.';

const LIMITS_HINT =
  'Лимиты: до 32768 символов, 500 блоков, 16 уровней вложенности, 50 медиа, 20 колонок. '
  + 'Медиа — только отдельным блоком и только по HTTP/HTTPS. В ячейках таблиц — только инлайн-форматирование.';

export function RichMarkupHelp({ format }: RichMarkupHelpProps) {
  const isHtml = format === 'html';
  const example = isHtml ? RICH_HTML_EXAMPLE : RICH_MARKDOWN_EXAMPLE;
  const modeLabel = isHtml ? 'html' : 'markdown';
  const intro = isHtml
    ? 'Rich HTML: гранулярные теги для заголовков, списков, таблиц, цитат, details, медиа и LaTeX.'
    : 'Rich Markdown совместим с GitHub Flavored Markdown и допускает HTML-теги из Rich HTML внутри текста.';

  return (
    <div className={styles.outputBlock}>
      <div className={styles.inlineHeader}>
        <div className={styles.outputTitle}>Справка по rich-разметке (Bot API 10.1)</div>
        <span className={styles.badge}>{modeLabel}</span>
      </div>
      <div className={styles.fieldHint}>{intro}</div>
      <pre className={styles.pre}>{example}</pre>
      <div className={styles.fieldHint}>{ADVANCED_HINT}</div>
      <div className={styles.fieldHint}>{LIMITS_HINT}</div>
    </div>
  );
}
