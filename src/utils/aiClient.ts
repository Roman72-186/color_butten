// Клиент для бэкенда ИИ-диктовки (OpenRouter: Whisper + Claude).
// Бэкенд живёт на своём VPS (server-main, см. server/README.md) — вызываем его
// абсолютным URL, т.к. основной хостинг мини-аппа (GitHub Pages) отдаёт только
// статику и API не проксирует.
const API_BASE = 'https://knopki.assaru.space/api';

export type GenerateMode =
  | 'telegram-keyboard'
  | 'max-keyboard'
  | 'text-html'
  | 'text-markdown'
  | 'text-rich-html'
  | 'text-rich-markdown';

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json();
    if (data && typeof data === 'object' && typeof (data as { error?: unknown }).error === 'string') {
      return (data as { error: string }).error;
    }
  } catch {
    // ответ не JSON — используем сообщение по статусу ниже
  }
  return `Ошибка сервера (${response.status})`;
}

export async function transcribeAudio(audioBase64: string, format: string): Promise<string> {
  const response = await fetch(`${API_BASE}/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio: audioBase64, format }),
  });
  if (!response.ok) throw new Error(await readErrorMessage(response));
  const data = (await response.json()) as { text?: string };
  return data.text ?? '';
}

export async function generateFromText(text: string, mode: GenerateMode): Promise<unknown> {
  const response = await fetch(`${API_BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, mode }),
  });
  if (!response.ok) throw new Error(await readErrorMessage(response));
  const data = (await response.json()) as { result?: unknown };
  return data.result;
}
