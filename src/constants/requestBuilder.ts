import type {
  MediaGroupItemType,
  MediaSourceMode,
  PollType,
  RequestMethodConfig,
  RequestParseMode,
} from '../types/requestBuilder';

export const REQUEST_METHODS: RequestMethodConfig[] = [
  {
    id: 'sendMessage',
    title: 'sendMessage',
    description: 'Текстовое сообщение',
    category: 'text',
    supportsParseMode: true,
    supportsDirectMessagesTopic: true,
    note: 'Подходит для обычного текста, HTML и MarkdownV2.',
  },
  {
    id: 'sendPhoto',
    title: 'sendPhoto',
    description: 'Фото',
    category: 'media',
    mediaField: 'photo',
    supportsCaption: true,
    supportsParseMode: true,
    supportsSpoiler: true,
    supportsShowCaptionAboveMedia: true,
    supportsDirectMessagesTopic: true,
  },
  {
    id: 'sendVideo',
    title: 'sendVideo',
    description: 'Видео',
    category: 'media',
    mediaField: 'video',
    supportsCaption: true,
    supportsParseMode: true,
    supportsSpoiler: true,
    supportsShowCaptionAboveMedia: true,
    supportsDirectMessagesTopic: true,
  },
  {
    id: 'sendAnimation',
    title: 'sendAnimation',
    description: 'GIF / анимация',
    category: 'media',
    mediaField: 'animation',
    supportsCaption: true,
    supportsParseMode: true,
    supportsShowCaptionAboveMedia: true,
    supportsDirectMessagesTopic: true,
  },
  {
    id: 'sendAudio',
    title: 'sendAudio',
    description: 'Музыка / аудио',
    category: 'media',
    mediaField: 'audio',
    supportsCaption: true,
    supportsParseMode: true,
    supportsDirectMessagesTopic: true,
  },
  {
    id: 'sendDocument',
    title: 'sendDocument',
    description: 'Документ',
    category: 'media',
    mediaField: 'document',
    supportsCaption: true,
    supportsParseMode: true,
    supportsDirectMessagesTopic: true,
  },
  {
    id: 'sendSticker',
    title: 'sendSticker',
    description: 'Стикер',
    category: 'media',
    mediaField: 'sticker',
    supportsDirectMessagesTopic: true,
    note: 'HTTP URL подходит только для статических WEBP-стикеров.',
  },
  {
    id: 'sendVoice',
    title: 'sendVoice',
    description: 'Голосовое',
    category: 'media',
    mediaField: 'voice',
    supportsCaption: true,
    supportsParseMode: true,
    supportsDirectMessagesTopic: true,
  },
  {
    id: 'sendVideoNote',
    title: 'sendVideoNote',
    description: 'Видеосообщение',
    category: 'media',
    mediaField: 'video_note',
    supportsDirectMessagesTopic: true,
  },
  {
    id: 'sendMediaGroup',
    title: 'sendMediaGroup',
    description: 'Альбом media group',
    category: 'album',
    supportsParseMode: true,
    supportsDirectMessagesTopic: true,
    note: 'Можно смешивать фото и видео. Документы и аудио нужно отправлять отдельным альбомом одного типа.',
  },
  {
    id: 'sendLocation',
    title: 'sendLocation',
    description: 'Геолокация',
    category: 'location',
    supportsDirectMessagesTopic: true,
  },
  {
    id: 'sendVenue',
    title: 'sendVenue',
    description: 'Место / venue',
    category: 'venue',
    supportsDirectMessagesTopic: true,
  },
  {
    id: 'sendContact',
    title: 'sendContact',
    description: 'Контакт',
    category: 'contact',
    supportsDirectMessagesTopic: true,
  },
  {
    id: 'sendPoll',
    title: 'sendPoll',
    description: 'Опрос',
    category: 'poll',
    note: 'Для опроса нужно минимум 2 варианта ответа.',
  },
  {
    id: 'sendDice',
    title: 'sendDice',
    description: 'Dice / emoji game',
    category: 'dice',
    supportsDirectMessagesTopic: true,
  },
];

export const MEDIA_SOURCE_OPTIONS: Array<{ value: MediaSourceMode; label: string }> = [
  { value: 'file_id', label: 'file_id' },
  { value: 'url', label: 'HTTP URL' },
  { value: 'upload', label: 'Загрузка файла' },
];

export const PARSE_MODE_OPTIONS: Array<{ value: RequestParseMode; label: string }> = [
  { value: '', label: 'Без parse_mode' },
  { value: 'HTML', label: 'HTML' },
  { value: 'Markdown', label: 'Markdown' },
  { value: 'MarkdownV2', label: 'MarkdownV2' },
];

export const ALBUM_ITEM_TYPE_OPTIONS: Array<{ value: MediaGroupItemType; label: string }> = [
  { value: 'photo', label: 'Фото' },
  { value: 'video', label: 'Видео' },
  { value: 'document', label: 'Документ' },
  { value: 'audio', label: 'Аудио' },
];

export const POLL_TYPE_OPTIONS: Array<{ value: PollType; label: string }> = [
  { value: 'regular', label: 'Обычный' },
  { value: 'quiz', label: 'Quiz' },
];

export const DICE_EMOJI_OPTIONS = [
  { value: '🎲', label: '🎲 Кубик' },
  { value: '🎯', label: '🎯 Дартс' },
  { value: '🏀', label: '🏀 Баскетбол' },
  { value: '⚽', label: '⚽ Футбол' },
  { value: '🎳', label: '🎳 Боулинг' },
  { value: '🎰', label: '🎰 Слот' },
] as const;
