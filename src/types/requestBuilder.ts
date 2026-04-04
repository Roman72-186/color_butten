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
  | 'sendDice';

export type RequestMethodCategory =
  | 'text'
  | 'media'
  | 'album'
  | 'location'
  | 'venue'
  | 'contact'
  | 'poll'
  | 'dice';

export type RequestParseMode = '' | 'HTML' | 'Markdown' | 'MarkdownV2';

export type MediaSourceMode = 'file_id' | 'url';

export type MediaGroupItemType = 'photo' | 'video' | 'document' | 'audio';

export type PollType = 'regular' | 'quiz';

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
  note?: string;
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

export interface RequestFormState {
  method: RequestMethodId;
  chatId: string;
  businessConnectionId: string;
  messageThreadId: string;
  directMessagesTopicId: string;
  disableNotification: boolean;
  protectContent: boolean;
  allowPaidBroadcast: boolean;
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
}

export interface RequestPreview {
  endpoint: string;
  transportLabel: string;
  bodyPreview: string;
  warnings: string[];
}
