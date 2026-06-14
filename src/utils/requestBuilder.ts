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

const SEND_CATEGORIES = ['text', 'media', 'live_photo', 'album', 'location', 'venue', 'contact', 'poll', 'dice'] as const;
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

function parseNumberList(value: string): number[] {
  return value
    .split(/[\s,]+/)
    .map(item => item.trim())
    .filter(Boolean)
    .map(Number);
}

function parseStringList(value: string): string[] {
  return value
    .split(/[\s,]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

function isNumberList(value: string): boolean {
  const items = value
    .split(/[\s,]+/)
    .map(item => item.trim())
    .filter(Boolean);

  return items.length > 0 && items.every(item => /^\d+$/.test(item));
}

function parseJsonPreview(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value.trim();
  }
}

function isJsonObject(value: string): boolean {
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

function addSendOptions(payload: Record<string, unknown>, form: RequestFormState) {
  pushIfValue(payload, 'disable_notification', form.disableNotification);
  pushIfValue(payload, 'protect_content', form.protectContent);
}

function addEditableMessageTarget(payload: Record<string, unknown>, form: RequestFormState) {
  if (form.inlineMessageId.trim()) {
    payload.inline_message_id = form.inlineMessageId.trim();
    return;
  }

  payload.chat_id = maybeNumber(form.chatId.trim() || DEFAULT_CHAT_ID);
  if (form.targetMessageId.trim()) {
    payload.message_id = Number(form.targetMessageId);
  }
}

function getMethodConfig(method: RequestMethodId): RequestMethodConfig {
  return REQUEST_METHODS.find(item => item.id === method) ?? REQUEST_METHODS[0];
}

function createCommonPayload(
  form: RequestFormState
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    chat_id: form.chatId.trim() || DEFAULT_CHAT_ID,
  };

  if (form.messageThreadId.trim()) {
    payload.message_thread_id = maybeNumber(form.messageThreadId);
  }

  if (form.directMessagesTopicId.trim()) {
    payload.direct_messages_topic_id = Number(form.directMessagesTopicId);
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

function getPollCorrectOptionIndexes(form: RequestFormState): number[] {
  const selectedIds = new Set(form.pollCorrectOptionIds);

  return form.pollOptions
    .map((option, index) => selectedIds.has(option.id) ? index : -1)
    .filter(index => index >= 0);
}

function buildInputRichMessage(form: RequestFormState): Record<string, unknown> {
  const key = form.richMessageFormat === 'markdown' ? 'markdown' : 'html';
  const richMessage: Record<string, unknown> = {
    [key]: form.richMessageContent.trim(),
  };

  if (form.richMessageIsRtl) {
    richMessage.is_rtl = true;
  }

  if (form.richMessageSkipEntityDetection) {
    richMessage.skip_entity_detection = true;
  }

  return richMessage;
}

function buildInlineArticleResult(form: RequestFormState): Record<string, unknown> {
  return {
    type: 'article',
    id: form.inlineResultId.trim() || '1',
    title: form.inlineResultTitle.trim() || form.webAppResultTitle.trim() || 'Результат',
    input_message_content: form.inlineUseRichMessage
      ? { rich_message: buildInputRichMessage(form) }
      : { message_text: form.inlineResultText.trim() || form.webAppResultUrl.trim() },
  };
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
  const payload = createCommonPayload(form);
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
    case 'sendLivePhoto':
      payload.live_photo = form.livePhotoValue.trim();
      payload.photo = form.livePhotoPhoto.trim();
      if (normalizedCaption) {
        payload.caption = normalizedCaption;
      }
      if (normalizedCaption && form.parseMode) {
        payload.parse_mode = form.parseMode;
      }
      if (form.showCaptionAboveMedia) {
        payload.show_caption_above_media = true;
      }
      if (form.hasSpoiler) {
        payload.has_spoiler = true;
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
        .filter(item => item.text.trim())
        .map(item => {
          const option: Record<string, unknown> = { text: item.text.trim() };
          if (item.mediaJson.trim()) {
            option.media = parseJsonPreview(item.mediaJson);
          }
          return option;
        });
      const correctOptionIndexes = getPollCorrectOptionIndexes(form);

      payload.question = form.pollQuestion.trim();
      payload.options = options;
      payload.type = form.pollType;
      payload.is_anonymous = form.pollIsAnonymous;
      payload.allows_multiple_answers = form.pollAllowsMultipleAnswers;

      if (form.pollType === 'quiz' && correctOptionIndexes.length > 0) {
        payload.correct_option_ids = correctOptionIndexes;
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

      if (form.pollDescription.trim()) {
        payload.description = normalizeFormattedValue(form.pollDescription, form.pollDescriptionParseMode);
        if (form.pollDescriptionParseMode) {
          payload.description_parse_mode = form.pollDescriptionParseMode;
        }
      }

      if (form.pollMediaJson.trim()) {
        payload.media = parseJsonPreview(form.pollMediaJson);
      }

      if (form.pollExplanationMediaJson.trim()) {
        payload.explanation_media = parseJsonPreview(form.pollExplanationMediaJson);
      }

      pushIfValue(payload, 'allows_revoting', form.pollAllowsRevoting);
      pushIfValue(payload, 'shuffle_options', form.pollShuffleOptions);
      pushIfValue(payload, 'allow_adding_options', form.pollAllowAddingOptions);
      pushIfValue(payload, 'hide_results_until_closes', form.pollHideResultsUntilCloses);
      pushIfValue(payload, 'members_only', form.pollMembersOnly);

      if (form.pollCountryCodes.trim()) {
        payload.country_codes = parseStringList(form.pollCountryCodes).map(code => code.toUpperCase());
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
  const normalizedText = normalizeFormattedValue(form.text, form.parseMode);
  const normalizedCaption = normalizeFormattedValue(form.caption, form.parseMode);

  switch (config.id) {
    case 'sendRichMessage':
      payload.chat_id = chatId();
      if (form.messageThreadId.trim()) payload.message_thread_id = maybeNumber(form.messageThreadId);
      if (form.directMessagesTopicId.trim()) payload.direct_messages_topic_id = Number(form.directMessagesTopicId);
      payload.rich_message = buildInputRichMessage(form);
      addSendOptions(payload, form);
      pushIfValue(payload, 'allow_paid_broadcast', form.allowPaidBroadcast);
      if (form.inlineButtons.length > 0) payload.reply_markup = buildInlineKeyboard(form.inlineButtons);
      break;

    case 'sendRichMessageDraft':
      payload.chat_id = chatId();
      if (form.messageThreadId.trim()) payload.message_thread_id = maybeNumber(form.messageThreadId);
      payload.draft_id = Number(form.richMessageDraftId);
      payload.rich_message = buildInputRichMessage(form);
      break;

    case 'forwardMessage':
      payload.chat_id = chatId();
      payload.from_chat_id = maybeNumber(form.fromChatId.trim());
      payload.message_id = Number(form.targetMessageId);
      if (form.messageThreadId.trim()) payload.message_thread_id = maybeNumber(form.messageThreadId);
      addSendOptions(payload, form);
      break;

    case 'forwardMessages':
      payload.chat_id = chatId();
      payload.from_chat_id = maybeNumber(form.fromChatId.trim());
      payload.message_ids = parseNumberList(form.messageIds);
      if (form.messageThreadId.trim()) payload.message_thread_id = maybeNumber(form.messageThreadId);
      pushIfValue(payload, 'disable_notification', form.disableNotification);
      pushIfValue(payload, 'protect_content', form.protectContent);
      break;

    case 'copyMessage':
      payload.chat_id = chatId();
      payload.from_chat_id = maybeNumber(form.fromChatId.trim());
      payload.message_id = Number(form.targetMessageId);
      if (form.messageThreadId.trim()) payload.message_thread_id = maybeNumber(form.messageThreadId);
      if (normalizedCaption) payload.caption = normalizedCaption;
      if (normalizedCaption && form.parseMode) payload.parse_mode = form.parseMode;
      if (form.showCaptionAboveMedia) payload.show_caption_above_media = true;
      if (form.inlineButtons.length > 0) payload.reply_markup = buildInlineKeyboard(form.inlineButtons);
      addSendOptions(payload, form);
      break;

    case 'copyMessages':
      payload.chat_id = chatId();
      payload.from_chat_id = maybeNumber(form.fromChatId.trim());
      payload.message_ids = parseNumberList(form.messageIds);
      if (form.messageThreadId.trim()) payload.message_thread_id = maybeNumber(form.messageThreadId);
      if (form.removeCaption) payload.remove_caption = true;
      pushIfValue(payload, 'disable_notification', form.disableNotification);
      pushIfValue(payload, 'protect_content', form.protectContent);
      break;

    // ── GET ──────────────────────────────────────────────────────────────
    case 'getMe':
    case 'getWebhookInfo':
      return {};

    case 'getChat':
    case 'getChatAdministrators':
    case 'getChatMemberCount':
    case 'unpinAllChatMessages':
      payload.chat_id = chatId();
      if (config.id === 'getChatAdministrators' && form.chatAdminReturnBots) {
        payload.return_bots = true;
      }
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

    case 'getUserPersonalChatMessages':
      if (form.userId.trim()) payload.user_id = Number(form.userId);
      if (form.personalChatMessagesLimit.trim()) payload.limit = Number(form.personalChatMessagesLimit);
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

    case 'getManagedBotAccessSettings':
      if (form.userId.trim()) payload.user_id = Number(form.userId);
      break;

    case 'setManagedBotAccessSettings':
      if (form.userId.trim()) payload.user_id = Number(form.userId);
      payload.is_access_restricted = form.isAccessRestricted;
      if (form.addedUserIds.trim()) {
        payload.added_user_ids = parseNumberList(form.addedUserIds);
      }
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
      payload.results = [buildInlineArticleResult(form)];
      break;

    case 'answerWebAppQuery':
      payload.web_app_query_id = form.webAppQueryId.trim();
      payload.result = buildInlineArticleResult(form);
      break;

    case 'answerGuestQuery':
      payload.guest_query_id = form.guestQueryId.trim();
      payload.result = buildInlineArticleResult(form);
      break;

    case 'answerChatJoinRequestQuery':
      payload.chat_join_request_query_id = form.chatJoinRequestQueryId.trim();
      payload.result = form.chatJoinRequestResult;
      break;

    case 'sendChatJoinRequestWebApp':
      payload.chat_join_request_query_id = form.chatJoinRequestQueryId.trim();
      payload.web_app_url = form.chatJoinRequestWebAppUrl.trim();
      break;

    case 'editMessageText':
      addEditableMessageTarget(payload, form);
      if (form.editUseRichMessage) {
        payload.rich_message = buildInputRichMessage(form);
      } else {
        payload.text = normalizedText;
        if (form.parseMode) payload.parse_mode = form.parseMode;
      }
      if (form.inlineButtons.length > 0) payload.reply_markup = buildInlineKeyboard(form.inlineButtons);
      break;

    case 'editMessageCaption':
      addEditableMessageTarget(payload, form);
      payload.caption = normalizedCaption;
      if (form.parseMode) payload.parse_mode = form.parseMode;
      if (form.showCaptionAboveMedia) payload.show_caption_above_media = true;
      if (form.inlineButtons.length > 0) payload.reply_markup = buildInlineKeyboard(form.inlineButtons);
      break;

    case 'editMessageMedia':
      addEditableMessageTarget(payload, form);
      payload.media = {
        type: form.editMediaType,
        media: form.mediaValue.trim(),
        ...(normalizedCaption ? { caption: normalizedCaption } : {}),
        ...(normalizedCaption && form.parseMode ? { parse_mode: form.parseMode } : {}),
        ...(form.showCaptionAboveMedia ? { show_caption_above_media: true } : {}),
      };
      if (form.inlineButtons.length > 0) payload.reply_markup = buildInlineKeyboard(form.inlineButtons);
      break;

    case 'editMessageLiveLocation':
      addEditableMessageTarget(payload, form);
      payload.latitude = Number(form.locationLatitude);
      payload.longitude = Number(form.locationLongitude);
      if (form.inlineButtons.length > 0) payload.reply_markup = buildInlineKeyboard(form.inlineButtons);
      break;

    case 'stopMessageLiveLocation':
    case 'editMessageReplyMarkup':
      addEditableMessageTarget(payload, form);
      if (form.inlineButtons.length > 0) payload.reply_markup = buildInlineKeyboard(form.inlineButtons);
      break;

    case 'editMessageChecklist':
      payload.chat_id = chatId();
      payload.message_id = Number(form.targetMessageId);
      payload.checklist = parseJsonPreview(form.checklistJson);
      if (form.inlineButtons.length > 0) payload.reply_markup = buildInlineKeyboard(form.inlineButtons);
      break;

    case 'stopPoll':
      payload.chat_id = chatId();
      payload.message_id = Number(form.targetMessageId);
      if (form.inlineButtons.length > 0) payload.reply_markup = buildInlineKeyboard(form.inlineButtons);
      break;

    case 'approveSuggestedPost':
      payload.chat_id = chatId();
      payload.message_id = Number(form.targetMessageId);
      if (form.suggestedPostSendDate.trim()) payload.send_date = Number(form.suggestedPostSendDate);
      break;

    case 'declineSuggestedPost':
      payload.chat_id = chatId();
      payload.message_id = Number(form.targetMessageId);
      if (form.suggestedPostComment.trim()) payload.comment = form.suggestedPostComment.trim();
      break;

    case 'deleteMessage':
      payload.chat_id = chatId();
      payload.message_id = Number(form.targetMessageId);
      break;

    case 'deleteMessages':
      payload.chat_id = chatId();
      payload.message_ids = parseNumberList(form.messageIds);
      break;

    case 'deleteMessageReaction':
      payload.chat_id = chatId();
      payload.message_id = Number(form.targetMessageId);
      if (form.userId.trim()) payload.user_id = Number(form.userId);
      if (form.actorChatId.trim()) payload.actor_chat_id = Number(form.actorChatId);
      break;

    case 'deleteAllMessageReactions':
      payload.chat_id = chatId();
      if (form.userId.trim()) payload.user_id = Number(form.userId);
      if (form.actorChatId.trim()) payload.actor_chat_id = Number(form.actorChatId);
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
    mediaJson: '',
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
  can_react_to_messages: false,
  can_edit_tag: false,
  can_change_info: false,
  can_invite_users: false,
  can_pin_messages: false,
  can_manage_topics: false,
};

export function createDefaultRequestForm(): RequestFormState {
  return {
    method: 'sendMessage',
    chatId: DEFAULT_CHAT_ID,
    messageThreadId: '',
    directMessagesTopicId: '',
    disableNotification: false,
    protectContent: false,
    allowPaidBroadcast: false,
    messageEffectId: '',
    parseMode: 'HTML',
    text: '',
    richMessageFormat: 'html',
    richMessageContent: '<p>Текст rich message</p>',
    richMessageIsRtl: false,
    richMessageSkipEntityDetection: false,
    richMessageDraftId: '1',
    caption: '',
    mediaSource: 'file_id',
    mediaValue: '',
    livePhotoValue: '',
    livePhotoPhoto: '',
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
    pollCorrectOptionIds: [],
    pollExplanation: '',
    pollExplanationParseMode: 'HTML',
    pollDescription: '',
    pollDescriptionParseMode: 'HTML',
    pollMediaJson: '',
    pollExplanationMediaJson: '',
    pollOpenPeriod: '',
    pollCloseDate: '',
    pollIsClosed: false,
    pollAllowsRevoting: false,
    pollShuffleOptions: false,
    pollAllowAddingOptions: false,
    pollHideResultsUntilCloses: false,
    pollMembersOnly: false,
    pollCountryCodes: '',
    diceEmoji: DICE_EMOJI_OPTIONS[0].value,
    inlineButtons: [],
    fromChatId: '',
    messageIds: '',
    removeCaption: false,
    inlineMessageId: '',
    editMediaType: 'photo',
    checklistJson: '{\n  "title": "Checklist",\n  "tasks": []\n}',
    suggestedPostSendDate: '',
    suggestedPostComment: '',
    actorChatId: '',
    // get
    userId: '',
    fileId: '',
    userPhotosOffset: '',
    userPhotosLimit: '',
    personalChatMessagesLimit: '10',
    // admin
    targetMessageId: '',
    untilDate: '',
    revokeMessages: false,
    onlyIfBanned: false,
    chatPermissions: { ...DEFAULT_CHAT_PERMISSIONS },
    isAccessRestricted: false,
    addedUserIds: '',
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
    inlineUseRichMessage: false,
    webAppQueryId: '',
    webAppResultTitle: '',
    webAppResultUrl: '',
    guestQueryId: '',
    chatJoinRequestQueryId: '',
    chatJoinRequestResult: 'approve',
    chatJoinRequestWebAppUrl: '',
    chatAdminReturnBots: false,
    editUseRichMessage: false,
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

  }

  if (config.category === 'forward' || config.category === 'copy') {
    if (!form.chatId.trim()) errors.push('Поле chat_id обязательно.');
    if (!form.fromChatId.trim()) errors.push('Поле from_chat_id обязательно.');
    if (config.id === 'forwardMessage' || config.id === 'copyMessage') {
      if (!form.targetMessageId.trim()) errors.push('Поле message_id обязательно.');
    } else if (!isNumberList(form.messageIds)) {
      errors.push('Поле message_ids должно содержать ID сообщений через запятую или пробел.');
    }

    if (form.messageThreadId.trim() && !/^-?\d+$/.test(form.messageThreadId.trim())) {
      errors.push('message_thread_id должен быть числом.');
    }

  }

  if (config.category === 'updating') {
    const canUseInlineTarget = [
      'editMessageText',
      'editMessageCaption',
      'editMessageMedia',
      'editMessageLiveLocation',
      'stopMessageLiveLocation',
      'editMessageReplyMarkup',
    ].includes(config.id);
    const hasInlineTarget = canUseInlineTarget && form.inlineMessageId.trim();

    if (!hasInlineTarget && config.id !== 'deleteMessages' && config.id !== 'deleteAllMessageReactions') {
      if (!form.chatId.trim()) errors.push('Поле chat_id обязательно.');
      if (!form.targetMessageId.trim()) errors.push('Поле message_id обязательно.');
    }

    if (config.id === 'deleteAllMessageReactions' && !form.chatId.trim()) {
      errors.push('Поле chat_id обязательно.');
    }

    if (config.id === 'deleteMessages' && !isNumberList(form.messageIds)) {
      errors.push('Поле message_ids должно содержать ID сообщений через запятую или пробел.');
    }
  }

  switch (config.category) {
    case 'rich':
      if (!form.chatId.trim()) {
        errors.push('Поле chat_id обязательно.');
      }
      if (form.messageThreadId.trim() && !/^-?\d+$/.test(form.messageThreadId.trim())) {
        errors.push('message_thread_id должен быть числом.');
      }
      if (form.directMessagesTopicId.trim() && !/^\d+$/.test(form.directMessagesTopicId.trim())) {
        errors.push('direct_messages_topic_id должен быть числом.');
      }
      if (!form.richMessageContent.trim()) {
        errors.push('Для rich_message нужен html или markdown.');
      }
      if (
        config.id === 'sendRichMessageDraft' &&
        (!/^\d+$/.test(form.richMessageDraftId.trim()) || Number(form.richMessageDraftId) === 0)
      ) {
        errors.push('draft_id должен быть ненулевым числом.');
      }
      break;
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
    case 'live_photo':
      if (!form.livePhotoValue.trim()) {
        errors.push('Заполните live_photo: file_id или attach://name.');
      } else if (/^https?:\/\//i.test(form.livePhotoValue.trim())) {
        errors.push('sendLivePhoto не поддерживает HTTP URL для live_photo.');
      }
      if (!form.livePhotoPhoto.trim()) {
        errors.push('Заполните photo: file_id или attach://name.');
      } else if (/^https?:\/\//i.test(form.livePhotoPhoto.trim())) {
        errors.push('sendLivePhoto не поддерживает HTTP URL для photo.');
      }
      if (formatMode && form.caption.trim()) {
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
      const correctOptionIndexes = getPollCorrectOptionIndexes(form);
      const normalizedExplanation = normalizeFormattedValue(
        form.pollExplanation,
        form.pollExplanationParseMode
      );
      const normalizedDescription = normalizeFormattedValue(
        form.pollDescription,
        form.pollDescriptionParseMode
      );
      const explanationMode = getFormatModeFromParseMode(form.pollExplanationParseMode);
      const descriptionMode = getFormatModeFromParseMode(form.pollDescriptionParseMode);
      const openPeriod = form.pollOpenPeriod.trim();
      const closeDate = form.pollCloseDate.trim();
      const explanationLineBreaks = (normalizedExplanation.match(/\n/g) || []).length;
      const countryCodes = parseStringList(form.pollCountryCodes);

      if (!form.pollQuestion.trim()) {
        errors.push('Для poll нужен вопрос.');
      }

      if (form.pollQuestion.trim().length > 300) {
        errors.push('Вопрос poll не должен превышать 300 символов.');
      }

      if (options.length < 1) {
        errors.push('Для poll нужен минимум 1 вариант ответа.');
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

        if (option.mediaJson.trim() && !isJsonObject(option.mediaJson)) {
          errors.push(`Вариант ${index + 1}: media должен быть валидным JSON-объектом.`);
        }
      });

      if (form.pollType === 'quiz' && correctOptionIndexes.length === 0) {
        errors.push('Для quiz нужно выбрать хотя бы один правильный ответ.');
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

      if (normalizedDescription.length > 300) {
        errors.push('description не должно превышать 300 символов.');
      }

      if (descriptionMode && normalizedDescription) {
        errors.push(
          ...validateFormattedText(normalizedDescription, descriptionMode, {
            validatePercentEncoding: false,
          }).map(error => `description: ${error}`)
        );
      }

      if (form.pollMediaJson.trim() && !isJsonObject(form.pollMediaJson)) {
        errors.push('media должен быть валидным JSON-объектом.');
      }

      if (form.pollExplanationMediaJson.trim() && !isJsonObject(form.pollExplanationMediaJson)) {
        errors.push('explanation_media должен быть валидным JSON-объектом.');
      }

      if (countryCodes.length > 12) {
        errors.push('country_codes принимает не больше 12 кодов.');
      }

      if (countryCodes.some(code => !/^[a-z]{2}$/i.test(code))) {
        errors.push('country_codes должны быть двухбуквенными ISO-кодами, например RU, US, FT.');
      }

      if (openPeriod && closeDate) {
        errors.push('В sendPoll нельзя одновременно задавать open_period и close_date.');
      }

      if (openPeriod && (!/^\d+$/.test(openPeriod) || Number(openPeriod) < 5 || Number(openPeriod) > 2628000)) {
        errors.push('open_period должен быть числом от 5 до 2628000 секунд.');
      }

      if (closeDate) {
        const now = Math.floor(Date.now() / 1000);
        const closeDateValue = Number(closeDate);

        if (!/^\d+$/.test(closeDate) || Number.isNaN(closeDateValue)) {
          errors.push('close_date должен быть Unix timestamp.');
        } else if (closeDateValue < now + 5 || closeDateValue > now + 2628000) {
          errors.push('close_date должен быть между +5 и +2628000 секунд от текущего времени.');
        }
      }
      break;
    }
    case 'forward':
      if ((config.id === 'forwardMessages') && parseNumberList(form.messageIds).length > 100) {
        errors.push('forwardMessages принимает не больше 100 message_ids.');
      }
      break;
    case 'copy':
      if (config.id === 'copyMessages' && parseNumberList(form.messageIds).length > 100) {
        errors.push('copyMessages принимает не больше 100 message_ids.');
      }
      if (config.id === 'copyMessage' && formatMode && form.caption.trim()) {
        errors.push(
          ...validateFormattedText(normalizedCaption, formatMode, { validatePercentEncoding: false })
            .map(error => `caption: ${error}`)
        );
      }
      break;
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
        case 'getUserPersonalChatMessages':
          if (!form.userId.trim()) errors.push('Поле user_id обязательно.');
          if (
            !/^\d+$/.test(form.personalChatMessagesLimit.trim()) ||
            Number(form.personalChatMessagesLimit) < 1 ||
            Number(form.personalChatMessagesLimit) > 20
          ) {
            errors.push('limit должен быть числом от 1 до 20.');
          }
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
        case 'getManagedBotAccessSettings':
          if (!form.userId.trim()) errors.push('Поле user_id обязательно.');
          break;
        case 'setManagedBotAccessSettings':
          if (!form.userId.trim()) errors.push('Поле user_id обязательно.');
          if (form.addedUserIds.trim() && !isNumberList(form.addedUserIds)) {
            errors.push('added_user_ids должен содержать ID пользователей через запятую или пробел.');
          }
          if (parseNumberList(form.addedUserIds).length > 10) {
            errors.push('added_user_ids принимает не больше 10 пользователей.');
          }
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
        if (!form.inlineUseRichMessage && !form.inlineResultText.trim()) errors.push('Поле message_text обязательно.');
      }
      if (config.id === 'answerWebAppQuery') {
        if (!form.webAppQueryId.trim()) errors.push('Поле web_app_query_id обязательно.');
      }
      if (form.inlineUseRichMessage && !form.richMessageContent.trim()) {
        errors.push('Для input_message_content.rich_message нужен html или markdown.');
      }
      break;
    case 'guest':
      if (!form.guestQueryId.trim()) errors.push('Поле guest_query_id обязательно.');
      if (!form.inlineUseRichMessage && !form.inlineResultText.trim()) errors.push('Поле message_text обязательно.');
      if (form.inlineUseRichMessage && !form.richMessageContent.trim()) {
        errors.push('Для input_message_content.rich_message нужен html или markdown.');
      }
      break;
    case 'join_request':
      if (!form.chatJoinRequestQueryId.trim()) {
        errors.push('Поле chat_join_request_query_id обязательно.');
      }
      if (config.id === 'sendChatJoinRequestWebApp') {
        if (!form.chatJoinRequestWebAppUrl.trim()) {
          errors.push('Поле web_app_url обязательно.');
        } else if (!isHttpUrl(form.chatJoinRequestWebAppUrl)) {
          errors.push('web_app_url должен начинаться с http:// или https://.');
        }
      }
      break;
    case 'updating':
      switch (config.id) {
        case 'editMessageText':
          if (form.editUseRichMessage) {
            if (!form.richMessageContent.trim()) errors.push('Поле rich_message обязательно.');
          } else if (!form.text.trim()) {
            errors.push('Поле text обязательно.');
          }
          if (!form.editUseRichMessage && formatMode) {
            errors.push(
              ...validateFormattedText(normalizedText, formatMode, { validatePercentEncoding: false })
                .map(error => `text: ${error}`)
            );
          }
          break;
        case 'editMessageCaption':
          if (formatMode && form.caption.trim()) {
            errors.push(
              ...validateFormattedText(normalizedCaption, formatMode, { validatePercentEncoding: false })
                .map(error => `caption: ${error}`)
            );
          }
          break;
        case 'editMessageMedia':
          if (!form.mediaValue.trim()) errors.push('Поле media обязательно.');
          if (formatMode && form.caption.trim()) {
            errors.push(
              ...validateFormattedText(normalizedCaption, formatMode, { validatePercentEncoding: false })
                .map(error => `caption: ${error}`)
            );
          }
          break;
        case 'editMessageLiveLocation':
          if (!form.locationLatitude.trim() || Number.isNaN(Number(form.locationLatitude))) {
            errors.push('Введите корректную latitude.');
          }
          if (!form.locationLongitude.trim() || Number.isNaN(Number(form.locationLongitude))) {
            errors.push('Введите корректную longitude.');
          }
          break;
        case 'editMessageChecklist':
          try {
            JSON.parse(form.checklistJson);
          } catch {
            errors.push('Поле checklist должно быть валидным JSON-объектом.');
          }
          break;
        case 'deleteMessages':
          if (parseNumberList(form.messageIds).length > 100) {
            errors.push('deleteMessages принимает не больше 100 message_ids.');
          }
          break;
        case 'deleteMessageReaction':
        case 'deleteAllMessageReactions':
          if (!form.userId.trim() && !form.actorChatId.trim()) {
            errors.push('Укажите user_id или actor_chat_id.');
          }
          if (form.userId.trim() && form.actorChatId.trim()) {
            errors.push('Нельзя одновременно указывать user_id и actor_chat_id.');
          }
          break;
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
