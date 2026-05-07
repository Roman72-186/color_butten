import type { ButtonConfig } from './index';

export type { ButtonConfig };

export type RequestMethodId =
  | 'sendMessage'
  | 'sendPhoto'
  | 'sendVideo'
  | 'sendAnimation'
  | 'sendAudio'
  | 'sendDocument'
  | 'sendSticker'
  | 'sendVoice'
  | 'sendVideoNote'
  | 'sendMediaGroup'
  | 'sendLocation'
  | 'sendVenue'
  | 'sendContact'
  | 'sendPoll'
  | 'sendDice'
  // forward / copy
  | 'forwardMessage'
  | 'forwardMessages'
  | 'copyMessage'
  | 'copyMessages'
  // get
  | 'getMe'
  | 'getChat'
  | 'getChatMember'
  | 'getChatAdministrators'
  | 'getChatMemberCount'
  | 'getFile'
  | 'getUserProfilePhotos'
  // admin
  | 'banChatMember'
  | 'unbanChatMember'
  | 'restrictChatMember'
  | 'pinChatMessage'
  | 'unpinChatMessage'
  | 'unpinAllChatMessages'
  | 'setMyCommands'
  | 'deleteMyCommands'
  // webhook / updates
  | 'setWebhook'
  | 'deleteWebhook'
  | 'getWebhookInfo'
  | 'getUpdates'
  // inline
  | 'answerInlineQuery'
  | 'answerWebAppQuery'
  // updating messages
  | 'editMessageText'
  | 'editMessageCaption'
  | 'editMessageMedia'
  | 'editMessageLiveLocation'
  | 'stopMessageLiveLocation'
  | 'editMessageChecklist'
  | 'editMessageReplyMarkup'
  | 'stopPoll'
  | 'approveSuggestedPost'
  | 'declineSuggestedPost'
  | 'deleteMessage'
  | 'deleteMessages';

export type RequestMethodCategory =
  | 'text'
  | 'media'
  | 'album'
  | 'location'
  | 'venue'
  | 'contact'
  | 'poll'
  | 'dice'
  | 'forward'
  | 'copy'
  | 'get'
  | 'admin'
  | 'webhook'
  | 'inline'
  | 'updating';

export type RequestParseMode = '' | 'HTML' | 'Markdown' | 'MarkdownV2';

export type MediaSourceMode = 'file_id' | 'url';

export type MediaGroupItemType = 'photo' | 'video' | 'document' | 'audio';

export type PollType = 'regular' | 'quiz';

export type EditMediaType = 'photo' | 'video' | 'animation' | 'audio' | 'document';

export interface RequestMethodConfig {
  id: RequestMethodId;
  title: string;
  description: string;
  category: RequestMethodCategory;
  mediaField?: string;
  supportsCaption?: boolean;
  supportsParseMode?: boolean;
  supportsSpoiler?: boolean;
  supportsShowCaptionAboveMedia?: boolean;
  supportsDirectMessagesTopic?: boolean;
  supportsInlineKeyboard?: boolean;
  note?: string;
  hint?: string;
}

export interface AlbumItem {
  id: string;
  type: MediaGroupItemType;
  sourceMode: MediaSourceMode;
  value: string;
}

export interface PollOptionItem {
  id: string;
  text: string;
}

export interface BotCommandItem {
  id: string;
  command: string;
  description: string;
}

export interface ChatPermissions {
  can_send_messages: boolean;
  can_send_audios: boolean;
  can_send_documents: boolean;
  can_send_photos: boolean;
  can_send_videos: boolean;
  can_send_video_notes: boolean;
  can_send_voice_notes: boolean;
  can_send_polls: boolean;
  can_send_other_messages: boolean;
  can_add_web_page_previews: boolean;
  can_change_info: boolean;
  can_invite_users: boolean;
  can_pin_messages: boolean;
  can_manage_topics: boolean;
}

export interface RequestFormState {
  method: RequestMethodId;
  // common send fields
  chatId: string;
  messageThreadId: string;
  disableNotification: boolean;
  protectContent: boolean;
  messageEffectId: string;
  parseMode: RequestParseMode;
  text: string;
  caption: string;
  mediaSource: MediaSourceMode;
  mediaValue: string;
  showCaptionAboveMedia: boolean;
  hasSpoiler: boolean;
  stickerEmoji: string;
  albumItems: AlbumItem[];
  locationLatitude: string;
  locationLongitude: string;
  venueTitle: string;
  venueAddress: string;
  contactPhoneNumber: string;
  contactFirstName: string;
  contactLastName: string;
  pollQuestion: string;
  pollOptions: PollOptionItem[];
  pollType: PollType;
  pollIsAnonymous: boolean;
  pollAllowsMultipleAnswers: boolean;
  pollCorrectOptionId: string;
  pollExplanation: string;
  pollExplanationParseMode: RequestParseMode;
  pollOpenPeriod: string;
  pollCloseDate: string;
  pollIsClosed: boolean;
  diceEmoji: string;
  inlineButtons: ButtonConfig[];
  // forward / copy
  fromChatId: string;
  messageIds: string;
  removeCaption: boolean;
  // updating messages
  inlineMessageId: string;
  editMediaType: EditMediaType;
  checklistJson: string;
  suggestedPostSendDate: string;
  suggestedPostComment: string;
  // get methods
  userId: string;
  fileId: string;
  userPhotosOffset: string;
  userPhotosLimit: string;
  // admin methods
  targetMessageId: string;
  untilDate: string;
  revokeMessages: boolean;
  onlyIfBanned: boolean;
  chatPermissions: ChatPermissions;
  botCommands: BotCommandItem[];
  botCommandScope: string;
  languageCode: string;
  // webhook
  webhookUrl: string;
  webhookMaxConnections: string;
  webhookAllowedUpdates: string;
  webhookSecretToken: string;
  dropPendingUpdates: boolean;
  updatesOffset: string;
  updatesLimit: string;
  updatesTimeout: string;
  // inline
  inlineQueryId: string;
  inlineResultId: string;
  inlineResultTitle: string;
  inlineResultText: string;
  webAppQueryId: string;
  webAppResultTitle: string;
  webAppResultUrl: string;
}

export interface RequestPreview {
  endpoint: string;
  transportLabel: string;
  bodyPreview: string;
  warnings: string[];
}
