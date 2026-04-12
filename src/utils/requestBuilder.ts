import { DEFAULT_CHAT_ID, DICE_EMOJI_OPTIONS, REQUEST_METHODS } from '../constants/requestBuilder';
import { generateId, groupButtonsByRow } from './helpers';
import { buttonToJson } from './generateJson';
import type { ButtonConfig } from '../types';
import { getFormatModeFromParseMode, normalizeTextFormattingInput, validateFormattedText } from './textFormatting';
import type {
  AlbumItem,
  BotCommandItem,
  ChatPermissions,
  MediaGroupItemType,
  PollOptionItem,
  RequestFormState,
  RequestMethodConfig,
  RequestMethodId,
  RequestPreview,
} from '../types/requestBuilder';

const SEND_CATEGORIES = ['text', 'media', 'album', 'location', 'venue', 'contact', 'poll', 'dice'] as const;
type SendCategory = typeof SEND_CATEGORIES[number];

function isSendCategory(category: string): category is SendCategory {
  return (SEND_CATEGORIES as readonly string[]).includes(category);
}

function buildInlineKeyboard(buttons: ButtonConfig[]): Record<string, unknown> {
  const rows = groupButtonsByRow(buttons);
  return {
    inline_keyboard: rows.map(row => row.map(buttonToJson)),
  };
}

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

function buildSendPayload(
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

  if (config.supportsInlineKeyboard && form.inlineButtons.length > 0) {
    payload.reply_markup = buildInlineKeyboard(form.inlineButtons);
  }

  return payload;
}

function buildSpecialPayload(
  form: RequestFormState,
  config: RequestMethodConfig
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  const chatId = () => maybeNumber(form.chatId.trim() || DEFAULT_CHAT_ID);

  switch (config.id) {
    // ── GET ──────────────────────────────────────────────────────────────
    case 'getMe':
    case 'getWebhookInfo':
      return {};

    case 'getChat':
    case 'getChatAdministrators':
    case 'getChatMemberCount':
    case 'unpinAllChatMessages':
      payload.chat_id = chatId();
      break;

    case 'getChatMember':
      payload.chat_id = chatId();
      if (form.userId.trim()) payload.user_id = Number(form.userId);
      break;

    case 'getFile':
      if (form.fileId.trim()) payload.file_id = form.fileId.trim();
      break;

    case 'getUserProfilePhotos':
      if (form.userId.trim()) payload.user_id = Number(form.userId);
      if (form.userPhotosOffset.trim()) payload.offset = Number(form.userPhotosOffset);
      if (form.userPhotosLimit.trim()) payload.limit = Number(form.userPhotosLimit);
      break;

    // ── ADMIN ────────────────────────────────────────────────────────────
    case 'banChatMember':
      payload.chat_id = chatId();
      if (form.userId.trim()) payload.user_id = Number(form.userId);
      if (form.untilDate.trim()) payload.until_date = Number(form.untilDate);
      if (form.revokeMessages) payload.revoke_messages = true;
      break;

    case 'unbanChatMember':
      payload.chat_id = chatId();
      if (form.userId.trim()) payload.user_id = Number(form.userId);
      if (form.onlyIfBanned) payload.only_if_banned = true;
      break;

    case 'restrictChatMember':
      payload.chat_id = chatId();
      if (form.userId.trim()) payload.user_id = Number(form.userId);
      payload.permissions = buildChatPermissions(form.chatPermissions);
      if (form.untilDate.trim()) payload.until_date = Number(form.untilDate);
      break;

    case 'pinChatMessage':
      payload.chat_id = chatId();
      if (form.targetMessageId.trim()) payload.message_id = Number(form.targetMessageId);
      break;

    case 'unpinChatMessage':
      payload.chat_id = chatId();
      if (form.targetMessageId.trim()) payload.message_id = Number(form.targetMessageId);
      break;

    case 'setMyCommands': {
      const commands = form.botCommands
        .filter(cmd => cmd.command.trim())
        .map(cmd => ({ command: cmd.command.trim(), description: cmd.description.trim() }));
      payload.commands = commands;
      if (form.languageCode.trim()) payload.language_code = form.languageCode.trim();
      break;
    }

    case 'deleteMyCommands':
      if (form.languageCode.trim()) payload.language_code = form.languageCode.trim();
      break;

    // ── WEBHOOK ──────────────────────────────────────────────────────────
    case 'setWebhook':
      payload.url = form.webhookUrl.trim();
      if (form.webhookMaxConnections.trim()) {
        payload.max_connections = Number(form.webhookMaxConnections);
      }
      if (form.webhookAllowedUpdates.trim()) {
        try {
          payload.allowed_updates = JSON.parse(form.webhookAllowedUpdates);
        } catch {
          payload.allowed_updates = form.webhookAllowedUpdates.trim();
        }
      }
      if (form.webhookSecretToken.trim()) {
        payload.secret_token = form.webhookSecretToken.trim();
      }
      break;

    case 'deleteWebhook':
      if (form.dropPendingUpdates) payload.drop_pending_updates = true;
      break;

    case 'getUpdates':
      if (form.updatesOffset.trim()) payload.offset = Number(form.updatesOffset);
      if (form.updatesLimit.trim()) payload.limit = Number(form.updatesLimit);
      if (form.updatesTimeout.trim()) payload.timeout = Number(form.updatesTimeout);
      break;

    // ── INLINE ───────────────────────────────────────────────────────────
    case 'answerInlineQuery':
      payload.inline_query_id = form.inlineQueryId.trim();
      payload.results = [{
        type: 'article',
        id: form.inlineResultId.trim() || '1',
        title: form.inlineResultTitle.trim() || 'Результат',
        input_message_content: { message_text: form.inlineResultText.trim() },
      }];
      break;

    case 'answerWebAppQuery':
      payload.web_app_query_id = form.webAppQueryId.trim();
      payload.result = {
        type: 'article',
        id: '1',
        title: form.webAppResultTitle.trim() || 'Результат',
        input_message_content: { message_text: form.webAppResultUrl.trim() },
      };
      break;
  }

  return payload;
}

function buildChatPermissions(perms: ChatPermissions): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const key of Object.keys(perms) as Array<keyof ChatPermissions>) {
    result[key] = perms[key];
  }
  return result;
}

function buildPayload(
  form: RequestFormState,
  config: RequestMethodConfig
): Record<string, unknown> {
  if (isSendCategory(config.category)) {
    return buildSendPayload(form, config);
  }
  return buildSpecialPayload(form, config);
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

export function createDefaultBotCommand(): BotCommandItem {
  return {
    id: generateId(),
    command: '',
    description: '',
  };
}

const DEFAULT_CHAT_PERMISSIONS: ChatPermissions = {
  can_send_messages: false,
  can_send_audios: false,
  can_send_documents: false,
  can_send_photos: false,
  can_send_videos: false,
  can_send_video_notes: false,
  can_send_voice_notes: false,
  can_send_polls: false,
  can_send_other_messages: false,
  can_add_web_page_previews: false,
  can_change_info: false,
  can_invite_users: false,
  can_pin_messages: false,
  can_manage_topics: false,
};

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
    inlineButtons: [],
    // get
    userId: '',
    fileId: '',
    userPhotosOffset: '',
    userPhotosLimit: '',
    // admin
    targetMessageId: '',
    untilDate: '',
    revokeMessages: false,
    onlyIfBanned: false,
    chatPermissions: { ...DEFAULT_CHAT_PERMISSIONS },
    botCommands: [],
    botCommandScope: '',
    languageCode: '',
    // webhook
    webhookUrl: '',
    webhookMaxConnections: '',
    webhookAllowedUpdates: '',
    webhookSecretToken: '',
    dropPendingUpdates: false,
    updatesOffset: '',
    updatesLimit: '',
    updatesTimeout: '',
    // inline
    inlineQueryId: '',
    inlineResultId: '',
    inlineResultTitle: '',
    inlineResultText: '',
    webAppQueryId: '',
    webAppResultTitle: '',
    webAppResultUrl: '',
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

  if (isSendCategory(config.category)) {
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
    case 'get':
      switch (config.id) {
        case 'getChat':
        case 'getChatAdministrators':
        case 'getChatMemberCount':
          if (!form.chatId.trim()) errors.push('Поле chat_id обязательно.');
          break;
        case 'getChatMember':
          if (!form.chatId.trim()) errors.push('Поле chat_id обязательно.');
          if (!form.userId.trim()) errors.push('Поле user_id обязательно.');
          break;
        case 'getFile':
          if (!form.fileId.trim()) errors.push('Поле file_id обязательно.');
          break;
        case 'getUserProfilePhotos':
          if (!form.userId.trim()) errors.push('Поле user_id обязательно.');
          break;
      }
      break;
    case 'admin':
      switch (config.id) {
        case 'banChatMember':
        case 'unbanChatMember':
        case 'restrictChatMember':
          if (!form.chatId.trim()) errors.push('Поле chat_id обязательно.');
          if (!form.userId.trim()) errors.push('Поле user_id обязательно.');
          break;
        case 'pinChatMessage':
          if (!form.chatId.trim()) errors.push('Поле chat_id обязательно.');
          if (!form.targetMessageId.trim()) errors.push('Поле message_id обязательно.');
          break;
        case 'unpinChatMessage':
        case 'unpinAllChatMessages':
          if (!form.chatId.trim()) errors.push('Поле chat_id обязательно.');
          break;
        case 'setMyCommands':
          if (form.botCommands.length === 0) errors.push('Добавьте хотя бы одну команду.');
          form.botCommands.forEach((cmd, i) => {
            if (!cmd.command.trim()) errors.push(`Команда ${i + 1}: введите название.`);
            if (!cmd.description.trim()) errors.push(`Команда ${i + 1}: введите описание.`);
          });
          break;
      }
      break;
    case 'webhook':
      if (config.id === 'setWebhook' && !form.webhookUrl.trim()) {
        errors.push('Поле url обязательно для setWebhook.');
      }
      break;
    case 'inline':
      if (config.id === 'answerInlineQuery') {
        if (!form.inlineQueryId.trim()) errors.push('Поле inline_query_id обязательно.');
        if (!form.inlineResultText.trim()) errors.push('Поле message_text обязательно.');
      }
      if (config.id === 'answerWebAppQuery') {
        if (!form.webAppQueryId.trim()) errors.push('Поле web_app_query_id обязательно.');
      }
      break;
  }

  return errors;
}

export function getRequestWarnings(
  form: RequestFormState,
  config: RequestMethodConfig
): string[] {
  const warnings: string[] = [];

  if (config.id === 'sendSticker' && form.mediaSource === 'url') {
    warnings.push('Для animated/video sticker HTTP URL не подходит; используйте file_id.');
  }

  if (config.id === 'sendMediaGroup' && form.caption.trim()) {
    warnings.push('Подпись media group будет добавлена только к первому элементу массива media.');
  }

  if (isSendCategory(config.category)) {
    warnings.push('Локальный файл не поддерживается в этом конструкторе: сначала получите file_id или публичный URL через свой backend/хранилище.');
  }

  return warnings;
}
