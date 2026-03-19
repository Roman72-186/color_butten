import { DEFAULT_CHAT_ID, DICE_EMOJI_OPTIONS, REQUEST_METHODS } from '../constants/requestBuilder';
import { generateId } from './helpers';
import type {
  AlbumItem,
  MediaGroupItemType,
  RequestFormState,
  RequestMethodConfig,
  RequestMethodId,
  RequestPreview,
} from '../types/requestBuilder';

function maybeNumber(value: string): number | string {
  const trimmed = value.trim();
  if (/^-?\d+$/.test(trimmed)) {
    return Number(trimmed);
  }
  return trimmed;
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function pushIfValue(
  payload: Record<string, unknown>,
  key: string,
  value: string | boolean,
  allowFalse = false
) {
  if (typeof value === 'boolean') {
    if (value || allowFalse) {
      payload[key] = value;
    }
    return;
  }

  const trimmed = value.trim();
  if (trimmed) {
    payload[key] = trimmed;
  }
}

function getMethodConfig(method: RequestMethodId): RequestMethodConfig {
  return REQUEST_METHODS.find(item => item.id === method) ?? REQUEST_METHODS[0];
}

function getSingleUploadFieldName(method: RequestMethodConfig): string {
  return method.mediaField ?? 'file';
}

function getSingleAttachName(form: RequestFormState, method: RequestMethodConfig): string {
  const fieldName = getSingleUploadFieldName(method);
  const fileName = form.mediaFile?.name?.trim();
  return fileName ? `${fieldName}_${fileName}` : `${fieldName}_file`;
}

function getAlbumAttachName(index: number, item: AlbumItem): string {
  const fileName = item.file?.name?.trim();
  return fileName ? `media_${index + 1}_${fileName}` : `media_${index + 1}`;
}

function createCommonPayload(
  form: RequestFormState,
  config: RequestMethodConfig
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    chat_id: form.chatId.trim() || DEFAULT_CHAT_ID,
  };

  pushIfValue(payload, 'business_connection_id', form.businessConnectionId);

  if (form.messageThreadId.trim()) {
    payload.message_thread_id = maybeNumber(form.messageThreadId);
  }

  if (config.supportsDirectMessagesTopic && form.directMessagesTopicId.trim()) {
    payload.direct_messages_topic_id = maybeNumber(form.directMessagesTopicId);
  }

  pushIfValue(payload, 'disable_notification', form.disableNotification);
  pushIfValue(payload, 'protect_content', form.protectContent);
  pushIfValue(payload, 'allow_paid_broadcast', form.allowPaidBroadcast);
  pushIfValue(payload, 'message_effect_id', form.messageEffectId);

  return payload;
}

function getSingleMediaValue(
  form: RequestFormState,
  method: RequestMethodConfig
): string {
  if (form.mediaSource === 'upload') {
    return `attach://${getSingleAttachName(form, method)}`;
  }
  return form.mediaValue.trim();
}

function buildAlbumMediaArray(form: RequestFormState): Array<Record<string, unknown>> {
  return form.albumItems.map((item, index) => {
    const mediaValue = item.sourceMode === 'upload'
      ? `attach://${getAlbumAttachName(index, item)}`
      : item.value.trim();

    const mediaItem: Record<string, unknown> = {
      type: item.type,
      media: mediaValue,
    };

    if (index === 0 && form.caption.trim()) {
      mediaItem.caption = form.caption.trim();
      if (form.parseMode) {
        mediaItem.parse_mode = form.parseMode;
      }
    }

    return mediaItem;
  });
}

function buildPayload(
  form: RequestFormState,
  config: RequestMethodConfig
): Record<string, unknown> {
  const payload = createCommonPayload(form, config);

  switch (config.id) {
    case 'sendMessage':
      payload.text = form.text.trim();
      if (form.parseMode) {
        payload.parse_mode = form.parseMode;
      }
      break;
    case 'sendPhoto':
    case 'sendVideo':
    case 'sendAnimation':
    case 'sendAudio':
    case 'sendDocument':
    case 'sendSticker':
    case 'sendVoice':
    case 'sendVideoNote':
      if (config.mediaField) {
        payload[config.mediaField] = getSingleMediaValue(form, config);
      }
      if (config.supportsCaption && form.caption.trim()) {
        payload.caption = form.caption.trim();
      }
      if (config.supportsParseMode && form.parseMode) {
        payload.parse_mode = form.parseMode;
      }
      if (config.supportsShowCaptionAboveMedia && form.showCaptionAboveMedia) {
        payload.show_caption_above_media = true;
      }
      if (config.supportsSpoiler && form.hasSpoiler) {
        payload.has_spoiler = true;
      }
      if (config.id === 'sendSticker' && form.stickerEmoji.trim()) {
        payload.emoji = form.stickerEmoji.trim();
      }
      break;
    case 'sendMediaGroup':
      payload.media = buildAlbumMediaArray(form);
      break;
    case 'sendLocation':
      payload.latitude = Number(form.locationLatitude);
      payload.longitude = Number(form.locationLongitude);
      break;
    case 'sendVenue':
      payload.latitude = Number(form.locationLatitude);
      payload.longitude = Number(form.locationLongitude);
      payload.title = form.venueTitle.trim();
      payload.address = form.venueAddress.trim();
      break;
    case 'sendContact':
      payload.phone_number = form.contactPhoneNumber.trim();
      payload.first_name = form.contactFirstName.trim();
      if (form.contactLastName.trim()) {
        payload.last_name = form.contactLastName.trim();
      }
      break;
    case 'sendPoll': {
      const options = form.pollOptions
        .split('\n')
        .map(item => item.trim())
        .filter(Boolean);

      payload.question = form.pollQuestion.trim();
      payload.options = options;
      payload.type = form.pollType;
      payload.is_anonymous = form.pollIsAnonymous;
      payload.allows_multiple_answers = form.pollAllowsMultipleAnswers;

      if (form.pollType === 'quiz' && form.pollCorrectOptionId.trim()) {
        payload.correct_option_id = Number(form.pollCorrectOptionId);
      }
      break;
    }
    case 'sendDice':
      payload.emoji = form.diceEmoji;
      break;
  }

  return payload;
}

function formatFormPreview(payload: Record<string, unknown>): string {
  return JSON.stringify(payload, null, 2);
}

function formatJsonBodyPreview(payload: Record<string, unknown>): string {
  return JSON.stringify(payload, null, 2);
}

function usesMultipart(form: RequestFormState, config: RequestMethodConfig): boolean {
  if (config.category === 'media') {
    return form.mediaSource === 'upload';
  }

  if (config.category === 'album') {
    return form.albumItems.some(item => item.sourceMode === 'upload');
  }

  return false;
}

export function createDefaultAlbumItem(type: MediaGroupItemType = 'photo'): AlbumItem {
  return {
    id: generateId(),
    type,
    sourceMode: 'file_id',
    value: '',
    file: null,
  };
}

export function createDefaultRequestForm(): RequestFormState {
  return {
    method: 'sendMessage',
    chatId: DEFAULT_CHAT_ID,
    businessConnectionId: '',
    messageThreadId: '',
    directMessagesTopicId: '',
    disableNotification: false,
    protectContent: false,
    allowPaidBroadcast: false,
    messageEffectId: '',
    parseMode: 'HTML',
    text: '',
    caption: '',
    mediaSource: 'file_id',
    mediaValue: '',
    mediaFile: null,
    showCaptionAboveMedia: false,
    hasSpoiler: false,
    stickerEmoji: '',
    albumItems: [createDefaultAlbumItem(), createDefaultAlbumItem()],
    locationLatitude: '',
    locationLongitude: '',
    venueTitle: '',
    venueAddress: '',
    contactPhoneNumber: '',
    contactFirstName: '',
    contactLastName: '',
    pollQuestion: '',
    pollOptions: '',
    pollType: 'regular',
    pollIsAnonymous: true,
    pollAllowsMultipleAnswers: false,
    pollCorrectOptionId: '',
    diceEmoji: DICE_EMOJI_OPTIONS[0].value,
  };
}

export function getFileAcceptByMethod(method: RequestMethodConfig): string | undefined {
  switch (method.id) {
    case 'sendPhoto':
      return 'image/*';
    case 'sendVideo':
    case 'sendAnimation':
    case 'sendVideoNote':
      return 'video/*';
    case 'sendAudio':
    case 'sendVoice':
      return 'audio/*';
    case 'sendSticker':
      return '.webp,.png,.tgs,.webm';
    default:
      return undefined;
  }
}

export function getFileAcceptByAlbumType(type: MediaGroupItemType): string | undefined {
  switch (type) {
    case 'photo':
      return 'image/*';
    case 'video':
      return 'video/*';
    case 'audio':
      return 'audio/*';
    default:
      return undefined;
  }
}

export function buildRequestPreview(form: RequestFormState): RequestPreview {
  const config = getMethodConfig(form.method);
  const payload = buildPayload(form, config);
  const endpoint = `https://api.telegram.org/bot<token>/${config.id}`;
  const multipart = usesMultipart(form, config);

  return {
    endpoint,
    transportLabel: multipart ? 'multipart/form-data' : 'application/json',
    bodyPreview: multipart ? formatFormPreview(payload) : formatJsonBodyPreview(payload),
    warnings: getRequestWarnings(form, config),
    usesMultipart: multipart,
  };
}

export function validateRequestForm(form: RequestFormState): string[] {
  const config = getMethodConfig(form.method);
  const errors: string[] = [];

  if (!form.chatId.trim()) {
    errors.push('Поле chat_id обязательно.');
  }

  if (form.messageThreadId.trim() && !/^-?\d+$/.test(form.messageThreadId.trim())) {
    errors.push('message_thread_id должен быть числом.');
  }

  if (
    config.supportsDirectMessagesTopic &&
    form.directMessagesTopicId.trim() &&
    !/^-?\d+$/.test(form.directMessagesTopicId.trim())
  ) {
    errors.push('direct_messages_topic_id должен быть числом.');
  }

  switch (config.category) {
    case 'text':
      if (!form.text.trim()) {
        errors.push('Для sendMessage нужен текст.');
      }
      break;
    case 'media':
      if (form.mediaSource === 'upload') {
        if (!form.mediaFile) {
          errors.push('Выберите локальный файл для загрузки.');
        }
      } else if (!form.mediaValue.trim()) {
        errors.push(`Заполните поле ${config.mediaField}.`);
      } else if (form.mediaSource === 'url' && !isHttpUrl(form.mediaValue)) {
        errors.push('Для режима URL ссылка должна начинаться с http:// или https://.');
      }
      break;
    case 'album': {
      if (form.albumItems.length < 2) {
        errors.push('В media group должно быть минимум 2 элемента.');
      }

      form.albumItems.forEach((item, index) => {
        if (item.sourceMode === 'upload' && !item.file) {
          errors.push(`Элемент ${index + 1}: выберите файл для загрузки.`);
        }

        if ((item.sourceMode === 'file_id' || item.sourceMode === 'url') && !item.value.trim()) {
          errors.push(`Элемент ${index + 1}: заполните media.`);
        }

        if (item.sourceMode === 'url' && item.value.trim() && !isHttpUrl(item.value)) {
          errors.push(`Элемент ${index + 1}: URL должен начинаться с http:// или https://.`);
        }
      });

      const itemTypes = form.albumItems.map(item => item.type);
      const hasAudio = itemTypes.includes('audio');
      const hasDocument = itemTypes.includes('document');

      if (hasAudio && !itemTypes.every(type => type === 'audio')) {
        errors.push('Альбом с audio должен содержать только элементы типа audio.');
      }

      if (hasDocument && !itemTypes.every(type => type === 'document')) {
        errors.push('Альбом с document должен содержать только элементы типа document.');
      }
      break;
    }
    case 'location':
      if (!form.locationLatitude.trim() || Number.isNaN(Number(form.locationLatitude))) {
        errors.push('Введите корректную latitude.');
      }
      if (!form.locationLongitude.trim() || Number.isNaN(Number(form.locationLongitude))) {
        errors.push('Введите корректную longitude.');
      }
      break;
    case 'venue':
      if (!form.locationLatitude.trim() || Number.isNaN(Number(form.locationLatitude))) {
        errors.push('Введите корректную latitude.');
      }
      if (!form.locationLongitude.trim() || Number.isNaN(Number(form.locationLongitude))) {
        errors.push('Введите корректную longitude.');
      }
      if (!form.venueTitle.trim()) {
        errors.push('Для venue нужен title.');
      }
      if (!form.venueAddress.trim()) {
        errors.push('Для venue нужен address.');
      }
      break;
    case 'contact':
      if (!form.contactPhoneNumber.trim()) {
        errors.push('Для contact нужен phone_number.');
      }
      if (!form.contactFirstName.trim()) {
        errors.push('Для contact нужен first_name.');
      }
      break;
    case 'poll': {
      const options = form.pollOptions
        .split('\n')
        .map(item => item.trim())
        .filter(Boolean);

      if (!form.pollQuestion.trim()) {
        errors.push('Для poll нужен вопрос.');
      }

      if (options.length < 2) {
        errors.push('Для poll нужно минимум 2 варианта ответа.');
      }

      if (
        form.pollType === 'quiz' &&
        form.pollCorrectOptionId.trim() &&
        (!/^\d+$/.test(form.pollCorrectOptionId.trim()) ||
          Number(form.pollCorrectOptionId) >= options.length)
      ) {
        errors.push('correct_option_id должен ссылаться на существующий вариант ответа.');
      }
      break;
    }
  }

  return errors;
}

export function getRequestWarnings(
  form: RequestFormState,
  config: RequestMethodConfig
): string[] {
  const warnings: string[] = [];

  if (config.note) {
    warnings.push(config.note);
  }

  if (config.id === 'sendSticker' && form.mediaSource === 'url') {
    warnings.push('Для animated/video sticker HTTP URL не подходит; используйте file_id или multipart upload.');
  }

  if (config.id === 'sendMediaGroup' && form.caption.trim()) {
    warnings.push('Подпись media group будет добавлена только к первому элементу массива media.');
  }

  if (form.mediaSource === 'upload' && config.category === 'media') {
    warnings.push('Локальный файл отправляется через multipart/form-data, без публичной ссылки.');
  }

  if (config.category === 'album' && form.albumItems.some(item => item.sourceMode === 'upload')) {
    warnings.push('Для album с локальными файлами Bot API использует attach:// и multipart/form-data.');
  }

  return warnings;
}
