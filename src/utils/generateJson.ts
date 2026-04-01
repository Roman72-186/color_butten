import type { ButtonConfig, InlineKeyboardButton, SendMessageBody } from '../types';
import { groupButtonsByRow } from './helpers';

function buttonToJson(button: ButtonConfig): InlineKeyboardButton {
  const result: InlineKeyboardButton = { text: button.text };

  if (button.style !== 'default') {
    result.style = button.style;
  }

  switch (button.actionType) {
    case 'callback_data':
      result.callback_data = button.actionValue;
      break;
    case 'url':
      result.url = button.actionValue;
      break;
    case 'web_app':
      result.web_app = { url: button.actionValue };
      break;
    case 'switch_inline_query_current_chat':
      result.switch_inline_query_current_chat = button.actionValue;
      break;
    case 'switch_inline_query':
      result.switch_inline_query = button.actionValue;
      break;
  }

  if (button.iconCustomEmojiId.trim()) {
    result.icon_custom_emoji_id = button.iconCustomEmojiId.trim();
  }

  return result;
}

export function generateJson(buttons: ButtonConfig[]): string {
  const rows = groupButtonsByRow(buttons);

  const body: SendMessageBody = {
    chat_id: '{{telegram_id}}',
    text: 'text',
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: rows.map(row => row.map(buttonToJson)),
    },
  };

  return JSON.stringify(body, null, 2);
}
