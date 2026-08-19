// Разбор команды curl из документации в отдельные части запроса:
// метод, адрес, параметры строки запроса, заголовки, тело.
// Утилита чистая — про платформы (Telegram, MAX, LEADTEH) она ничего не знает.

export interface CurlPair {
  name: string;
  value: string;
}

export interface CurlWarning {
  code:
    | 'smart-quotes'
    | 'file-reference'
    | 'multipart'
    | 'unknown-flag'
    | 'insecure-auth'
    | 'broken-json'
    | 'no-method-guess';
  message: string;
}

export type CurlBodyKind = 'none' | 'json' | 'form' | 'multipart' | 'raw';

export interface ParsedCurl {
  method: string;
  /** Адрес без строки запроса. */
  url: string;
  /** Исходный адрес целиком, как он был в команде. */
  rawUrl: string;
  query: CurlPair[];
  headers: CurlPair[];
  contentType: string | null;
  bodyKind: CurlBodyKind;
  /** Тело запроса строкой. JSON уже с отступами. */
  body: string;
  warnings: CurlWarning[];
}

export type CurlParseResult =
  | { ok: true; data: ParsedCurl }
  | { ok: false; error: string };

/** Флаги curl без значения — на состав запроса не влияют. */
const IGNORED_FLAGS = new Set([
  '-s', '--silent', '-S', '--show-error', '-i', '--include', '-I', '--head',
  '-v', '--verbose', '-k', '--insecure', '-L', '--location', '-f', '--fail',
  '--compressed', '--no-buffer', '-#', '--progress-bar', '-N', '-4', '-6',
  '--http1.1', '--http2', '--fail-with-body', '--globoff', '-g',
]);

/** Флаги curl со значением — значение тоже отбрасываем. */
const IGNORED_FLAGS_WITH_VALUE = new Set([
  '-o', '--output', '-w', '--write-out', '-m', '--max-time', '--connect-timeout',
  '--retry', '--retry-delay', '--cacert', '--cert', '--key', '--proxy', '-x',
  '--resolve', '--limit-rate', '--max-redirs', '--interface', '--dns-servers',
]);

const SMART_QUOTES: Record<string, string> = {
  '“': '"', '”': '"', '„': '"', '«': '"', '»': '"',
  '‘': "'", '’': "'", '‚': "'",
};

/**
 * Заменяет типографские кавычки на обычные — иначе команда, скопированная
 * из статьи или мессенджера, не разбирается вообще.
 */
function normalizeQuotes(input: string): { text: string; replaced: boolean } {
  let replaced = false;
  const text = input.replace(/[“”„«»‘’‚]/g, char => {
    replaced = true;
    return SMART_QUOTES[char];
  });
  return { text, replaced };
}

/**
 * Разбивает команду на токены по правилам оболочки: кавычки, экранирование
 * и переносы строк всех трёх видов — `\` (bash), `^` (cmd), «`» (PowerShell).
 */
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let hasCurrent = false;
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];

    if (quote === "'") {
      if (char === "'") {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (quote === '"') {
      if (char === '\\' && next !== undefined && '"\\$`'.includes(next)) {
        current += next;
        i += 1;
      } else if (char === '\\' && (next === '\n' || (next === '\r' && input[i + 2] === '\n'))) {
        i += next === '\r' ? 2 : 1;
      } else if (char === '"') {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    // Перенос строки: символ продолжения плюс сам перевод строки.
    if ((char === '\\' || char === '^' || char === '`') && next !== undefined && (next === '\n' || next === '\r')) {
      i += 1;
      while (i + 1 < input.length && (input[i + 1] === '\n' || input[i + 1] === '\r')) i += 1;
      continue;
    }

    if (char === '\\' && next !== undefined) {
      current += next;
      hasCurrent = true;
      i += 1;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      hasCurrent = true;
      continue;
    }

    if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
      if (hasCurrent) {
        tokens.push(current);
        current = '';
        hasCurrent = false;
      }
      continue;
    }

    current += char;
    hasCurrent = true;
  }

  if (hasCurrent) tokens.push(current);
  return tokens;
}

/** Раскрывает склейки коротких флагов вида `-sS` в отдельные `-s` и `-S`. */
function expandShortFlagCluster(token: string): string[] {
  if (!/^-[a-zA-Z#]{2,}$/.test(token)) return [token];
  return token.slice(1).split('').map(letter => `-${letter}`);
}

function splitOnce(value: string, separator: string): [string, string] | null {
  const index = value.indexOf(separator);
  if (index === -1) return null;
  return [value.slice(0, index), value.slice(index + 1)];
}

function safeDecode(value: string): string {
  // Только %XX. Плюс в пробел не превращаем: в токенах и base64 он значащий.
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function splitUrl(rawUrl: string): { url: string; query: CurlPair[] } {
  const [base, queryString] = splitOnce(rawUrl, '?') ?? [rawUrl, ''];
  if (!queryString) return { url: base, query: [] };

  const query: CurlPair[] = [];
  for (const chunk of queryString.split('&')) {
    if (!chunk) continue;
    const pair = splitOnce(chunk, '=');
    if (pair) {
      query.push({ name: safeDecode(pair[0]), value: safeDecode(pair[1]) });
    } else {
      query.push({ name: safeDecode(chunk), value: '' });
    }
  }
  return { url: base, query };
}

function toBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** Отличает адрес от значения незнакомого флага, оказавшегося в той же позиции. */
function looksLikeUrl(value: string): boolean {
  if (/^https?:\/\//i.test(value)) return true;
  if (value.startsWith('{{')) return true;
  if (/^localhost(:\d+)?(\/|$)/i.test(value)) return true;
  return /^[\w.-]+\.[a-z]{2,}(:\d+)?(\/|\?|$)/i.test(value);
}

function looksLikeJson(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const first = trimmed[0];
  return first === '{' || first === '[';
}

function prettyJson(value: string): string | null {
  try {
    const parsed: unknown = JSON.parse(value);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return null;
  }
}

export function parseCurl(rawInput: string): CurlParseResult {
  const trimmedInput = rawInput.trim();
  if (!trimmedInput) return { ok: false, error: 'Поле пустое – вставьте команду curl.' };

  const { text, replaced } = normalizeQuotes(trimmedInput);
  // Приглашение оболочки в начале строки: `$ curl ...` или `# curl ...`.
  const withoutPrompt = text.replace(/^[\s]*[$#>]\s+/, '');
  const rawTokens = tokenize(withoutPrompt);

  const tokens: string[] = [];
  for (const token of rawTokens) {
    if (token.startsWith('--') || !token.startsWith('-') || token.length <= 2) {
      tokens.push(token);
    } else {
      tokens.push(...expandShortFlagCluster(token));
    }
  }

  const curlIndex = tokens.findIndex(token => token === 'curl' || token.endsWith('/curl') || token.endsWith('curl.exe'));
  if (curlIndex === -1) {
    return { ok: false, error: 'Команда curl не найдена. Вставьте пример целиком, вместе со словом curl.' };
  }

  const warnings: CurlWarning[] = [];
  if (replaced) {
    warnings.push({
      code: 'smart-quotes',
      message: 'В команде были фигурные кавычки – заменил их на обычные.',
    });
  }

  const headers: CurlPair[] = [];
  const dataParts: string[] = [];
  const formParts: CurlPair[] = [];
  let explicitMethod = '';
  let rawUrl = '';
  let dataToQuery = false;

  const args = tokens.slice(curlIndex + 1);

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const takeValue = (): string => {
      const inline = arg.startsWith('--') ? splitOnce(arg, '=') : null;
      if (inline) return inline[1];
      const value = args[i + 1] ?? '';
      i += 1;
      return value;
    };
    const flag = arg.startsWith('--') ? (splitOnce(arg, '=')?.[0] ?? arg) : arg;

    if (IGNORED_FLAGS.has(flag)) continue;
    if (IGNORED_FLAGS_WITH_VALUE.has(flag)) {
      takeValue();
      continue;
    }

    switch (flag) {
      case '-X':
      case '--request':
        explicitMethod = takeValue().trim().toUpperCase();
        break;

      case '-H':
      case '--header': {
        const value = takeValue();
        const pair = splitOnce(value, ':');
        if (pair) {
          headers.push({ name: pair[0].trim(), value: pair[1].trim() });
        } else if (value.trim()) {
          headers.push({ name: value.replace(/;$/, '').trim(), value: '' });
        }
        break;
      }

      case '-d':
      case '--data':
      case '--data-raw':
      case '--data-ascii':
      case '--data-binary': {
        const value = takeValue();
        if (value.startsWith('@')) {
          warnings.push({
            code: 'file-reference',
            message: `Тело берётся из файла ${value.slice(1)} – содержимое придётся подставить вручную.`,
          });
        }
        dataParts.push(value);
        break;
      }

      case '--data-urlencode': {
        const value = takeValue();
        const pair = splitOnce(value, '=');
        dataParts.push(pair ? `${pair[0]}=${encodeURIComponent(pair[1])}` : encodeURIComponent(value));
        break;
      }

      case '-F':
      case '--form':
      case '--form-string': {
        const value = takeValue();
        const pair = splitOnce(value, '=');
        formParts.push(pair ? { name: pair[0], value: pair[1] } : { name: value, value: '' });
        break;
      }

      case '-u':
      case '--user': {
        const value = takeValue();
        headers.push({ name: 'Authorization', value: `Basic ${toBase64(value)}` });
        warnings.push({
          code: 'insecure-auth',
          message: 'Логин и пароль из -u превращены в заголовок Authorization – проверьте, что это ваши доступы, а не пример из документации.',
        });
        break;
      }

      case '-b':
      case '--cookie':
        headers.push({ name: 'Cookie', value: takeValue() });
        break;

      case '-A':
      case '--user-agent':
        headers.push({ name: 'User-Agent', value: takeValue() });
        break;

      case '-e':
      case '--referer':
        headers.push({ name: 'Referer', value: takeValue() });
        break;

      case '--url':
        rawUrl = takeValue();
        break;

      case '-G':
      case '--get':
        dataToQuery = true;
        break;

      default:
        if (arg.startsWith('-')) {
          warnings.push({ code: 'unknown-flag', message: `Флаг ${arg} я пропустил – на поля запроса он не влияет.` });
          // У незнакомого флага может быть значение. Съедаем его, чтобы оно не стало адресом.
          const candidate = args[i + 1];
          if (candidate !== undefined && !candidate.startsWith('-') && !looksLikeUrl(candidate)) {
            i += 1;
          }
        } else if (!rawUrl && looksLikeUrl(arg)) {
          rawUrl = arg;
        }
    }
  }

  if (!rawUrl) {
    return { ok: false, error: 'В команде нет адреса запроса.' };
  }

  const joinedData = dataParts.join('&');
  const { url, query: urlQuery } = splitUrl(rawUrl);
  let query = urlQuery;

  // -G переносит данные из тела в строку запроса.
  if (dataToQuery && joinedData) {
    const extra = splitUrl(`?${joinedData}`);
    query = [...query, ...extra.query];
  }

  const headerContentType = headers.find(header => header.name.toLowerCase() === 'content-type')?.value ?? null;
  const bodyPayload = dataToQuery ? '' : joinedData;

  let bodyKind: CurlBodyKind = 'none';
  let body = '';
  let contentType = headerContentType;

  if (formParts.length > 0) {
    bodyKind = 'multipart';
    body = formParts.map(part => `${part.name}=${part.value}`).join('\n');
    contentType = contentType ?? 'multipart/form-data';
    warnings.push({
      code: 'multipart',
      message: 'Запрос отправляет форму с файлами (-F). Готового тела тут не будет – поля перенесите руками.',
    });
    if (formParts.some(part => part.value.startsWith('@'))) {
      warnings.push({
        code: 'file-reference',
        message: 'Часть полей формы ссылается на файлы через @ – файл нужно приложить отдельно.',
      });
    }
  } else if (bodyPayload) {
    const shapedLikeJson = looksLikeJson(bodyPayload);
    const headerSaysJson = (headerContentType ?? '').toLowerCase().includes('json');
    const pretty = shapedLikeJson ? prettyJson(bodyPayload) : null;

    if (pretty !== null) {
      bodyKind = 'json';
      body = pretty;
      contentType = contentType ?? 'application/json';
    } else if (shapedLikeJson || headerSaysJson) {
      // JSON с заглушками из документации (<ID>, ...) не разбирается — отдаём как есть.
      bodyKind = 'json';
      body = bodyPayload;
      contentType = contentType ?? 'application/json';
      warnings.push({
        code: 'broken-json',
        message: 'Тело похоже на JSON, но не разбирается – скорее всего, в примере заглушки вроде <ID>. Подставьте настоящие значения.',
      });
    } else if (bodyPayload.includes('=')) {
      bodyKind = 'form';
      body = bodyPayload;
      contentType = contentType ?? 'application/x-www-form-urlencoded';
    } else {
      bodyKind = 'raw';
      body = bodyPayload;
      contentType = contentType ?? 'text/plain';
    }
  }

  let method = explicitMethod;
  if (!method) {
    method = bodyPayload || formParts.length > 0 ? 'POST' : 'GET';
    if (bodyPayload || formParts.length > 0) {
      warnings.push({
        code: 'no-method-guess',
        message: 'Метод в команде не указан. Раз есть тело – это POST.',
      });
    }
  }
  if (dataToQuery) method = explicitMethod || 'GET';

  return {
    ok: true,
    data: { method, url, rawUrl, query, headers, contentType, bodyKind, body, warnings },
  };
}
