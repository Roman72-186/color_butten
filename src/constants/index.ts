export const MAX_BUTTONS = 12;
export const MAX_PER_ROW = 3;

export const STYLES = [
  { value: 'default', label: 'Default', color: '#8597a8' },
  { value: 'primary', label: 'Primary', color: '#5eb5f7' },
  { value: 'success', label: 'Success', color: '#50c878' },
  { value: 'danger',  label: 'Danger',  color: '#e05555' },
] as const;

export const ACTION_TYPES = [
  { value: 'callback_data',                    label: 'Callback Data' },
  { value: 'url',                              label: 'URL' },
  { value: 'web_app',                          label: 'Web App' },
  { value: 'switch_inline_query_current_chat', label: 'Switch inline (этот чат)' },
  { value: 'switch_inline_query',              label: 'Switch inline (выбор чата)' },
] as const;

export const ICON_EMOJI_OPTIONS = [
  { id: '5257965174979042426', label: '☰ Меню' },
  { id: '5258204546391351475', label: '💰 Баланс' },
  { id: '5258024802010026053', label: '🔍 Поиск (inline)' },
  { id: '5258011929993026890', label: '👤 Профиль' },
  { id: '5429571366384842791', label: '🔎 Выбрать' },
  { id: '5453900977432188793', label: '⭐️ Отзывы' },
] as const;

// Premium emoji для вставки в текст сообщений.
// Формат HTML:  <tg-emoji emoji-id="ID">FALLBACK</tg-emoji>
// Формат MD V2: ![FALLBACK](tg://emoji?id=ID)
export const PREMIUM_EMOJI_OPTIONS = [
  { id: '5368324170671202286', fallback: '🔥', label: 'Огонь' },
  { id: '5271984870261684200', fallback: '⚡', label: 'Молния' },
  { id: '5307937912736537686', fallback: '❤️', label: 'Сердце' },
  { id: '5352234857594573787', fallback: '✅', label: 'Успех' },
  { id: '5350202786025349372', fallback: '⭐', label: 'Звезда' },
  { id: '5336834763001572174', fallback: '💎', label: 'Алмаз' },
  { id: '5359085591380696980', fallback: '🎯', label: 'Цель' },
  { id: '5379748062124056162', fallback: '💡', label: 'Идея' },
  { id: '5433653498439720726', fallback: '🚀', label: 'Ракета' },
  { id: '5441499809389690881', fallback: '🏆', label: 'Трофей' },
  { id: '5258204546391351475', fallback: '💰', label: 'Деньги' },
  { id: '5289109174179592403', fallback: '💫', label: 'Вспышка' },
  { id: '5471931636505309059', fallback: '🎁', label: 'Подарок' },
  { id: '5453900977432188793', fallback: '⭐️', label: 'Рейтинг' },
  { id: '5257965174979042426', fallback: '📋', label: 'Список' },
  { id: '5258011929993026890', fallback: '👤', label: 'Профиль' },
] as const;

export const ACTION_PLACEHOLDERS: Record<string, string> = {
  callback_data:                    'Введите callback_data',
  url:                              'Введите URL (https://...)',
  web_app:                          'Введите ссылку WebApp (https://...)',
  switch_inline_query_current_chat: 'Введите inline-запрос, например #my',
  switch_inline_query:              'Введите inline-запрос или оставьте пустым',
};
