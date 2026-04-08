export type ButtonStyle = 'default' | 'primary' | 'success' | 'danger';

export type ActionType =
  | 'callback_data'
  | 'url'
  | 'web_app'
  | 'switch_inline_query'
  | 'switch_inline_query_current_chat'
  | 'login_url'
  | 'pay'
  | 'copy_text';

export interface ButtonConfig {
  id: string;
  text: string;
  style: ButtonStyle;
  actionType: ActionType;
  actionValue: string;
  row: number;
  col: number;
  iconCustomEmojiId: string;
}

export interface ButtonErrors {
  text?: string;
  actionValue?: string;
}

export interface MessageConfig {
  chatId: string;
  text: string;
  parseMode: 'HTML' | 'Markdown' | 'MarkdownV2';
}

export interface SendMessageBody {
  chat_id: string;
  text: string;
  parse_mode: string;
  reply_markup: InlineKeyboardMarkup;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export interface InlineKeyboardButton {
  text: string;
  style?: string;
  callback_data?: string;
  url?: string;
  web_app?: { url: string };
  switch_inline_query?: string;
  switch_inline_query_current_chat?: string;
  login_url?: { url: string };
  pay?: boolean;
  copy_text?: { text: string };
  icon_custom_emoji_id?: string;
}
