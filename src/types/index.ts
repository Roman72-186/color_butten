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
}

export interface ButtonErrors {
  text?: string;
  actionValue?: string;
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
}
