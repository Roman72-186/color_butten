import { DEFAULT_CHAT_ID, DICE_EMOJI_OPTIONS, REQUEST_METHODS } from '../constants/requestBuilder';
import { generateId } from './helpers';
import { getFormatModeFromParseMode, normalizeTextFormattingInput, validateFormattedText } from './textFormatting';
import type {
  AlbumItem,
  MediaGroupItemType,
  PollOptionItem,
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

function getSingleMediaValue(form: RequestFormState): string {
  return form.mediaValue.trim();
}

function normalizeFormattedValue(text: string, parseMode: RequestFormState['parseMode']): string {
  const formatMode = getFormatModeFromParseMode(parseMode);
  const trimmed = text.trim();

  if (!formatMode || !trimmed) {
    return trimmed;
  }

  return normalizeTextFormattingInput(trimmed, formatMode);
}

function getPollOptionTexts(options: PollOptionItem[]): string[] {
  return options
    .map(item => item.text.trim())
    .filter(Boolean);
}

function getPollCorrectOptionIndex(form: RequestFormState): number {
  if (!form.pollCorrectOptionId) {
    return -1;
  }

  return form.pollOptions.findIndex(option => option.id === form.pollCorrectOptionId);
}

function buildAlbumMediaArray(form: RequestFormState): Array<Record<string, unknown>> {
  const normalizedCaption = normalizeFormattedValue(form.caption, form.parseMode);

  return form.albumItems.map((item, index) => {
    const mediaValue = item.value.trim();

    const mediaItem: Record<string, unknown> = {
      type: item.type,
      media: mediaValue,
    };

    if (index === 0 && normalizedCaption) {
      mediaItem.caption = normalizedCaption;
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
  const normalizedText = normalizeFormattedValue(form.text, form.parseMode);
  const normalizedCaption = normalizeFormattedValue(form.caption, form.parseMode);
  const normalizedPollExplanation = normalizeFormattedValue(
    form.pollExplanation,
    form.pollExplanationParseMode
  );

  switch (config.id) {
    case 'sendMessage':
      payload.text = normalizedText;
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
        payload[config.mediaField] = getSingleMediaValue(form);
      }
      if (config.supportsCaption && normalizedCaption) {
        payload.caption = normalizedCaption;
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
        .map(item => item.text.trim())
        .filter(Boolean)
        .map(text => ({ text }));
      const correctOptionIndex = getPollCorrectOptionIndex(form);

      payload.question = form.pollQuestion.trim();
      payload.options = options;
      payload.type = form.pollType;
      payload.is_anonymous = form.pollIsAnonymous;
      payload.allows_multiple_answers = form.pollType === 'quiz' ? false : form.pollAllowsMultipleAnswers;

      if (form.pollType === 'quiz' && correctOptionIndex >= 0) {
        payload.correct_option_id = correctOptionIndex;
      }

      if (normalizedPollExplanation) {
        payload.explanation = normalizedPollExplanation;
        if (form.pollExplanationParseMode) {
          payload.explanation_parse_mode = form.pollExplanationParseMode;
        }
      }

      if (form.pollOpenPeriod.trim()) {
        payload.open_period = Number(form.pollOpenPeriod);
      }

      if (form.pollCloseDate.trim()) {
        payload.close_date = Number(form.pollCloseDate);
      }

      if (form.pollIsClosed) {
        payload.is_closed = true;
      }
      break;
    }
    case 'sendDice':
      payload.emoji = form.diceEmoji;
      break;
  }

  return payload;
}

function formatJsonBodyPreview(payload: Record<string, unknown>): string {
  return JSON.stringify(payload, null, 2);
}

export function createDefaultAlbumItem(type: MediaGroupItemType = 'photo'): AlbumItem {
  return {
    id: generateId(),
    type,
    sourceMode: 'file_id',
    value: '',
  };
}

export function createDefaultPollOption(text = ''): PollOptionItem {
  return {
    id: generateId(),
    text,
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
    pollOptions: [createDefaultPollOption(), createDefaultPollOption()],
    pollType: 'regular',
    pollIsAnonymous: true,
    pollAllowsMultipleAnswers: false,
    pollCorrectOptionId: '',
    pollExplanation: '',
    pollExplanationParseMode: 'HTML',
    pollOpenPeriod: '',
    pollCloseDate: '',
    pollIsClosed: false,
    diceEmoji: DICE_EMOJI_OPTIONS[0].value,
  };
}

export function buildRequestPreview(form: RequestFormState): RequestPreview {
  const config = getMethodConfig(form.method);
  const payload = buildPayload(form, config);
  const endpoint = `https://api.telegram.org/bot<token>/${config.id}`;

  return {
    endpoint,
    transportLabel: 'application/json',
    bodyPreview: formatJsonBodyPreview(payload),
    warnings: getRequestWarnings(form, config),
  };
}

export function validateRequestForm(form: RequestFormState): string[] {
  const config = getMethodConfig(form.method);
  const errors: string[] = [];
  const formatMode = getFormatModeFromParseMode(form.parseMode);
  const normalizedText = formatMode ? normalizeTextFormattingInput(form.text, formatMode) : form.text;
  const normalizedCaption = formatMode ? normalizeTextFormattingInput(form.caption, formatMode) : form.caption;

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
      if (formatMode) {
        errors.push(
          ...validateFormattedText(normalizedText, formatMode, { validatePercentEncoding: false })
            .map(error => `text: ${error}`)
        );
      }
      break;
    case 'media':
      if (!form.mediaValue.trim()) {
        errors.push(`Заполните поле ${config.mediaField}.`);
      } else if (form.mediaSource === 'url' && !isHttpUrl(form.mediaValue)) {
        errors.push('Для режима URL ссылка должна начинаться с http:// или https://.');
      }
      if (config.supportsCaption && formatMode) {
        errors.push(
          ...validateFormattedText(normalizedCaption, formatMode, { validatePercentEncoding: false })
            .map(error => `caption: ${error}`)
        );
      }
      break;
    case 'album': {
      if (form.albumItems.length < 2) {
        errors.push('В media group должно быть минимум 2 элемента.');
      }

      form.albumItems.forEach((item, index) => {
        if (!item.value.trim()) {
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
      if (formatMode) {
        errors.push(
          ...validateFormattedText(normalizedCaption, formatMode, { validatePercentEncoding: false })
            .map(error => `caption: ${error}`)
        );
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
      const options = getPollOptionTexts(form.pollOptions);
      const correctOptionIndex = getPollCorrectOptionIndex(form);
      const normalizedExplanation = normalizeFormattedValue(
        form.pollExplanation,
        form.pollExplanationParseMode
      );
      const explanationMode = getFormatModeFromParseMode(form.pollExplanationParseMode);
      const openPeriod = form.pollOpenPeriod.trim();
      const closeDate = form.pollCloseDate.trim();
      const explanationLineBreaks = (normalizedExplanation.match(/\n/g) || []).length;

      if (!form.pollQuestion.trim()) {
        errors.push('Для poll нужен вопрос.');
      }

      if (form.pollQuestion.trim().length > 300) {
        errors.push('Вопрос poll не должен превышать 300 символов.');
      }

      if (options.length < 2) {
        errors.push('Для poll нужно минимум 2 варианта ответа.');
      }

      if (options.length > 12) {
        errors.push('В poll можно передать не больше 12 вариантов ответа.');
      }

      form.pollOptions.forEach((option, index) => {
        const trimmed = option.text.trim();

        if (!trimmed) {
          errors.push(`Вариант ${index + 1}: введите текст ответа.`);
          return;
        }

        if (trimmed.length > 100) {
          errors.push(`Вариант ${index + 1}: текст ответа не должен превышать 100 символов.`);
        }
      });

      if (form.pollType === 'quiz' && correctOptionIndex < 0) {
        errors.push('Для quiz нужно выбрать правильный ответ.');
      }

      if (normalizedExplanation.length > 200) {
        errors.push('explanation не должно превышать 200 символов.');
      }

      if (explanationLineBreaks > 2) {
        errors.push('explanation может содержать не более 2 переносов строк.');
      }

      if (explanationMode && normalizedExplanation) {
        errors.push(
          ...validateFormattedText(normalizedExplanation, explanationMode, {
            validatePercentEncoding: false,
          }).map(error => `explanation: ${error}`)
        );
      }

      if (openPeriod && closeDate) {
        errors.push('В sendPoll нельзя одновременно задавать open_period и close_date.');
      }

      if (openPeriod && (!/^\d+$/.test(openPeriod) || Number(openPeriod) < 5 || Number(openPeriod) > 600)) {
        errors.push('open_period должен быть числом от 5 до 600 секунд.');
      }

      if (closeDate) {
        const now = Math.floor(Date.now() / 1000);
        const closeDateValue = Number(closeDate);

        if (!/^\d+$/.test(closeDate) || Number.isNaN(closeDateValue)) {
          errors.push('close_date должен быть Unix timestamp.');
        } else if (closeDateValue < now + 5 || closeDateValue > now + 600) {
          errors.push('close_date должен быть между +5 и +600 секунд от текущего времени.');
        }
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
    warnings.push('Для animated/video sticker HTTP URL не подходит; используйте file_id.');
  }

  if (config.id === 'sendMediaGroup' && form.caption.trim()) {
    warnings.push('Подпись media group будет добавлена только к первому элементу массива media.');
  }

  warnings.push('Локальный файл не поддерживается в этом конструкторе: сначала получите file_id или публичный URL через свой backend/хранилище.');

  return warnings;
}
