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

export const ACTION_PLACEHOLDERS: Record<string, string> = {
  callback_data:                    'Введите callback_data',
  url:                              'Введите URL (https://...)',
  web_app:                          'Введите ссылку WebApp (https://...)',
  switch_inline_query_current_chat: 'Введите inline-запрос, например #my',
  switch_inline_query:              'Введите inline-запрос или оставьте пустым',
};
