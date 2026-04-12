export const CHAT_ID_PRESETS = [
  { label: '{{telegram_id}}', value: '{{ telegram_id}}' },
  { label: '-100...', value: '-1001234567890' },
  { label: '@channel', value: '@channelname' },
] as const;

export const LOCATION_PRESETS = [
  { label: 'Москва', lat: '55.7558', lon: '37.6176' },
  { label: 'СПб', lat: '59.9311', lon: '30.3609' },
  { label: 'Минск', lat: '53.9045', lon: '27.5615' },
  { label: 'Алматы', lat: '43.2220', lon: '76.8512' },
] as const;
