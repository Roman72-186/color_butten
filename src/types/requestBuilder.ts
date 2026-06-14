import type { ButtonConfig } from './index';

export type { ButtonConfig };

export type RequestMethodId =
  | 'sendMessage'
  | 'sendRichMessage'
  | 'sendRichMessageDraft'
  | 'sendPhoto'
  | 'sendVideo'
  | 'sendAnimation'
  | 'sendAudio'
  | 'sendDocument'
  | 'sendSticker'
  | 'sendVoice'
  | 'sendVideoNote'
  | 'sendLivePhoto'
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
  | 'getUserPersonalChatMessages'
  // admin
  | 'banChatMember'
  | 'unbanChatMember'
  | 'restrictChatMember'
  | 'pinChatMessage'
  | 'unpinChatMessage'
  | 'unpinAllChatMessages'
  | 'getManagedBotAccessSettings'
  | 'setManagedBotAccessSettings'
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
  | 'answerGuestQuery'
  | 'answerChatJoinRequestQuery'
  | 'sendChatJoinRequestWebApp'
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
  | 'deleteMessages'
  | 'deleteMessageReaction'
  | 'deleteAllMessageReactions';

export type RequestMethodCategory =
  | 'text'
  | 'rich'
  | 'media'
  | 'live_photo'
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
  | 'guest'
  | 'join_request'
  | 'updating';

export type RequestParseMode = '' | 'HTML' | 'Markdown' | 'MarkdownV2';

export type MediaSourceMode = 'file_id' | 'url';

export type MediaGroupItemType = 'photo' | 'video' | 'document' | 'audio';

export type PollType = 'regular' | 'quiz';

export type EditMediaType = 'photo' | 'video' | 'animation' | 'audio' | 'document';

export type RichMessageFormat = 'html' | 'markdown';

export type ChatJoinRequestQueryResult = 'approve' | 'decline' | 'queue';

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
  mediaJson: string;
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
  can_react_to_messages: boolean;
  can_edit_tag: boolean;
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
  directMessagesTopicId: string;
  disableNotification: boolean;
  protectContent: boolean;
  allowPaidBroadcast: boolean;
  messageEffectId: string;
  parseMode: RequestParseMode;
  text: string;
  richMessageFormat: RichMessageFormat;
  richMessageContent: string;
  richMessageIsRtl: boolean;
  richMessageSkipEntityDetection: boolean;
  richMessageDraftId: string;
  caption: string;
  mediaSource: MediaSourceMode;
  mediaValue: string;
  livePhotoValue: string;
  livePhotoPhoto: string;
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
  pollCorrectOptionIds: string[];
  pollExplanation: string;
  pollExplanationParseMode: RequestParseMode;
  pollDescription: string;
  pollDescriptionParseMode: RequestParseMode;
  pollMediaJson: string;
  pollExplanationMediaJson: string;
  pollOpenPeriod: string;
  pollCloseDate: string;
  pollIsClosed: boolean;
  pollAllowsRevoting: boolean;
  pollShuffleOptions: boolean;
  pollAllowAddingOptions: boolean;
  pollHideResultsUntilCloses: boolean;
  pollMembersOnly: boolean;
  pollCountryCodes: string;
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
  actorChatId: string;
  // get methods
  userId: string;
  fileId: string;
  userPhotosOffset: string;
  userPhotosLimit: string;
  personalChatMessagesLimit: string;
  // admin methods
  targetMessageId: string;
  untilDate: string;
  revokeMessages: boolean;
  onlyIfBanned: boolean;
  chatPermissions: ChatPermissions;
  isAccessRestricted: boolean;
  addedUserIds: string;
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
  inlineUseRichMessage: boolean;
  webAppQueryId: string;
  webAppResultTitle: string;
  webAppResultUrl: string;
  guestQueryId: string;
  chatJoinRequestQueryId: string;
  chatJoinRequestResult: ChatJoinRequestQueryResult;
  chatJoinRequestWebAppUrl: string;
  chatAdminReturnBots: boolean;
  editUseRichMessage: boolean;
}

export interface RequestPreview {
  endpoint: string;
  transportLabel: string;
  bodyPreview: string;
  warnings: string[];
}
